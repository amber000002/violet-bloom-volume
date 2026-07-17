// Generates a "mockup" version of an email template by masking brand-identifying
// content: customer name, logo/image sources, links, emails, phone numbers, and
// obvious social handles. The layout, copy structure, and AMP interactivity are
// preserved so the mockup renders identically minus the branding.

const PLACEHOLDER_BRAND = "Acme Brand";
const PLACEHOLDER_DOMAIN = "acmebrand.example";
const PLACEHOLDER_EMAIL = "hello@acmebrand.example";
const PLACEHOLDER_PHONE = "+1 (555) 000-0000";
const PLACEHOLDER_LOGO = "https://placehold.co/240x80/EEE/999?text=LOGO";
const PLACEHOLDER_IMG = (w = 600, h = 400) =>
  `https://placehold.co/${w}x${h}/EEE/AAA?text=Image`;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function maskImages(html: string): string {
  // Replace src attributes on <img> and <amp-img>
  return html.replace(
    /<(img|amp-img)\b([^>]*?)\ssrc\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (_full, tag, attrs, _q, dq, sq) => {
      const url = dq ?? sq ?? "";
      const wMatch = attrs.match(/\swidth\s*=\s*"?(\d+)"?/i);
      const hMatch = attrs.match(/\sheight\s*=\s*"?(\d+)"?/i);
      const w = wMatch ? parseInt(wMatch[1], 10) : 600;
      const h = hMatch ? parseInt(hMatch[1], 10) : Math.round(w * 0.66);
      const looksLikeLogo = /logo/i.test(url) || /logo/i.test(attrs);
      const replacement = looksLikeLogo ? PLACEHOLDER_LOGO : PLACEHOLDER_IMG(w, h);
      return `<${tag}${attrs} src="${replacement}"`;
    },
  );
}

function maskBackgroundImages(html: string): string {
  return html.replace(
    /background(-image)?\s*=\s*("([^"]*)"|'([^']*)')/gi,
    () => `background="${PLACEHOLDER_IMG(600, 300)}"`,
  ).replace(
    /url\(\s*(['"]?)(https?:[^)'"]+)\1\s*\)/gi,
    () => `url('${PLACEHOLDER_IMG(600, 300)}')`,
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

function maskBrandName(html: string, brand?: string): string {
  if (!brand) return html;
  const tokens = new Set<string>();
  const cleaned = brand.trim();
  if (cleaned) tokens.add(cleaned);
  // Also mask common suffix-stripped variants (e.g. "Carousell Pte Ltd" -> "Carousell")
  const first = cleaned.split(/[\s.,-]+/)[0];
  if (first && first.length >= 3) tokens.add(first);
  let out = html;
  for (const t of tokens) {
    const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, "gi");
    out = out.replace(re, PLACEHOLDER_BRAND);
  }
  return out;
}

function maskTitleAndPreheader(html: string): string {
  return html.replace(
    /<title\b[^>]*>[\s\S]*?<\/title>/i,
    `<title>${PLACEHOLDER_BRAND} — Sample Template</title>`,
  );
}

export function generateEmailMockup(html: string, brandName?: string): string {
  let out = html;
  out = maskBrandName(out, brandName);
  out = maskImages(out);
  out = maskBackgroundImages(out);
  out = maskLinks(out);
  out = maskEmailsAndPhones(out);
  out = maskTitleAndPreheader(out);
  return out;
}
