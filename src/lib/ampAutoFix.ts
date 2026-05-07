// Auto-fix layer for AMP for Email HTML.
// Applies safe transforms required by section 8.1 of the PRD before validation:
// - Removes inline style="..." attributes
// - Strips !important from all CSS
// - Rewrites relative URLs in href/src to absolute (when a base URL is provided)
// - Replaces raw <img> with <amp-img> when width/height are inferable from attributes
//
// The fixer is intentionally conservative: anything it can't safely transform is
// left intact so the validator can flag it.

export interface AmpAutoFixResult {
  html: string;
  fixesApplied: string[];
}

function ensureAbsoluteUrl(url: string, baseUrl?: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  // Already valid scheme / anchor / template token — leave alone
  if (/^(https?:|mailto:|tel:|data:|cid:|#|\{\{)/i.test(trimmed)) return null;
  if (!baseUrl) return null;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

export function autoFixAmpHtml(input: string, opts: { baseUrl?: string } = {}): AmpAutoFixResult {
  let html = input;
  const fixes: string[] = [];

  // 1. Strip inline style attributes (both quote styles)
  const styleAttrRe = /\s(?:style)\s*=\s*("[^"]*"|'[^']*')/gi;
  if (styleAttrRe.test(html)) {
    const before = html;
    html = html.replace(styleAttrRe, "");
    if (before !== html) fixes.push("Removed inline style attributes");
  }

  // 2. Strip !important from <style> blocks (and stray occurrences)
  if (/!important/i.test(html)) {
    html = html.replace(/\s*!important/gi, "");
    fixes.push("Stripped !important declarations");
  }

  // 3. Rewrite relative URLs in href / src to absolute (when baseUrl provided)
  if (opts.baseUrl) {
    const urlAttrRe = /\s(href|src)\s*=\s*"([^"]*)"/gi;
    let rewriteCount = 0;
    html = html.replace(urlAttrRe, (full, attr, value) => {
      const abs = ensureAbsoluteUrl(value, opts.baseUrl);
      if (abs && abs !== value) {
        rewriteCount++;
        return ` ${attr}="${abs}"`;
      }
      return full;
    });
    if (rewriteCount > 0) {
      fixes.push(`Rewrote ${rewriteCount} relative URL${rewriteCount === 1 ? "" : "s"} to absolute`);
    }
  }

  // 4. Convert <img> → <amp-img> when explicit width/height present
  const imgRe = /<img\b([^>]*)>/gi;
  let imgConverted = 0;
  html = html.replace(imgRe, (full, attrs: string) => {
    const widthMatch = attrs.match(/\swidth\s*=\s*"?(\d+)"?/i);
    const heightMatch = attrs.match(/\sheight\s*=\s*"?(\d+)"?/i);
    if (!widthMatch || !heightMatch) return full;
    imgConverted++;
    const cleaned = attrs
      .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, "")
      .trim();
    return `<amp-img ${cleaned} layout="responsive"></amp-img>`;
  });
  if (imgConverted > 0) {
    fixes.push(`Converted ${imgConverted} <img> tag${imgConverted === 1 ? "" : "s"} to <amp-img>`);
  }

  return { html, fixesApplied: fixes };
}
