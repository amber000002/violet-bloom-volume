// Generates a "mockup" version of an email template by masking brand-identifying
// content: customer name, logo/image sources, links, emails, phone numbers, and
// obvious social handles. The layout, copy structure, and AMP interactivity are
// preserved so the mockup renders identically minus the branding.
//
// Improvements:
//  - Brand tokens are harvested from customer name AND from every domain
//    referenced in href/src/email attributes, so brand words that appear in
//    body copy (e.g. "Shop on Carousell", "The Carousell Team") are also
//    replaced — not just exact matches of the customer name.
//  - Images are replaced with contextually relevant photos from LoremFlickr
//    using keywords derived from the image's alt text, the template's use
//    case category, or the industry, instead of a plain "Image" placeholder.

const PLACEHOLDER_BRAND = "Acme Brand";
const PLACEHOLDER_DOMAIN = "acmebrand.example";
const PLACEHOLDER_EMAIL = "hello@acmebrand.example";
const PLACEHOLDER_PHONE = "+1 (555) 000-0000";

export interface MockupOptions {
  brandName?: string;
  useCase?: string | null;
  industry?: string | null;
}

// Words that appear in domains but aren't brand identifiers
const DOMAIN_STOPWORDS = new Set([
  "www", "mail", "email", "click", "track", "links", "cdn", "img", "images",
  "assets", "static", "media", "app", "web", "shop", "store", "go", "get",
  "my", "the", "com", "net", "org", "co", "io", "app", "email", "mailer",
  "sendgrid", "mailgun", "hubspot", "salesforce", "marketo", "iterable",
  "braze", "customer", "clevertap", "moengage", "mailchimp", "campaign",
  "amazonaws", "cloudfront", "googleusercontent", "gstatic", "google",
  "facebook", "twitter", "instagram", "youtube", "linkedin", "tiktok",
  "unsubscribe", "preferences", "list", "manage", "notification",
  // Infra/CDN — never treat as brand
  "ampproject", "amp", "gmail", "outlook", "yahoo", "apple", "microsoft",
  "cloudflare", "akamai", "fastly", "jsdelivr", "unpkg", "bootstrapcdn",
  "placehold", "loremflickr", "unsplash", "gravatar",
]);

const KEYWORD_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "with",
  "your", "our", "you", "we", "is", "are", "at", "by", "from", "this",
  "that", "it", "logo", "image", "img", "photo", "picture", "banner",
  "header", "footer", "icon", "background", "bg", "hero",
]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractHost(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function harvestBrandTokens(html: string, brandName?: string): string[] {
  const tokens = new Set<string>();

  const add = (raw: string) => {
    const t = raw.trim();
    if (t.length >= 3) tokens.add(t.toLowerCase());
  };

  if (brandName) {
    const cleaned = brandName.trim();
    if (cleaned) add(cleaned);
    const first = cleaned.split(/[\s.,-]+/)[0];
    if (first) add(first);
  }

  // Domains referenced in href/src
  const urlRe = /(?:href|src|background)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(html)) !== null) {
    const host = extractHost(m[1]);
    if (!host) continue;
    const labels = host.split(".");
    for (const label of labels) {
      if (label.length >= 4 && !DOMAIN_STOPWORDS.has(label) && !/^\d+$/.test(label)) {
        add(label);
      }
    }
  }

  // Email domains
  const emailRe = /[A-Z0-9._%+-]+@([A-Z0-9.-]+)\.[A-Z]{2,}/gi;
  while ((m = emailRe.exec(html)) !== null) {
    const host = m[1].toLowerCase();
    for (const label of host.split(".")) {
      if (label.length >= 4 && !DOMAIN_STOPWORDS.has(label)) add(label);
    }
  }

  // Longest first so "carousell" is replaced before "carou"
  return Array.from(tokens).sort((a, b) => b.length - a.length);
}

function maskBrandTokens(html: string, tokens: string[]): string {
  let out = html;
  for (const t of tokens) {
    // Case-insensitive, not requiring word boundary (catches "Carousell.com",
    // "TeamCarousell", etc.). Only skip when embedded in a URL scheme.
    const re = new RegExp(escapeRegExp(t), "gi");
    out = out.replace(re, PLACEHOLDER_BRAND);
  }
  return out;
}

function pickKeywords(alt: string, opts: MockupOptions): string {
  const source = (alt || "").toLowerCase();
  const words = source
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !KEYWORD_STOPWORDS.has(w));
  if (words.length) return words.slice(0, 3).join(",");
  const fallback: string[] = [];
  if (opts.useCase) fallback.push(opts.useCase.toLowerCase().replace(/[^a-z0-9]+/g, ""));
  if (opts.industry) fallback.push(opts.industry.toLowerCase().replace(/[^a-z0-9]+/g, ""));
  if (fallback.length) return fallback.filter(Boolean).slice(0, 2).join(",");
  return "lifestyle,abstract";
}

function relevantImageUrl(w: number, h: number, keywords: string): string {
  const safe = encodeURIComponent(keywords || "lifestyle");
  // LoremFlickr returns a real photo matching the keywords. Use a stable
  // lock so the same alt text yields the same image between renders.
  const lock = Math.abs(hashCode(keywords)) % 1000;
  return `https://loremflickr.com/${w}/${h}/${safe}?lock=${lock}`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

function maskImages(html: string, opts: MockupOptions): string {
  return html.replace(
    /<(img|amp-img)\b([^>]*)>/gi,
    (_full, tag, attrs) => {
      const wMatch = attrs.match(/\swidth\s*=\s*"?(\d+)"?/i);
      const hMatch = attrs.match(/\sheight\s*=\s*"?(\d+)"?/i);
      const w = wMatch ? parseInt(wMatch[1], 10) : 600;
      const h = hMatch ? parseInt(hMatch[1], 10) : Math.round(w * 0.66);
      const altMatch = attrs.match(/\salt\s*=\s*("([^"]*)"|'([^']*)')/i);
      const alt = (altMatch?.[2] ?? altMatch?.[3] ?? "").trim();
      const srcMatch = attrs.match(/\ssrc\s*=\s*("([^"]*)"|'([^']*)')/i);
      const oldSrc = srcMatch?.[2] ?? srcMatch?.[3] ?? "";
      const looksLikeLogo = /logo/i.test(oldSrc) || /logo/i.test(alt) || /logo/i.test(attrs);
      const keywords = looksLikeLogo ? "logo,abstract" : pickKeywords(alt, opts);
      const newSrc = looksLikeLogo
        ? `https://placehold.co/${Math.min(w, 240)}x${Math.min(h, 80)}/EEE/999?text=LOGO`
        : relevantImageUrl(w, h, keywords);
      let newAttrs = attrs;
      if (srcMatch) {
        newAttrs = newAttrs.replace(/\ssrc\s*=\s*("[^"]*"|'[^']*')/i, ` src="${newSrc}"`);
      } else {
        newAttrs = ` src="${newSrc}"` + newAttrs;
      }
      // Also strip srcset which would override src
      newAttrs = newAttrs.replace(/\ssrcset\s*=\s*("[^"]*"|'[^']*')/gi, "");
      return `<${tag}${newAttrs}>`;
    },
  );
}

function maskBackgroundImages(html: string, opts: MockupOptions): string {
  const bgKw = pickKeywords("", opts);
  return html
    .replace(
      /background(-image)?\s*=\s*("([^"]*)"|'([^']*)')/gi,
      () => `background="${relevantImageUrl(600, 300, bgKw)}"`,
    )
    .replace(
      /url\(\s*(['"]?)(https?:[^)'"]+)\1\s*\)/gi,
      () => `url('${relevantImageUrl(600, 300, bgKw)}')`,
    );
}

function maskLinks(html: string): string {
  return html.replace(
    /\shref\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (_full, _q, dq, sq) => {
      const url = (dq ?? sq ?? "").trim();
      if (/^(mailto:|tel:|#|\{\{)/i.test(url)) return ` href="#"`;
      if (!url) return ` href="#"`;
      return ` href="https://${PLACEHOLDER_DOMAIN}/"`;
    },
  );
}

function maskEmailsAndPhones(html: string): string {
  return html
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, PLACEHOLDER_EMAIL)
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, PLACEHOLDER_PHONE);
}

function maskTitleAndPreheader(html: string): string {
  return html.replace(
    /<title\b[^>]*>[\s\S]*?<\/title>/i,
    `<title>${PLACEHOLDER_BRAND} — Sample Template</title>`,
  );
}

export function generateEmailMockup(
  html: string,
  brandNameOrOpts?: string | MockupOptions,
  legacyOpts?: MockupOptions,
): string {
  const opts: MockupOptions =
    typeof brandNameOrOpts === "string"
      ? { brandName: brandNameOrOpts, ...(legacyOpts ?? {}) }
      : (brandNameOrOpts ?? {});

  let out = html;
  // Harvest tokens BEFORE we rewrite links/images so we still see the
  // original domains that hint at the brand.
  const tokens = harvestBrandTokens(out, opts.brandName);
  out = maskImages(out, opts);
  out = maskBackgroundImages(out, opts);
  out = maskLinks(out);
  out = maskEmailsAndPhones(out);

  // Stash <script> and <style> blocks so brand-token masking cannot corrupt
  // the AMP boilerplate (e.g. cdn.ampproject.org). Without this, mangling
  // the AMP runtime URL leaves body{visibility:hidden} in place forever and
  // the downloaded file renders blank.
  const stash: string[] = [];
  out = out.replace(
    /<(script|style)\b[\s\S]*?<\/\1>/gi,
    (m) => {
      const i = stash.push(m) - 1;
      return `__MOCKUP_STASH_${i}__`;
    },
  );
  out = maskBrandTokens(out, tokens);
  out = out.replace(/__MOCKUP_STASH_(\d+)__/g, (_m, i) => stash[Number(i)] ?? "");

  out = maskTitleAndPreheader(out);
  return out;
}
