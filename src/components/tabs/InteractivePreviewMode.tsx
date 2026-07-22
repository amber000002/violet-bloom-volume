import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, FileCode, Download, Save, MousePointerClick, Type, Link as LinkIcon, Palette, X, RotateCcw, Image as ImageIcon, Undo2, Redo2 } from "lucide-react";
import { listUseCaseTemplates, UseCaseTemplate } from "@/lib/useCaseTemplateService";
import { saveAmpDraft } from "@/lib/ampDraftService";
import { logHtmlDownload } from "@/lib/htmlDownloadsService";

// ---------- Editor bridge (runs inside the iframe) ----------
const EDITOR_ATTR = "data-edit-id";
const EDITOR_STYLE_ID = "__lovable_editor_style__";
const EDITOR_SCRIPT_ID = "__lovable_editor_script__";

const EDITOR_CSS = `
  [${EDITOR_ATTR}]{outline:1px dashed transparent;outline-offset:2px;cursor:pointer;transition:outline-color .15s;}
  [${EDITOR_ATTR}]:hover{outline-color:#a855f7 !important;}
  [${EDITOR_ATTR}].__lovable_selected__{outline:2px solid #a855f7 !important;}
  a[${EDITOR_ATTR}]::after{content:" \\1F517";font-size:10px;opacity:.5;}
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

  document.addEventListener("click", (e) => {
    let el = e.target;
    while (el && el.nodeType === 1 && !el.getAttribute(ATTR)) el = el.parentElement;
    if (!el || !el.getAttribute) return;
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

  window.addEventListener("message", (ev) => {
    const d = ev.data;
    if (!d || d.type !== "lovable-patch") return;
    const el = document.querySelector('[' + ATTR + '="' + d.id + '"]');
    if (!el) return;
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
    if (typeof d.src === "string" && d.src) {
      const tn = el.tagName;
      if (tn === "IMG" || tn === "AMP-IMG" || tn === "AMP-ANIM") {
        el.setAttribute("src", d.src);
        // amp-img sometimes renders via an inner <img>; sync it
        const inner = el.querySelector && el.querySelector("img");
        if (inner) inner.setAttribute("src", d.src);
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
  prev: Partial<Selected>;
  next: Partial<Selected>;
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

  const postPatch = useCallback((id: string, patch: Partial<Selected>) => {
    iframeRef.current?.contentWindow?.postMessage({ type: "lovable-patch", id, ...patch }, "*");
  }, []);

  const sendPatch = (patch: Partial<Selected>, options: { record?: boolean } = { record: true }) => {
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
    }
  };

  const handleUndo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const entry = stack[stack.length - 1];
      postPatch(entry.id, entry.prev);
      setRedoStack((r) => [...r, entry]);
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
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return sourceHtml;
    const raw = "<!doctype html>\n" + doc.documentElement.outerHTML;
    return stripEditor(raw);
  };

  const handleDownload = () => {
    const html = currentHtml();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (draftName || "edited-template") + ".html";
    a.click();
    URL.revokeObjectURL(url);
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
            onClick={handleReset}
            disabled={!hasTemplate}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm hover:bg-muted disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> Reset changes
          </button>
        </div>
      </div>

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
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs cursor-pointer hover:bg-muted">
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
                      {selected.imageHref && (
                        <button
                          onClick={() => sendPatch({ imageHref: "" })}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline mt-1"
                        >
                          Remove link
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Tip: uploads are embedded as base64 into the HTML. For AMP-valid emails, host the
                      image and paste an https:// URL instead.
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
