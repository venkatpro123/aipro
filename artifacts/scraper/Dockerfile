# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build for the Real-Time Intelligence Scraper.
#
# Stage 1 (builder)  — installs Node deps and compiles TypeScript.
# Stage 2 (runtime)  — combines Node 20 + Python 3.11 + Chromium + Crawl4AI.
#                       This is the image Fly.io actually runs.
#
# Image size target: <2 GB (Playwright's Chromium is ~300 MB by itself).
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: TypeScript build ───────────────────────────────────────────────
FROM node:26-bookworm-slim AS builder

WORKDIR /app

# Copy only what we need for npm install (better layer cache)
COPY package.json tsconfig.json ./
# Use npm here (not pnpm) because the scraper is a leaf module that does NOT
# need access to the monorepo's pnpm workspace catalog. Installing standalone
# keeps the Docker image self-contained and reproducible.
RUN npm install --omit=dev=false --no-audit --no-fund

COPY src ./src
RUN npm run build

# Re-install with only production deps for the final image
RUN npm prune --omit=dev


# ── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM node:26-bookworm-slim AS runtime

# Playwright + Python + Chromium prereqs (minimal X libs)
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    ca-certificates curl tini \
    # Chromium runtime deps for Playwright
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
    libasound2 libatspi2.0-0 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Node deps from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Python deps for Crawl4AI subprocess
COPY python ./python
RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/venv/bin/pip install --no-cache-dir -r python/requirements.txt
ENV PATH="/opt/venv/bin:${PATH}"

# Install only the Chromium browser binary (no firefox/webkit) to keep image small
RUN npx --yes playwright@1.48.2 install chromium --with-deps \
  && npx --yes playwright@1.48.2 install-deps chromium \
  # Strip unused locales to shave ~80 MB
  && find /root/.cache/ms-playwright/chromium-*/chrome-linux/locales -mindepth 1 \
        -not -name 'en-*' -delete 2>/dev/null || true

# Non-root user (Playwright is happy here; Chromium runs unprivileged)
RUN useradd --uid 1001 --user-group --create-home --shell /bin/sh scraper \
  && mkdir -p /home/scraper/.cache \
  && cp -r /root/.cache/ms-playwright /home/scraper/.cache/ \
  && chown -R scraper:scraper /home/scraper /app
USER scraper

EXPOSE 8080

ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/home/scraper/.cache/ms-playwright \
    PYTHONUNBUFFERED=1

# tini reaps zombie chromium processes when scrapes crash
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/server.js"]
