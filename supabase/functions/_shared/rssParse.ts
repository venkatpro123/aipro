// _shared/rssParse.ts
//
// Minimal RSS / Atom XML parser for Deno Edge Functions.
//
// The browser side (artifacts/humanproof/src/services/breakingNewsPoller.ts)
// uses rss2json.com because of CORS. Servers don't have that constraint and
// shouldn't depend on a third-party proxy — so this helper does the parse
// inline. Deliberately tiny: no XML DOM, no DTD validation, just regex over
// well-known RSS/Atom shapes that public feeds use.
//
// Output shape matches what rss2json returns so call sites between client
// and server can share downstream code paths.

export interface ParsedFeedItem {
  title: string;
  link: string;
  /** Plain-text excerpt — HTML tags are stripped. */
  description: string;
  /** ISO-8601 if parseable; original string otherwise. */
  pubDate: string;
}

const stripTags = (s: string): string =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const firstMatch = (haystack: string, re: RegExp): string => {
  const m = haystack.match(re);
  return m ? stripTags(m[1] ?? "") : "";
};

const toIsoOrOriginal = (raw: string): string => {
  if (!raw) return "";
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d.toISOString() : raw;
};

/**
 * Parse an RSS 2.0 or Atom 1.0 feed body. Returns up to `limit` items.
 * Resilient to: CDATA, mixed namespaces, missing fields, content:encoded.
 */
export function parseRssXml(xml: string, limit = 20): ParsedFeedItem[] {
  if (!xml || typeof xml !== "string") return [];

  // RSS <item> ... </item> blocks
  const itemRe = /<item[\s>][\s\S]*?<\/item>/gi;
  // Atom <entry> ... </entry> blocks
  const entryRe = /<entry[\s>][\s\S]*?<\/entry>/gi;

  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) && blocks.length < limit) blocks.push(m[0]);
  while ((m = entryRe.exec(xml)) && blocks.length < limit) blocks.push(m[0]);

  return blocks.slice(0, limit).map<ParsedFeedItem>((block) => {
    const title = firstMatch(block, /<title[^>]*>([\s\S]*?)<\/title>/i);
    // Atom uses <link href="..."/>; RSS uses <link>URL</link>
    const linkHref = block.match(/<link[^>]*\shref=["']([^"']+)["']/i);
    const linkText = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const link = (linkHref?.[1] ?? linkText?.[1] ?? "").trim();
    const description =
      firstMatch(block, /<description[^>]*>([\s\S]*?)<\/description>/i) ||
      firstMatch(block, /<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
      firstMatch(block, /<content[^>]*>([\s\S]*?)<\/content>/i) ||
      firstMatch(block, /<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
    const pubDate =
      firstMatch(block, /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
      firstMatch(block, /<published[^>]*>([\s\S]*?)<\/published>/i) ||
      firstMatch(block, /<updated[^>]*>([\s\S]*?)<\/updated>/i) ||
      firstMatch(block, /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);

    return {
      title,
      link,
      description,
      pubDate: toIsoOrOriginal(pubDate),
    };
  });
}
