#!/usr/bin/env python3
"""
crawl4ai_extract.py — stdin/stdout subprocess that performs one Crawl4AI
extraction and exits.

Protocol:
    stdin (JSON):
        {
          "url":   "https://...",
          "mode":  "article" | "html_diff" | "company_page",
          "schema": { ... optional JSON schema ... }
        }

    stdout (JSON):
        {
          "ok":      true|false,
          "fields":  { ... extracted fields when mode produces structured data ... },
          "rawText": "...",   # full text content (truncated to 50k chars)
          "error":   "...",   # only when ok == false
        }

Exit code is always 0 — Node parses `ok` from JSON. This avoids the spawned
process being treated as a crash by BullMQ.
"""

from __future__ import annotations
import asyncio
import json
import sys
import traceback
from typing import Any


async def run_extraction(req: dict[str, Any]) -> dict[str, Any]:
    """Perform a single extraction. Imports are inside the function so the
    process starts fast for the (small) percentage of cases where we never
    actually load Crawl4AI's heavy deps (e.g. malformed input)."""

    url = req.get("url")
    mode = req.get("mode", "article")
    schema = req.get("schema")

    if not url:
        return {"ok": False, "error": "url required"}

    try:
        from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
        from crawl4ai.extraction_strategy import JsonCssExtractionStrategy
    except ImportError as e:
        return {"ok": False, "error": f"crawl4ai import failed: {e}"}

    browser_cfg = BrowserConfig(
        headless=True,
        viewport_width=1280,
        viewport_height=720,
        verbose=False,
        # Single-process Chromium — we run inside a 2 GB Fly.io machine.
        extra_args=["--single-process", "--no-zygote"],
    )

    run_cfg = CrawlerRunConfig(
        wait_until="domcontentloaded",
        page_timeout=20_000,
        # Don't pull stylesheets / fonts — they're useless to us and bloat memory.
        exclude_external_images=True,
        # Cache rules: never re-crawl the same URL within 5 minutes.
        # cache_mode=CacheMode.ENABLED,
    )

    # Attach a structured extraction strategy when a schema is provided.
    if schema and isinstance(schema, dict):
        try:
            run_cfg.extraction_strategy = JsonCssExtractionStrategy(schema=schema)
        except Exception as e:
            # Non-fatal — fall back to plain text scrape.
            print(f"[crawl4ai] schema attach failed: {e}", file=sys.stderr)

    try:
        async with AsyncWebCrawler(config=browser_cfg) as crawler:
            result = await crawler.arun(url=url, config=run_cfg)
    except Exception as e:
        return {"ok": False, "error": f"crawl failed: {e}"}

    if not getattr(result, "success", False):
        return {
            "ok": False,
            "error": getattr(result, "error_message", "crawl returned !success"),
        }

    out: dict[str, Any] = {
        "ok": True,
        "rawText": (result.cleaned_html or result.markdown or "")[:50_000],
    }

    extracted = getattr(result, "extracted_content", None)
    if extracted:
        try:
            out["fields"] = json.loads(extracted) if isinstance(extracted, str) else extracted
        except Exception:
            out["fields"] = {"_raw": str(extracted)[:5_000]}

    return out


def main() -> None:
    try:
        payload = sys.stdin.read()
        if not payload.strip():
            json.dump({"ok": False, "error": "empty stdin"}, sys.stdout)
            return
        req = json.loads(payload)
    except Exception as e:
        json.dump({"ok": False, "error": f"stdin parse error: {e}"}, sys.stdout)
        return

    try:
        result = asyncio.run(run_extraction(req))
    except Exception as e:
        result = {
            "ok": False,
            "error": f"runtime exception: {e}\n{traceback.format_exc()[:2_000]}",
        }

    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
