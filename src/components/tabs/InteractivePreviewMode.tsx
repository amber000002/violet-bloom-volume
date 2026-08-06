import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, FileCode, Download, Save, MousePointerClick, Type, Link as LinkIcon, Palette, X, RotateCcw, Image as ImageIcon, Undo2, Redo2, FolderDown, RefreshCw, Trash2, Copy, Plus } from "lucide-react";
import { listUseCaseTemplates, UseCaseTemplate } from "@/lib/useCaseTemplateService";
import { saveAmpDraft } from "@/lib/ampDraftService";
import { logHtmlDownload } from "@/lib/htmlDownloadsService";
import { DownloadsMode } from "./DownloadsMode";

// ---------- Editor bridge (runs inside the iframe) ----------
const EDITOR_ATTR = "data-edit-id";
const EDITOR_STYLE_ID = "__lovable_editor_style__";
const EDITOR_SCRIPT_ID = "__lovable_editor_script__";

const EDITOR_CSS = `
  [${EDITOR_ATTR}]{outline:1px dashed transparent;outline-offset:2px;cursor:pointer;transition:outline-color .15s;}
  [${EDITOR_ATTR}]:hover{outline-color:#a855f7 !important;}
  [${EDITOR_ATTR}].__lovable_selected__{outline:2px solid #a855f7 !important;}
  a[${EDITOR_ATTR}]::after{content:" \\1F517";font-size:10px;opacity:.5;}
  body.__lovable_move_mode__ [${EDITOR_ATTR}]{cursor:crosshair;outline-color:rgba(16,185,129,.35) !important;}
  body.__lovable_move_mode__ [${EDITOR_ATTR}]:hover{outline:2px dashed #10b981 !important;}
  .__lovable_drop_before__{box-shadow:0 -3px 0 0 #10b981 !important;}
  .__lovable_drop_after__{box-shadow:0 3px 0 0 #10b981 !important;}
`;

// Injected inside iframe: tag elements, capture clicks, apply patches
const EDITOR_SCRIPT = `(() => {
  const ATTR = "${EDITOR_ATTR}";
  let counter = 0;
  const isTextish = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName;
    if (["SCRIPT","STYLE","META","LINK","HEAD","HTML","BODY"].includes(tag)) return false;
    // Must have direct text child of some length
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim().length > 0) return true;
    }
    return false;
  };
  const walk = (root) => {
    const all = root.querySelectorAll("*");
    all.forEach((el) => {
      const tag = el.tagName;
      if (["SCRIPT","STYLE","META","LINK","HEAD","TITLE"].includes(tag)) return;
      if (tag === "I-AMPHTML-SIZER") return;
      if ((tag === "IMG" || tag === "I-AMPHTML-IMG") && el.closest("amp-img,amp-anim")) return;
      if (el.className && String(el.className).includes("i-amphtml-")) return;
      // Tag text-carrying elements, anchors, images, and elements with inline color/bg
      const st = el.getAttribute("style") || "";
      const isLink = tag === "A";
      const isImg = tag === "IMG" || tag === "AMP-IMG" || tag === "AMP-ANIM";
      const hasColor = /(background|color)\\s*:/i.test(st);
      const hasBgImg = /background(-image)?\\s*:[^;]*url\\(/i.test(st);
      if (isTextish(el) || isLink || isImg || hasColor || hasBgImg) {
        if (!el.getAttribute(ATTR)) el.setAttribute(ATTR, "e" + (counter++));
      }
    });
  };
  walk(document);

  // ---- block position helpers (index-path based so the export can replay them) ----
  let moveMode = false;
  let lastHover = null;
  const clearHover = () => {
    if (lastHover) {
      lastHover.classList.remove("__lovable_drop_before__", "__lovable_drop_after__");
      lastHover = null;
    }
  };
  function pathOf(node){
    const p = [];
    let n = node;
    while (n && n !== document.body) {
      const par = n.parentElement;
      if (!par) break;
      p.unshift(Array.prototype.indexOf.call(par.children, n));
      n = par;
    }
    return p;
  }
  function resolvePath(p){
    let n = document.body;
    for (let i = 0; i < p.length; i++) { n = n && n.children[p[i]]; }
    return n;
  }
  function moveElTo(el, loc){
    const par = resolvePath(loc.path);
    if (!par || !el.parentElement) return;
    const same = par === el.parentElement;
    const old = Array.prototype.indexOf.call(el.parentElement.children, el);
    el.remove();
    let idx = loc.index;
    if (same && old < idx) idx--;
    const ref = par.children[idx] || null;
    par.insertBefore(el, ref);
  }
  function locOf(el){
    const par = el.parentElement;
    return { path: pathOf(par), index: Array.prototype.indexOf.call(par.children, el) };
  }
  function moveElStep(el, step){
    const par = el.parentElement;
    if (!par) return false;
    const idx = Array.prototype.indexOf.call(par.children, el);
    const t = idx + step;
    if (t < 0 || t >= par.children.length) return false;
    moveElTo(el, { path: pathOf(par), index: step > 0 ? t + 1 : t });
    return true;
  }

  document.addEventListener("mousemove", (e) => {
    if (!moveMode) return;
    let el = e.target;
    while (el && el.nodeType === 1 && !el.getAttribute(ATTR)) el = el.parentElement;
    clearHover();
    if (!el || !el.getAttribute || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    el.classList.add(e.clientY < r.top + r.height / 2 ? "__lovable_drop_before__" : "__lovable_drop_after__");
    lastHover = el;
  }, true);

  document.addEventListener("click", (e) => {
    let el = e.target;
    if (el && el.nodeType === 1 && ["IMG","I-AMPHTML-IMG","I-AMPHTML-SIZER"].includes(el.tagName || "")) {
      const ampImage = el.closest && el.closest("amp-img,amp-anim");
      if (ampImage && ampImage.getAttribute(ATTR)) el = ampImage;
    }
    while (el && el.nodeType === 1 && !el.getAttribute(ATTR)) el = el.parentElement;
    if (!el || !el.getAttribute) return;
    if (moveMode) {
      e.preventDefault();
      e.stopPropagation();
      const r = el.getBoundingClientRect();
      const after = e.clientY >= r.top + r.height / 2;
      const par = el.parentElement;
      if (!par) return;
      const idx = Array.prototype.indexOf.call(par.children, el);
      clearHover();
      window.parent.postMessage({
        type: "lovable-move-drop",
        loc: { path: pathOf(par), index: after ? idx + 1 : idx },
      }, "*");
      return;
    }
    // Alt/Option-click bypasses the editor and lets the link navigate — used to
    // verify click-through URLs on wrapped images actually work inside the iframe.
    if (e.altKey) {
      let a = el;
      while (a && a.tagName !== "A" && a.tagName !== "BODY") a = a.parentElement;
      if (a && a.tagName === "A" && a.getAttribute("href")) {
        try { window.open(a.getAttribute("href"), "_blank", "noopener"); } catch (_) {}
        e.preventDefault();
        e.stopPropagation();
        parent.postMessage({ type: "lovable-link-test", href: a.getAttribute("href") }, "*");
        return;
      }
    }
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll(".__lovable_selected__").forEach(n => n.classList.remove("__lovable_selected__"));
    el.classList.add("__lovable_selected__");
    const id = el.getAttribute(ATTR);
    const cs = getComputedStyle(el);
    const tagName = el.tagName;
    const isImg = tagName === "IMG" || tagName === "AMP-IMG" || tagName === "AMP-ANIM";
    const inlineStyle = el.getAttribute("style") || "";
    const bgMatch = inlineStyle.match(/background(?:-image)?\\s*:[^;]*url\\((['"]?)([^'")]+)\\1\\)/i);
    // If image is wrapped in an anchor, expose that link
    let imageHref = "";
    if (isImg) {
      let p = el.parentElement;
      while (p && p.tagName !== "A" && p.tagName !== "BODY") p = p.parentElement;
      if (p && p.tagName === "A") imageHref = p.getAttribute("href") || "";
    }
    const payload = {
      type: "lovable-select",
      id,
      tag: tagName.toLowerCase(),
      text: (() => {
        // Get concatenated direct-child text
        let s = "";
        for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue;
        return s;
      })(),
      innerText: el.innerText || "",
      href: el.getAttribute("href") || "",
      color: rgbToHex(cs.color),
      backgroundColor: rgbToHex(cs.backgroundColor),
      isImage: isImg,
      src: isImg ? (el.getAttribute("src") || "") : "",
      alt: isImg ? (el.getAttribute("alt") || "") : "",
      bgImage: bgMatch ? bgMatch[2] : "",
      imageHref,
    };
    parent.postMessage(payload, "*");
  }, true);

  function rgbToHex(rgb){
    if(!rgb) return "";
    const m = rgb.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
    if(!m) return "";
    const to = (n) => ("0" + parseInt(n,10).toString(16)).slice(-2);
    return "#" + to(m[1]) + to(m[2]) + to(m[3]);
  }

  function tagSubtree(root, baseId) {
    root.setAttribute(ATTR, baseId);
    let i = 0;
    root.querySelectorAll("*").forEach((n) => { n.setAttribute(ATTR, baseId + "-" + (i++)); });
  }

  window.addEventListener("message", (ev) => {
    const d = ev.data;
    if (d && d.type === "lovable-move-mode") {
      moveMode = !!d.active;
      clearHover();
      document.body.classList.toggle("__lovable_move_mode__", moveMode);
      return;
    }
    if (!d || d.type !== "lovable-patch") return;
    const el = document.querySelector('[' + ATTR + '="' + d.id + '"]');
    if (!el) return;
    if (typeof d.moveStep === "number" && d.moveStep) {
      const prev = locOf(el);
      if (moveElStep(el, d.moveStep)) {
        window.parent.postMessage({ type: "lovable-moved", id: d.id, prevLoc: prev }, "*");
      }
      return;
    }
    if (d.moveTo && d.moveTo.path) {
      const prev = locOf(el);
      moveElTo(el, d.moveTo);
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      window.parent.postMessage({ type: "lovable-moved", id: d.id, prevLoc: prev }, "*");
      return;
    }
    if (d.remove === true) {
      // If wrapped in an anchor with no other meaningful children, remove the anchor too
      let p = el.parentElement;
      el.remove();
      if (p && p.tagName === "A" && !p.textContent.trim() && p.children.length === 0) {
        p.remove();
      }
      parent.postMessage({ type: "lovable-removed", id: d.id }, "*");
      return;
    }
    if (d.duplicate === true && d.newId) {
      const clone = el.cloneNode(true);
      clone.classList && clone.classList.remove("__lovable_selected__");
      tagSubtree(clone, d.newId);
      el.parentNode && el.parentNode.insertBefore(clone, el.nextSibling);
      return;
    }
    if (typeof d.insertHtml === "string" && d.insertHtml && d.newId) {
      const holder = document.createElement("div");
      holder.innerHTML = d.insertHtml;
      const node = holder.firstElementChild;
      if (node) {
        tagSubtree(node, d.newId);
        if (d.insertPosition === "before") el.parentNode && el.parentNode.insertBefore(node, el);
        else el.parentNode && el.parentNode.insertBefore(node, el.nextSibling);
      }
      return;
    }
    if (typeof d.text === "string") {
      // Replace only direct text child(ren); if none, set textContent
      let replaced = false;
      for (const n of Array.from(el.childNodes)) {
        if (n.nodeType === 3) { if (!replaced) { n.nodeValue = d.text; replaced = true; } else { n.remove(); } }
      }
      if (!replaced) el.textContent = d.text;
    }
    if (typeof d.href === "string" && el.tagName === "A") el.setAttribute("href", d.href);
    if (typeof d.color === "string") el.style.color = d.color;
    if (typeof d.backgroundColor === "string") el.style.backgroundColor = d.backgroundColor;
    if (typeof d.src === "string") {
      const tn = el.tagName;
      if (tn === "IMG" || tn === "AMP-IMG" || tn === "AMP-ANIM") {
        if (d.src) el.setAttribute("src", d.src);
        else el.removeAttribute("src");
        // amp-img sometimes renders via an inner <img>; sync it
        const inner = el.querySelector && el.querySelector("img");
        if (inner) {
          if (d.src) inner.setAttribute("src", d.src);
          else inner.removeAttribute("src");
        }
      }
    }
    if (typeof d.alt === "string") {
      const tn = el.tagName;
      if (tn === "IMG" || tn === "AMP-IMG" || tn === "AMP-ANIM") el.setAttribute("alt", d.alt);
    }
    if (typeof d.bgImage === "string") {
      const cur = el.getAttribute("style") || "";
      const cleaned = cur.replace(/background(-image)?\\s*:[^;]*;?/gi, "").trim();
      const next = d.bgImage
        ? (cleaned ? cleaned + ";" : "") + "background-image:url('" + d.bgImage + "');background-size:cover;background-position:center;"
        : cleaned;
      el.setAttribute("style", next);
    }
    if (typeof d.imageHref === "string") {
      const tn = el.tagName;
      if (tn === "IMG" || tn === "AMP-IMG" || tn === "AMP-ANIM") {
        // Find existing wrapping anchor
        let p = el.parentElement;
        while (p && p.tagName !== "A" && p.tagName !== "BODY") p = p.parentElement;
        if (d.imageHref) {
          if (p && p.tagName === "A") {
            p.setAttribute("href", d.imageHref);
          } else {
            const a = document.createElement("a");
            a.setAttribute("href", d.imageHref);
            a.setAttribute("target", "_blank");
            el.parentElement && el.parentElement.insertBefore(a, el);
            a.appendChild(el);
          }
        } else if (p && p.tagName === "A") {
          // Unwrap
          const parent = p.parentElement;
          if (parent) { while (p.firstChild) parent.insertBefore(p.firstChild, p); parent.removeChild(p); }
        }
      }
    }
  });

  parent.postMessage({ type: "lovable-ready" }, "*");
})();`;

function injectEditor(html: string): string {
  const styleTag = `<style id="${EDITOR_STYLE_ID}">${EDITOR_CSS}</style>`;
  const scriptTag = `<script id="${EDITOR_SCRIPT_ID}">${EDITOR_SCRIPT}</script>`;
  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${styleTag}</head>`);
  } else {
    html = styleTag + html;
  }
  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `${scriptTag}</body>`);
  } else {
    html = html + scriptTag;
  }
  return html;
}

function stripEditor(html: string): string {
  return html
    .replace(new RegExp(`<style id="${EDITOR_STYLE_ID}"[^>]*>[\\s\\S]*?</style>`, "i"), "")
    .replace(new RegExp(`<script id="${EDITOR_SCRIPT_ID}"[^>]*>[\\s\\S]*?</script>`, "i"), "")
    .replace(new RegExp(`\\s${EDITOR_ATTR}="[^"]*"`, "g"), "")
    .replace(/\s*class="__lovable_selected__"/g, "")
    .replace(/(\sclass="[^"]*)\s?__lovable_selected__\s?([^"]*")/g, "$1$2");
}

function tagEditableElements(doc: Document): void {
  let counter = 0;
  const isTextish = (el: Element) => {
    const tag = el.tagName;
    if (["SCRIPT", "STYLE", "META", "LINK", "HEAD", "HTML", "BODY"].includes(tag)) return false;
    return Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.nodeValue || "").trim().length > 0);
  };

  doc.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName;
    if (["SCRIPT", "STYLE", "META", "LINK", "HEAD", "TITLE"].includes(tag)) return;
    if (tag === "I-AMPHTML-SIZER") return;
    if ((tag === "IMG" || tag === "I-AMPHTML-IMG") && el.closest("amp-img,amp-anim")) return;
    if ((el.getAttribute("class") || "").includes("i-amphtml-")) return;

    const st = el.getAttribute("style") || "";
    const isLink = tag === "A";
    const isImg = tag === "IMG" || tag === "AMP-IMG" || tag === "AMP-ANIM";
    const hasColor = /(background|color)\s*:/i.test(st);
    const hasBgImg = /background(-image)?\s*:[^;]*url\(/i.test(st);
    if (isTextish(el) || isLink || isImg || hasColor || hasBgImg) {
      if (!el.getAttribute(EDITOR_ATTR)) el.setAttribute(EDITOR_ATTR, `e${counter++}`);
    }
  });
}

interface BlockLoc {
  path: number[];
  index: number;
}

type HtmlEditPatch = Partial<Selected> & {
  remove?: boolean;
  duplicate?: boolean;
  insertHtml?: string;
  insertPosition?: "before" | "after";
  newId?: string;
  /** Move the block one slot up (-1) or down (+1) among its siblings. */
  moveStep?: number;
  /** Move the block to an arbitrary position: parent index-path + child index. */
  moveTo?: BlockLoc;
};

function resolvePathDom(doc: Document, path: number[]): Element | null {
  let n: Element | null = doc.body;
  for (const i of path) n = (n?.children[i] as Element | undefined) ?? null;
  return n;
}

function moveElToDom(doc: Document, el: Element, loc: BlockLoc): void {
  const par = resolvePathDom(doc, loc.path);
  if (!par || !el.parentElement) return;
  const same = par === el.parentElement;
  const old = Array.prototype.indexOf.call(el.parentElement.children, el);
  el.remove();
  let idx = loc.index;
  if (same && old < idx) idx--;
  par.insertBefore(el, par.children[idx] || null);
}

function pathOfDom(doc: Document, node: Element): number[] {
  const p: number[] = [];
  let n: Element | null = node;
  while (n && n !== doc.body) {
    const par: Element | null = n.parentElement;
    if (!par) break;
    p.unshift(Array.prototype.indexOf.call(par.children, n));
    n = par;
  }
  return p;
}

function moveElStepDom(doc: Document, el: Element, step: number): void {
  const par = el.parentElement;
  if (!par) return;
  const idx = Array.prototype.indexOf.call(par.children, el);
  const t = idx + step;
  if (t < 0 || t >= par.children.length) return;
  moveElToDom(doc, el, { path: pathOfDom(doc, par), index: step > 0 ? t + 1 : t });
}

function tagSubtreeDom(root: Element, baseId: string): void {
  root.setAttribute(EDITOR_ATTR, baseId);
  let i = 0;
  root.querySelectorAll("*").forEach((n) => n.setAttribute(EDITOR_ATTR, `${baseId}-${i++}`));
}

function cleanupEmptyAnchorAfterRemoval(el: Element): void {
  const parent = el.parentElement;
  el.remove();
  if (parent && parent.tagName === "A" && !parent.textContent?.trim() && parent.children.length === 0) {
    parent.remove();
  }
}

function applyHtmlEditPatch(doc: Document, id: string, patch: HtmlEditPatch): void {
  let el = doc.querySelector(`[${EDITOR_ATTR}="${CSS.escape(id)}"]`) as HTMLElement | null;

  // Older sessions could have selected AMP's generated inner <img> instead of the
  // canonical <amp-img>. If that id is not present in the clean source document,
  // fall back to the image src so removals still apply to the real source element.
  if (!el && patch.remove && patch.src) {
    el = (Array.from(doc.querySelectorAll("amp-img, amp-anim, img")) as HTMLElement[]).find(
      (candidate) => candidate.getAttribute("src") === patch.src
    ) || null;
  }

  if (!el) return;

  if (typeof patch.moveStep === "number" && patch.moveStep) {
    moveElStepDom(doc, el, patch.moveStep);
    return;
  }

  if (patch.moveTo && patch.moveTo.path) {
    moveElToDom(doc, el, patch.moveTo);
    return;
  }

  if (patch.remove === true) {
    cleanupEmptyAnchorAfterRemoval(el);
    return;
  }

  if (patch.duplicate === true && patch.newId) {
    const clone = el.cloneNode(true) as Element;
    clone.classList?.remove("__lovable_selected__");
    tagSubtreeDom(clone, patch.newId);
    el.parentNode?.insertBefore(clone, el.nextSibling);
    return;
  }

  if (patch.insertHtml && patch.newId) {
    const holder = doc.createElement("div");
    holder.innerHTML = patch.insertHtml;
    const node = holder.firstElementChild;
    if (node) {
      tagSubtreeDom(node, patch.newId);
      if (patch.insertPosition === "before") el.parentNode?.insertBefore(node, el);
      else el.parentNode?.insertBefore(node, el.nextSibling);
    }
    return;
  }


  if (typeof patch.text === "string") {
    let replaced = false;
    Array.from(el.childNodes).forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        if (!replaced) {
          n.nodeValue = patch.text || "";
          replaced = true;
        } else {
          n.remove();
        }
      }
    });
    if (!replaced) el.textContent = patch.text;
  }

  if (typeof patch.href === "string" && el.tagName === "A") el.setAttribute("href", patch.href);
  if (typeof patch.color === "string") el.style.color = patch.color;
  if (typeof patch.backgroundColor === "string") el.style.backgroundColor = patch.backgroundColor;

  if (typeof patch.src === "string" && ["IMG", "AMP-IMG", "AMP-ANIM"].includes(el.tagName)) {
    if (patch.src) el.setAttribute("src", patch.src);
    else el.removeAttribute("src");
  }

  if (typeof patch.alt === "string" && ["IMG", "AMP-IMG", "AMP-ANIM"].includes(el.tagName)) {
    el.setAttribute("alt", patch.alt);
  }

  if (typeof patch.bgImage === "string") {
    const cur = el.getAttribute("style") || "";
    const cleaned = cur.replace(/background(-image)?\s*:[^;]*;?/gi, "").trim();
    const next = patch.bgImage
      ? `${cleaned ? `${cleaned};` : ""}background-image:url('${patch.bgImage}');background-size:cover;background-position:center;`
      : cleaned;
    if (next) el.setAttribute("style", next);
    else el.removeAttribute("style");
  }

  if (typeof patch.imageHref === "string" && ["IMG", "AMP-IMG", "AMP-ANIM"].includes(el.tagName)) {
    let parent = el.parentElement;
    while (parent && parent.tagName !== "A" && parent.tagName !== "BODY") parent = parent.parentElement;
    if (patch.imageHref) {
      if (parent && parent.tagName === "A") {
        parent.setAttribute("href", patch.imageHref);
      } else if (el.parentElement) {
        const anchor = doc.createElement("a");
        anchor.setAttribute("href", patch.imageHref);
        anchor.setAttribute("target", "_blank");
        el.parentElement.insertBefore(anchor, el);
        anchor.appendChild(el);
      }
    } else if (parent && parent.tagName === "A" && parent.parentElement) {
      while (parent.firstChild) parent.parentElement.insertBefore(parent.firstChild, parent);
      parent.remove();
    }
  }
}

// Remove AMP runtime state that gets baked into the DOM after the user interacts
// with the preview (amp-selector `selected` attrs, `i-amphtml-*` classes, runtime
// <img> children AMP injects into amp-img, etc.). Without this, whatever option
// the user tapped while tweaking becomes locked in the downloaded HTML.
function sanitizeAmpRuntimeState(doc: Document): void {
  // amp-selector: strip runtime selection state from selector, options, and
  // descendants. AMP can place state on nested nodes depending on runtime/version.
  doc.querySelectorAll("amp-selector").forEach((sel) => {
    sel.removeAttribute("selected");
    sel.removeAttribute("aria-selected");
    sel.removeAttribute("aria-checked");
    sel.classList.remove("amp-selected");
    sel.querySelectorAll("*").forEach((opt) => {
      opt.removeAttribute("selected");
      opt.removeAttribute("aria-selected");
      opt.removeAttribute("aria-checked");
      opt.removeAttribute("aria-disabled");
      opt.removeAttribute("tabindex");
      opt.classList.remove("amp-selected");
      if (opt.classList.length === 0) opt.removeAttribute("class");
    });
    sel.removeAttribute("role");
    sel.removeAttribute("aria-multiselectable");
  });

  // amp-form runtime state classes
  doc.querySelectorAll("form").forEach((f) => {
    ["submitting", "submit-success", "submit-error", "verify-error", "valid", "invalid", "user-valid", "user-invalid"].forEach((c) => {
      f.classList.remove(`amp-form-${c}`);
    });
    if (f.classList.length === 0) f.removeAttribute("class");
  });

  // amp-img / amp-anim: strip runtime-injected children (<img>, <i-amphtml-sizer>)
  doc.querySelectorAll("amp-img, amp-anim").forEach((el) => {
    Array.from(el.children).forEach((child) => {
      const tag = child.tagName.toLowerCase();
      if (tag === "i-amphtml-sizer") child.remove();
      else if (tag === "img" && (child.className || "").toString().includes("i-amphtml-")) child.remove();
    });
  });

  // Global: strip i-amphtml-* classes/attrs and common runtime toggle classes
  const RUNTIME_CLASS_RE = /^(i-amphtml-|amp-notbuilt$|amp-hidden$|amp-active$|amp-selected$)/;
  doc.querySelectorAll("*").forEach((el) => {
    if (el.classList && el.classList.length) {
      const toRemove: string[] = [];
      el.classList.forEach((c) => {
        if (RUNTIME_CLASS_RE.test(c)) toRemove.push(c);
      });
      toRemove.forEach((c) => el.classList.remove(c));
      if (el.classList.length === 0) el.removeAttribute("class");
    }
    for (const a of Array.from(el.attributes)) {
      if (a.name.startsWith("i-amphtml-")) el.removeAttribute(a.name);
    }
  });

  // Runtime-injected style tags
  doc.querySelectorAll("style[amp-runtime], style[amp-extension]").forEach((n) => n.remove());

  // html element runtime attrs
  ["amp-version", "transformed"].forEach((a) => doc.documentElement.removeAttribute(a));
}

// ---------- Component ----------
interface Selected {
  id: string;
  tag: string;
  text: string;
  innerText: string;
  href: string;
  color: string;
  backgroundColor: string;
  isImage?: boolean;
  src?: string;
  alt?: string;
  bgImage?: string;
  imageHref?: string;
}

type PatchKeys = keyof Omit<Selected, "id" | "tag" | "innerText" | "isImage">;
interface HistoryEntry {
  id: string;
  prev: Partial<Selected> | HtmlEditPatch;
  next: HtmlEditPatch;
  /** Target element for the undo patch (structural ops undo a different node). */
  undoId?: string;
}

export const InteractivePreviewMode: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [sourceHtml, setSourceHtml] = useState<string>("");
  const [srcDoc, setSrcDoc] = useState<string>("");
  const [templates, setTemplates] = useState<UseCaseTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selected, setSelected] = useState<Selected | null>(null);
  const [draftName, setDraftName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
  const [editPatches, setEditPatches] = useState<Array<{ id: string; patch: HtmlEditPatch }>>([]);
  const [showDownloads, setShowDownloads] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await listUseCaseTemplates();
        setTemplates(data);
      } catch (e: any) {
        // silent
      }
    })();
  }, []);

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const d = ev.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "lovable-select") setSelected(d as Selected);
      if (d.type === "lovable-removed") setSelected(null);
      if (d.type === "lovable-link-test" && d.href) {
        toast.success(`Opened link → ${String(d.href).slice(0, 60)}`);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const loadHtml = (html: string) => {
    setSourceHtml(html);
    setSrcDoc(injectEditor(html));
    setSelected(null);
    setUndoStack([]);
    setRedoStack([]);
    setEditPatches([]);
  };

  const handleRefresh = () => {
    // Reload the iframe with the current edited HTML so interactive AMP state
    // (forms, quizzes, carousels) resets and the user can tap another answer.
    const html = currentHtml();
    if (!html) return;
    setSourceHtml(html);
    setEditPatches([]);
    setUndoStack([]);
    setRedoStack([]);
    setSrcDoc(injectEditor(html));
    setSelected(null);
    toast.success("Preview refreshed");
  };

  const handlePickTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      loadHtml(t.htmlContent);
      if (!draftName) setDraftName(`${t.label} — tweaked`);
    }
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    const txt = await file.text();
    loadHtml(txt);
    if (!draftName) setDraftName(file.name.replace(/\.html?$/i, "") + " — tweaked");
  };

  const postPatch = useCallback((id: string, patch: HtmlEditPatch) => {
    iframeRef.current?.contentWindow?.postMessage({ type: "lovable-patch", id, ...patch }, "*");
  }, []);

  const sendPatch = (patch: HtmlEditPatch, options: { record?: boolean } = { record: true }) => {
    if (!selected || !iframeRef.current?.contentWindow) return;
    // Build prev state snapshot for keys we're changing
    const prev: Partial<Selected> = {};
    (Object.keys(patch) as (keyof Selected)[]).forEach((k) => {
      // @ts-expect-error index
      prev[k] = (selected as any)[k] ?? "";
    });
    postPatch(selected.id, patch);
    setSelected({ ...selected, ...patch } as Selected);
    if (options.record !== false) {
      setUndoStack((s) => [...s, { id: selected.id, prev, next: patch }]);
      setRedoStack([]);
      setEditPatches((s) => [...s, { id: selected.id, patch }]);
    }
  };

  // Structural block ops (duplicate / insert). They target a newly created node
  // for undo, so they bypass sendPatch's field-diff bookkeeping.
  const sendStructural = (patch: HtmlEditPatch) => {
    if (!selected || !iframeRef.current?.contentWindow) return;
    postPatch(selected.id, patch);
    setUndoStack((s) => [
      ...s,
      { id: selected.id, prev: { remove: true }, next: patch, undoId: patch.newId },
    ]);
    setRedoStack([]);
    setEditPatches((s) => [...s, { id: selected.id, patch }]);
  };

  const makeBlockHtml = (kind: "image" | "text" | "cta"): string => {
    const useAmp = /<amp-img\b/i.test(sourceHtml) || /amp4email/i.test(sourceHtml);
    if (kind === "image") {
      const img = useAmp
        ? `<amp-img src="https://placehold.co/600x300/png" width="600" height="300" layout="responsive" alt="New image"></amp-img>`
        : `<img src="https://placehold.co/600x300/png" alt="New image" style="max-width:100%;height:auto;display:block;margin:0 auto;" />`;
      return `<div style="padding:16px;text-align:center;">${img}</div>`;
    }
    if (kind === "cta") {
      return `<div style="padding:16px;text-align:center;"><a href="https://example.com" style="display:inline-block;padding:12px 28px;background-color:#7c3aed;color:#ffffff;border-radius:6px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;">Shop now</a></div>`;
    }
    return `<div style="padding:16px;text-align:center;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#333333;">Add your copy here.</div>`;
  };

  const handleDuplicateBlock = () => {
    if (!selected) return;
    sendStructural({ duplicate: true, newId: `dup-${Date.now().toString(36)}` });
    toast.success("Block duplicated below");
  };

  const handleInsertBlock = (kind: "image" | "text" | "cta", position: "before" | "after") => {
    if (!selected) return;
    sendStructural({
      insertHtml: makeBlockHtml(kind),
      insertPosition: position,
      newId: `new-${Date.now().toString(36)}`,
    });
    toast.success(`${kind === "cta" ? "Button" : kind === "image" ? "Image" : "Text"} block added`);
  };

  const handleRemoveBlock = () => {
    if (!selected) return;
    setEditPatches((s) => [...s, { id: selected.id, patch: { remove: true } }]);
    postPatch(selected.id, { remove: true });
    setSelected(null);
    toast.success("Block removed");
  };

  const handleUndo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const entry = stack[stack.length - 1];
      postPatch(entry.undoId ?? entry.id, entry.prev as HtmlEditPatch);
      setRedoStack((r) => [...r, entry]);
      setEditPatches((patches) => patches.slice(0, -1));
      setSelected((sel) => (sel && sel.id === entry.id ? ({ ...sel, ...entry.prev } as Selected) : sel));
      return stack.slice(0, -1);
    });
  }, [postPatch]);


  const handleRedo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const entry = stack[stack.length - 1];
      postPatch(entry.id, entry.next);
      setUndoStack((u) => [...u, entry]);
      setEditPatches((patches) => [...patches, { id: entry.id, patch: entry.next }]);
      setSelected((sel) => (sel && sel.id === entry.id ? ({ ...sel, ...entry.next } as Selected) : sel));
      return stack.slice(0, -1);
    });
  }, [postPatch]);

  // Keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z (or Ctrl+Y)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (target && target.isContentEditable)) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo, handleRedo]);

  const currentHtml = (): string => {
    const source = sourceHtml || iframeRef.current?.contentDocument?.documentElement?.outerHTML || "";
    if (!source) return "";
    const cloneDoc = new DOMParser().parseFromString(source, "text/html");
    tagEditableElements(cloneDoc);
    editPatches.forEach(({ id, patch }) => applyHtmlEditPatch(cloneDoc, id, patch));
    sanitizeAmpRuntimeState(cloneDoc);
    const raw = "<!doctype html>\n" + cloneDoc.documentElement.outerHTML;
    return stripEditor(raw);
  };

  // Parse the sanitized HTML and confirm no amp-selector interaction state
  // (selected / aria-selected / amp-selected / i-amphtml-*) survived. Returns
  // a list of human-readable artifacts if any are found.
  const verifyNoAmpArtifacts = (html: string): string[] => {
    const issues: string[] = [];
    try {
      const parsed = new DOMParser().parseFromString(html, "text/html");
      parsed.querySelectorAll("amp-selector, amp-selector *").forEach((opt) => {
        if (opt.hasAttribute("selected")) issues.push(`amp-selector option has selected="${opt.getAttribute("selected") ?? ""}"`);
        if (opt.hasAttribute("aria-selected")) issues.push(`amp-selector option has aria-selected`);
        if (opt.hasAttribute("aria-checked")) issues.push(`amp-selector option has aria-checked`);
        if (opt.classList.contains("amp-selected")) issues.push(`amp-selector option has .amp-selected class`);
      });
      parsed.querySelectorAll("*").forEach((el) => {
        el.classList.forEach((c) => {
          if (c.startsWith("i-amphtml-")) issues.push(`stray class .${c} on <${el.tagName.toLowerCase()}>`);
        });
        for (const a of Array.from(el.attributes)) {
          if (a.name.startsWith("i-amphtml-")) issues.push(`stray attr ${a.name} on <${el.tagName.toLowerCase()}>`);
        }
      });
    } catch {
      /* ignore parse errors */
    }
    // Dedup + cap for readability
    return Array.from(new Set(issues)).slice(0, 5);
  };

  const handleDownload = () => {
    const html = currentHtml();
    const artifacts = verifyNoAmpArtifacts(html);
    if (artifacts.length > 0) {
      // eslint-disable-next-line no-console
      console.warn("[InteractivePreview] AMP artifacts detected in export:", artifacts);
      toast.error(`Download blocked — ${artifacts.length} AMP interaction artifact(s) remained: ${artifacts[0]}. Try Refresh, then download again.`);
      return;
    }
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileName = (draftName || "edited-template") + ".html";
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    const t = templates.find((x) => x.id === selectedTemplateId) || null;
    logHtmlDownload({
      fileName,
      source: "interactive-preview",
      content: html,
      templateId: t?.id ?? null,
      templateLabel: t?.label ?? draftName,
      customerName: t?.customerName ?? null,
      industry: t?.industry ?? null,
      useCaseCategory: t?.useCaseCategory ?? null,
      variant: `Edited · ${undoStack.length} change${undoStack.length === 1 ? "" : "s"}`,
    });
    toast.success("Downloaded — verified no lingering amp-selector state");
  };

  const handleSaveDraft = async () => {
    if (!draftName.trim()) {
      toast.error("Give this draft a name first.");
      return;
    }
    if (!sourceHtml) {
      toast.error("Load a template first.");
      return;
    }
    setSaving(true);
    try {
      const html = currentHtml();
      const t = templates.find((x) => x.id === selectedTemplateId) || null;
      await saveAmpDraft({
        name: draftName.trim(),
        htmlContent: html,
        templateId: t?.id ?? null,
        templateLabel: t?.label ?? null,
        brandName: t?.customerName ?? null,
        ampValid: true,
      });
      toast.success("Draft saved");
    } catch (e: any) {
      toast.error(`Save failed: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (sourceHtml) {
      setSrcDoc(injectEditor(sourceHtml));
      setSelected(null);
      setUndoStack([]);
      setRedoStack([]);
      setEditPatches([]);
    }
  };

  const hasTemplate = !!srcDoc;

  return (
    <div className="space-y-4">
      {/* Source controls */}
      <div className="magic-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MousePointerClick className="w-4 h-4 text-primary" />
          Interactive Preview — click any element to tweak text, links or colors
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Load from Email Repository</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handlePickTemplate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
            >
              <option value="">Select a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.customerName ? `${t.customerName} — ` : ""}{t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Or upload .html</label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm cursor-pointer hover:bg-muted">
              <Upload className="w-4 h-4" />
              <span className="truncate">Choose file…</span>
              <input
                type="file"
                accept=".html,text/html"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Draft name</label>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="My tweaked template"
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={handleSaveDraft}
            disabled={!hasTemplate || saving}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-magic text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save as draft"}
          </button>
          <button
            onClick={handleDownload}
            disabled={!hasTemplate}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm hover:bg-muted disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Download .html
          </button>
          <button
            onClick={handleUndo}
            disabled={!hasTemplate || undoStack.length === 0}
            title="Undo (Ctrl/Cmd+Z)"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm hover:bg-muted disabled:opacity-50"
          >
            <Undo2 className="w-4 h-4" /> Undo{undoStack.length ? ` (${undoStack.length})` : ""}
          </button>
          <button
            onClick={handleRedo}
            disabled={!hasTemplate || redoStack.length === 0}
            title="Redo (Ctrl/Cmd+Shift+Z)"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm hover:bg-muted disabled:opacity-50"
          >
            <Redo2 className="w-4 h-4" /> Redo{redoStack.length ? ` (${redoStack.length})` : ""}
          </button>
          <button
            onClick={handleRefresh}
            disabled={!hasTemplate}
            title="Reload the preview to reset AMP interactive state (forms, quizzes, carousels)"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={handleReset}
            disabled={!hasTemplate}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm hover:bg-muted disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> Reset changes
          </button>
          <button
            onClick={() => setShowDownloads(true)}
            title="View downloads log"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm hover:bg-muted"
          >
            <FolderDown className="w-4 h-4" /> Downloads
          </button>
        </div>
      </div>

      {showDownloads && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-6 overflow-y-auto"
          onClick={() => setShowDownloads(false)}
        >
          <div
            className="w-full max-w-5xl bg-background border border-border rounded-2xl p-6 shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">Downloads log</div>
              <button
                onClick={() => setShowDownloads(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <DownloadsMode />
          </div>
        </div>
      )}

      {/* Editor surface */}
      {!hasTemplate ? (
        <div className="magic-card rounded-xl p-12 text-center text-muted-foreground">
          <FileCode className="w-8 h-8 mx-auto mb-3 opacity-60" />
          Pick a template from the Email Repository or upload an .html file to start editing.
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          {/* Preview */}
          <div className="magic-card rounded-xl overflow-hidden bg-white">
            <iframe
              ref={iframeRef}
              srcDoc={srcDoc}
              title="Interactive preview"
              sandbox="allow-scripts allow-same-origin"
              className="w-full"
              style={{ height: 780, border: 0, background: "white" }}
            />
          </div>

          {/* Inspector */}
          <div className="magic-card rounded-xl p-4 space-y-4 h-fit sticky top-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" /> Inspector
              </div>
              {selected && (
                <button
                  onClick={() => setSelected(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {!selected ? (
              <p className="text-xs text-muted-foreground">
                Click any text, button, link, or image in the preview to edit it here. Replace images
                by URL or by uploading a file. Changes stay local until you save the draft or download.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground">
                  Selected: <span className="font-mono text-foreground">&lt;{selected.tag}&gt;</span>
                </div>

                {/* Block actions */}
                <div className="rounded-lg border border-border p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Copy className="w-3.5 h-3.5" /> Block actions
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDuplicateBlock}
                      className="px-2 py-1.5 rounded-md bg-muted/60 hover:bg-muted text-xs flex items-center justify-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                    <button
                      onClick={handleRemoveBlock}
                      className="px-2 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                  <div className="text-[10px] text-muted-foreground pt-1">Add a new block below</div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleInsertBlock("image", "after")}
                      className="px-2 py-1.5 rounded-md bg-muted/60 hover:bg-muted text-xs flex items-center justify-center gap-1"
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> Image
                    </button>
                    <button
                      onClick={() => handleInsertBlock("text", "after")}
                      className="px-2 py-1.5 rounded-md bg-muted/60 hover:bg-muted text-xs flex items-center justify-center gap-1"
                    >
                      <Type className="w-3.5 h-3.5" /> Text
                    </button>
                    <button
                      onClick={() => handleInsertBlock("cta", "after")}
                      className="px-2 py-1.5 rounded-md bg-muted/60 hover:bg-muted text-xs flex items-center justify-center gap-1"
                    >
                      <MousePointerClick className="w-3.5 h-3.5" /> CTA
                    </button>
                  </div>
                  <button
                    onClick={() => handleInsertBlock("text", "before")}
                    className="w-full px-2 py-1.5 rounded-md border border-border hover:bg-muted/50 text-[11px] flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add text block above
                  </button>
                </div>


                {/* Text */}
                {(selected.text?.trim() || selected.innerText?.trim()) && (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium mb-1">
                      <Type className="w-3.5 h-3.5" /> Text
                    </label>
                    <textarea
                      value={selected.text}
                      onChange={(e) => sendPatch({ text: e.target.value })}
                      rows={3}
                      className="w-full px-2 py-1.5 rounded-md bg-muted/50 border border-border text-sm"
                    />
                    {selected.innerText && selected.innerText.trim() !== selected.text.trim() && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Only this element's direct text is edited. Nested elements keep their own text
                        — click them individually to edit.
                      </p>
                    )}
                  </div>
                )}

                {/* Link */}
                {selected.tag === "a" && (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium mb-1">
                      <LinkIcon className="w-3.5 h-3.5" /> Link URL
                    </label>
                    <input
                      type="url"
                      value={selected.href}
                      onChange={(e) => sendPatch({ href: e.target.value })}
                      placeholder="https://…"
                      className="w-full px-2 py-1.5 rounded-md bg-muted/50 border border-border text-sm"
                    />
                  </div>
                )}

                {/* Image */}
                {selected.isImage && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium">
                      <ImageIcon className="w-3.5 h-3.5" /> Image
                    </label>
                    {selected.src && (
                      <div className="rounded-md border border-border bg-muted/30 p-2">
                        <img
                          src={selected.src}
                          alt=""
                          className="max-h-24 mx-auto object-contain"
                          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                        />
                      </div>
                    )}
                    <input
                      type="url"
                      value={selected.src || ""}
                      onChange={(e) => sendPatch({ src: e.target.value })}
                      placeholder="https://… image URL"
                      className="w-full px-2 py-1.5 rounded-md bg-muted/50 border border-border text-xs font-mono"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs cursor-pointer hover:bg-muted">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload replacement…</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const dataUrl = String(reader.result || "");
                              if (dataUrl) sendPatch({ src: dataUrl });
                            };
                            reader.readAsDataURL(f);
                          }}
                        />
                      </label>
                      <button
                        onClick={() => {
                          if (!selected) return;
                          // Record for undo, then instruct iframe to remove the element entirely
                          setUndoStack((s) => [
                            ...s,
                            { id: selected.id, prev: { src: selected.src, imageHref: selected.imageHref, alt: selected.alt }, next: { remove: true, src: selected.src } },
                          ]);
                          setRedoStack([]);
                          setEditPatches((s) => [...s, { id: selected.id, patch: { remove: true, src: selected.src } }]);
                          iframeRef.current?.contentWindow?.postMessage(
                            { type: "lovable-patch", id: selected.id, remove: true },
                            "*"
                          );
                          setSelected(null);
                        }}
                        title="Remove this image from the email entirely"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/40 text-destructive text-xs hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Alt text</label>
                      <input
                        type="text"
                        value={selected.alt || ""}
                        onChange={(e) => sendPatch({ alt: e.target.value })}
                        placeholder="Describe the image"
                        className="w-full px-2 py-1.5 rounded-md bg-muted/50 border border-border text-xs"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium mb-1">
                        <LinkIcon className="w-3.5 h-3.5" /> Click-through URL
                      </label>
                      <input
                        type="url"
                        value={selected.imageHref || ""}
                        onChange={(e) => sendPatch({ imageHref: e.target.value })}
                        placeholder="https://… destination when image is clicked"
                        className="w-full px-2 py-1.5 rounded-md bg-muted/50 border border-border text-xs"
                      />
                      <div className="flex items-center gap-2 mt-1.5">
                        {selected.imageHref && (
                          <>
                            <button
                              onClick={() => {
                                try { window.open(selected.imageHref!, "_blank", "noopener"); } catch {}
                                toast.success("Opened click-through in a new tab");
                              }}
                              className="text-[11px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1"
                            >
                              <LinkIcon className="w-3 h-3" /> Test link
                            </button>
                            <button
                              onClick={() => sendPatch({ imageHref: "" })}
                              className="text-[10px] text-muted-foreground hover:text-foreground underline"
                            >
                              Remove link
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Tip: uploads are embedded as base64 into the HTML. For AMP-valid emails, host the
                      image and paste an https:// URL instead. Hold <kbd className="px-1 rounded bg-muted border border-border text-[10px]">Alt</kbd> and click any linked image in the preview to open its click-through URL in a new tab.
                    </p>
                  </div>
                )}

                {/* Background image */}
                {!selected.isImage && (selected.bgImage || false) && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium">
                      <ImageIcon className="w-3.5 h-3.5" /> Background image
                    </label>
                    <input
                      type="url"
                      value={selected.bgImage || ""}
                      onChange={(e) => sendPatch({ bgImage: e.target.value })}
                      placeholder="https://… image URL"
                      className="w-full px-2 py-1.5 rounded-md bg-muted/50 border border-border text-xs font-mono"
                    />
                    <button
                      onClick={() => sendPatch({ bgImage: "" })}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Remove background image
                    </button>
                  </div>
                )}

                {/* Colors */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Text color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selected.color || "#000000"}
                        onChange={(e) => sendPatch({ color: e.target.value })}
                        className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={selected.color}
                        onChange={(e) => sendPatch({ color: e.target.value })}
                        className="flex-1 px-2 py-1 rounded-md bg-muted/50 border border-border text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selected.backgroundColor || "#ffffff"}
                        onChange={(e) => sendPatch({ backgroundColor: e.target.value })}
                        className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={selected.backgroundColor}
                        onChange={(e) => sendPatch({ backgroundColor: e.target.value })}
                        className="flex-1 px-2 py-1 rounded-md bg-muted/50 border border-border text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractivePreviewMode;
