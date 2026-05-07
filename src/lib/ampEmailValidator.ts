// Lightweight AMP for Email rule checker.
// Implements the section 8.1 rule subset locally — no network dependency.
// Used by upload-time validation and (later) generation-time validation.

export interface AmpValidationError {
  rule: string;
  line: number;
  column: number;
  message: string;
}

export interface AmpValidationResult {
  valid: boolean;
  errors: AmpValidationError[];
}

interface RuleHit {
  rule: string;
  message: string;
  // 0-based index into the source string
  index: number;
}

function indexToLineCol(src: string, index: number): { line: number; column: number } {
  let line = 1;
  let lastNl = -1;
  for (let i = 0; i < index && i < src.length; i++) {
    if (src.charCodeAt(i) === 10) {
      line++;
      lastNl = i;
    }
  }
  return { line, column: index - lastNl };
}

function collectAll(src: string, regex: RegExp, rule: string, message: string): RuleHit[] {
  const hits: RuleHit[] = [];
  let m: RegExpExecArray | null;
  // ensure global flag
  const re = regex.global ? regex : new RegExp(regex.source, regex.flags + "g");
  while ((m = re.exec(src)) !== null) {
    hits.push({ rule, message, index: m.index });
    if (m.index === re.lastIndex) re.lastIndex++; // avoid zero-length loop
  }
  return hits;
}

export function validateAmpEmail(html: string): AmpValidationResult {
  const hits: RuleHit[] = [];

  // 1. Required doctype/⚡4email
  const htmlTagMatch = html.match(/<html\b[^>]*>/i);
  if (!htmlTagMatch) {
    hits.push({ rule: "required-html-tag", message: "Missing <html> tag", index: 0 });
  } else {
    const tag = htmlTagMatch[0];
    if (!/⚡4email|amp4email/i.test(tag)) {
      hits.push({
        rule: "required-amp4email-attr",
        message: 'The <html> tag must include the "⚡4email" or "amp4email" attribute',
        index: htmlTagMatch.index ?? 0,
      });
    }
  }

  // 2. Required boilerplate
  if (!/amp4email-boilerplate/i.test(html)) {
    hits.push({
      rule: "required-boilerplate",
      message: "Missing the amp4email-boilerplate <style> block in <head>",
      index: 0,
    });
  }

  // 3. No <script> except AMP runtime imports
  collectAll(html, /<script\b([^>]*)>/gi, "no-script", "Custom <script> tags are not allowed").forEach((h) => {
    const attrs = (h as any).match?.[1] ?? "";
    // The actual AMP runtime tags use async + custom-element / src=cdn.ampproject.org. We treat any script
    // without a cdn.ampproject.org src as banned.
    const slice = html.slice(h.index, h.index + 400);
    if (!/cdn\.ampproject\.org/i.test(slice)) {
      hits.push(h);
    }
  });

  // 4. No raw <img> — must use <amp-img>
  collectAll(html, /<img\b/gi, "no-raw-img", "Use <amp-img> with explicit width and height instead of <img>").forEach(
    (h) => hits.push(h),
  );

  // 5. No inline style attributes
  collectAll(html, /\sstyle\s*=\s*"[^"]*"/gi, "no-inline-style", "Inline style attributes are not allowed").forEach(
    (h) => hits.push(h),
  );
  collectAll(html, /\sstyle\s*=\s*'[^']*'/gi, "no-inline-style", "Inline style attributes are not allowed").forEach(
    (h) => hits.push(h),
  );

  // 6. No !important in CSS
  collectAll(html, /!important/gi, "no-important", "!important is not allowed in AMP for Email CSS").forEach((h) =>
    hits.push(h),
  );

  // 7. No relative URLs in href / src (allow #, mailto:, tel:, https:, http:, data:, cid:)
  const urlRe = /\s(href|src)\s*=\s*"([^"]*)"/gi;
  let um: RegExpExecArray | null;
  while ((um = urlRe.exec(html)) !== null) {
    const value = um[2].trim();
    if (!value) continue;
    if (/^(https?:|mailto:|tel:|data:|cid:|#|\{\{)/i.test(value)) continue;
    hits.push({
      rule: "no-relative-url",
      message: `Relative URL "${value}" is not allowed; use an absolute URL`,
      index: um.index,
    });
  }

  // 8. <form> without action-xhr
  collectAll(html, /<form\b[^>]*>/gi, "amp-form-required", "<form> tags must include action-xhr attribute").forEach(
    (h) => {
      const slice = html.slice(h.index, h.index + 500);
      const tag = slice.match(/<form\b[^>]*>/i)?.[0] ?? "";
      if (!/action-xhr\s*=/i.test(tag)) hits.push(h);
    },
  );

  // 9. CSS size limit (75 KB)
  const styleBlocks: string[] = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? [];
  const totalCssBytes = styleBlocks.reduce<number>((acc, b) => acc + new TextEncoder().encode(b).length, 0);
  if (totalCssBytes > 75 * 1024) {
    hits.push({
      rule: "css-size-limit",
      message: `Custom CSS is ${(totalCssBytes / 1024).toFixed(1)} KB; AMP for Email limit is 75 KB`,
      index: 0,
    });
  }

  // Map hits → errors with line/col
  const errors: AmpValidationError[] = hits.map((h) => {
    const { line, column } = indexToLineCol(html, h.index);
    return { rule: h.rule, message: h.message, line, column };
  });

  // De-dupe identical (rule + line) entries
  const seen = new Set<string>();
  const deduped = errors.filter((e) => {
    const k = `${e.rule}@${e.line}:${e.column}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return { valid: deduped.length === 0, errors: deduped };
}
