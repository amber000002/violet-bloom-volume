import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  FileCode,
  Search,
  AlertTriangle,
  Trash2,
  Pencil,
  RefreshCw,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  listUseCaseTemplates,
  uploadUseCaseTemplate,
  renameUseCaseTemplate,
  replaceUseCaseTemplate,
  softDeleteUseCaseTemplate,
  TEMPLATE_MAX_BYTES,
  TEMPLATE_LABEL_MAX,
  UseCaseTemplate,
  TemplateType,
} from "@/lib/useCaseTemplateService";
import { EMAIL_TEMPLATE_INDUSTRIES, industryLabel } from "@/lib/emailTemplateIndustries";
import { AmpEmailPreviewFrame } from "@/components/email/AmpEmailPreviewFrame";

interface UseCaseTemplateEditorProps {
  onClose: () => void;
}

type SortMode = "recent" | "most-used" | "alpha";

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

async function readFileAsText(file: File): Promise<string> {
  return await file.text();
}

export const UseCaseTemplateEditor: React.FC<UseCaseTemplateEditorProps> = ({ onClose }) => {
  const [templates, setTemplates] = useState<UseCaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "paste">("file");
  const [pasteHtml, setPasteHtml] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadCustomer, setUploadCustomer] = useState("");
  const [uploadIndustry, setUploadIndustry] = useState<string>("");
  const [uploadType, setUploadType] = useState<TemplateType>("amp");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Rename
  const [renameTarget, setRenameTarget] = useState<UseCaseTemplate | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  // Replace
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Validation popover
  const [errorsForId, setErrorsForId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listUseCaseTemplates();
        setTemplates(data);
      } catch (e: any) {
        console.error(e);
        toast.error(`Failed to load templates: ${e?.message || e}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const customerSuggestions = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => t.customerName && set.add(t.customerName));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  // Map customer name (case-insensitive) → most recent industry used for that customer.
  const customerIndustryMap = useMemo(() => {
    const map = new Map<string, string>();
    const sorted = [...templates].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    for (const t of sorted) {
      if (!t.customerName || !t.industry) continue;
      const key = t.customerName.trim().toLowerCase();
      if (!map.has(key)) map.set(key, t.industry);
    }
    return map;
  }, [templates]);

  const handleCustomerChange = (value: string) => {
    setUploadCustomer(value);
    const match = customerIndustryMap.get(value.trim().toLowerCase());
    if (match) setUploadIndustry(match);
  };

  const filtered = useMemo(() => {
    let list = templates;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.label.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === "recent") {
      sorted.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    } else if (sort === "most-used") {
      sorted.sort((a, b) => b.usageCount - a.usageCount);
    } else {
      sorted.sort((a, b) => a.label.localeCompare(b.label));
    }
    return sorted;
  }, [templates, search, sort]);

  const validateUploadFile = (file: File): string | null => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".html") && !name.endsWith(".htm") && file.type !== "text/html") {
      return "Only .html files are allowed";
    }
    if (file.size > TEMPLATE_MAX_BYTES) return "File exceeds 500 KB";
    return null;
  };

  const onPickUploadFiles = (files: File[]) => {
    const valid: File[] = [];
    for (const f of files) {
      const err = validateUploadFile(f);
      if (err) {
        toast.error(`${f.name}: ${err}`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) return;
    setUploadFiles((prev) => {
      const seen = new Set(prev.map((p) => `${p.name}:${p.size}`));
      const merged = [...prev];
      for (const f of valid) {
        const k = `${f.name}:${f.size}`;
        if (!seen.has(k)) {
          seen.add(k);
          merged.push(f);
        }
      }
      return merged;
    });
    if (valid.length === 1 && !uploadLabel) {
      setUploadLabel(valid[0].name.replace(/\.html?$/i, "").slice(0, TEMPLATE_LABEL_MAX));
    }
  };

  const handleUploadSubmit = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: uploadFiles.length });
    const created: UseCaseTemplate[] = [];
    const failures: string[] = [];
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      const derivedLabel = (uploadFiles.length === 1 && uploadLabel
        ? uploadLabel
        : file.name.replace(/\.html?$/i, "")
      ).slice(0, TEMPLATE_LABEL_MAX);
      try {
        const html = await readFileAsText(file);
        const t = await uploadUseCaseTemplate({
          label: derivedLabel,
          html,
          customerName: uploadCustomer,
          industry: uploadIndustry,
          templateType: uploadType,
        });
        created.push(t);
      } catch (e: any) {
        failures.push(`${file.name}: ${e?.message || e}`);
      }
      setUploadProgress({ done: i + 1, total: uploadFiles.length });
    }
    if (created.length > 0) {
      setTemplates((prev) => [...created, ...prev]);
      toast.success(
        created.length === 1
          ? "Template uploaded"
          : `${created.length} templates uploaded`
      );
    }
    if (failures.length > 0) {
      toast.error(`Failed: ${failures.slice(0, 3).join("; ")}${failures.length > 3 ? "…" : ""}`);
    }
    if (failures.length === 0) {
      setUploadOpen(false);
      setUploadFiles([]);
      setUploadLabel("");
      setUploadCustomer("");
      setUploadIndustry("");
      setUploadType("amp");
    }
    setUploading(false);
    setUploadProgress(null);
  };


  const handleRenameSubmit = async () => {
    if (!renameTarget) return;
    setRenaming(true);
    try {
      const updated = await renameUseCaseTemplate(renameTarget.id, renameValue);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success("Template renamed");
      setRenameTarget(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to rename");
    } finally {
      setRenaming(false);
    }
  };

  const handleReplaceFile = async (file: File) => {
    if (!replaceTargetId) return;
    const err = validateUploadFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    setBusyId(replaceTargetId);
    try {
      const html = await readFileAsText(file);
      const updated = await replaceUseCaseTemplate(replaceTargetId, html);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success("Template replaced");
    } catch (e: any) {
      toast.error(e?.message || "Failed to replace");
    } finally {
      setBusyId(null);
      setReplaceTargetId(null);
    }
  };

  const handleDelete = async (t: UseCaseTemplate) => {
    if (!confirm(`Delete "${t.label}"? This cannot be undone.`)) return;
    setBusyId(t.id);
    try {
      await softDeleteUseCaseTemplate(t.id);
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
      toast.success("Template deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to library
        </button>
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-magic text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Upload className="w-4 h-4" />
          Upload Template
        </button>
      </div>

      <div>
        <h3 className="text-lg font-display font-semibold text-foreground">Use Case Templates</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Upload .html email templates that power AMP Templates generation. Max 500 KB per file.
        </p>
      </div>

      {/* Search + sort */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="recent">Recent</option>
          <option value="most-used">Most used</option>
          <option value="alpha">A–Z</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        templates.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <FileCode className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">No templates yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Upload your first use case template to start generating brand-styled emails.
            </p>
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-magic text-primary-foreground text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Upload Template
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">No templates match your search.</div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((t) => (
            <motion.div
              key={t.id}
              layout
              className="relative group rounded-xl border border-border bg-card/40 overflow-hidden hover:border-primary/40 transition-colors"
            >
              {/* Thumbnail */}
              <div className="relative aspect-[16/10] bg-muted/40 overflow-hidden">
                <AmpEmailPreviewFrame
                  title={t.label}
                  html={t.htmlContent}
                  allowInteraction={false}
                  className="w-[200%] h-[200%] origin-top-left scale-50"
                />
                {!t.ampValid && (
                  <button
                    onClick={() => setErrorsForId(errorsForId === t.id ? null : t.id)}
                    title="Validation warnings"
                    className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/90 text-white text-[10px] font-medium shadow"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {(t.ampValidatorErrors?.length ?? 0)} warning
                    {(t.ampValidatorErrors?.length ?? 0) === 1 ? "" : "s"}
                  </button>
                )}

                {/* Hover actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setRenameTarget(t);
                      setRenameValue(t.label);
                    }}
                    title="Rename"
                    className="p-1.5 rounded-md bg-background/90 hover:bg-background text-foreground shadow"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setReplaceTargetId(t.id);
                      replaceInputRef.current?.click();
                    }}
                    title="Replace"
                    disabled={busyId === t.id}
                    className="p-1.5 rounded-md bg-background/90 hover:bg-background text-foreground shadow disabled:opacity-50"
                  >
                    {busyId === t.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    title="Delete"
                    disabled={busyId === t.id}
                    className="p-1.5 rounded-md bg-background/90 hover:bg-destructive hover:text-destructive-foreground text-foreground shadow disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground text-sm truncate flex-1" title={t.label}>
                    {t.label}
                  </p>
                  {t.ampValid && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium uppercase">
                    {t.templateType}
                  </span>
                  {t.customerName && (
                    <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/80 text-[10px]">
                      {t.customerName}
                    </span>
                  )}
                  {t.industry && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px]">
                      {industryLabel(t.industry)}
                    </span>
                  )}
                  {t.useCaseCategory && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px]">
                      {t.useCaseCategory}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {formatBytes(t.fileSizeBytes)} · {formatDate(t.updatedAt)} · Used {t.usageCount} time
                  {t.usageCount === 1 ? "" : "s"}
                </p>

                {/* Validation popover */}
                {errorsForId === t.id && t.ampValidatorErrors && t.ampValidatorErrors.length > 0 && (
                  <div className="mt-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30 max-h-32 overflow-y-auto">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-amber-600">
                        AMP validation warnings
                      </span>
                      <button onClick={() => setErrorsForId(null)} className="text-amber-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <ul className="space-y-1 text-[10px] text-foreground/80">
                      {t.ampValidatorErrors.slice(0, 8).map((err, i) => (
                        <li key={i}>
                          <span className="font-mono text-amber-600">L{err.line}</span> · {err.rule}: {err.message}
                        </li>
                      ))}
                      {t.ampValidatorErrors.length > 8 && (
                        <li className="text-muted-foreground">
                          + {t.ampValidatorErrors.length - 8} more…
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Hidden replace input */}
      <input
        ref={replaceInputRef}
        type="file"
        accept=".html,.htm,text/html"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) handleReplaceFile(f);
        }}
      />

      {/* Upload modal */}
      {uploadOpen && (
        <div
          className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !uploading && setUploadOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-semibold text-foreground">
                Upload Use Case Template
              </h3>
              <button
                onClick={() => !uploading && setUploadOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                {([
                  { k: "file" as const, label: "Upload file" },
                  { k: "paste" as const, label: "Paste code" },
                ]).map((m) => (
                  <button
                    key={m.k}
                    type="button"
                    disabled={uploading}
                    onClick={() => setUploadMode(m.k)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      uploadMode === m.k
                        ? "bg-gradient-magic text-primary-foreground shadow-magic"
                        : "bg-muted/50 text-muted-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {uploadMode === "paste" ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Template name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={uploadLabel}
                      maxLength={TEMPLATE_LABEL_MAX}
                      onChange={(e) => setUploadLabel(e.target.value)}
                      placeholder="e.g. Carousell Welcome AMP"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      HTML / AMP code <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      value={pasteHtml}
                      onChange={(e) => setPasteHtml(e.target.value)}
                      spellCheck={false}
                      placeholder="<!doctype html>…"
                      className="w-full h-56 px-3 py-2 bg-input border border-border rounded-lg text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatBytes(new TextEncoder().encode(pasteHtml).length)} · max 500 KB. Saved as an .html file in the repository.
                    </p>
                  </div>
                </>
              ) : (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  HTML file <span className="text-destructive">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.htm,text/html"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    onPickUploadFiles(files);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex flex-col items-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  {uploadFiles.length > 0 ? (
                    <span className="text-foreground text-center">
                      {uploadFiles.length} file{uploadFiles.length === 1 ? "" : "s"} selected · click to add more
                    </span>
                  ) : (
                    <>
                      <span>Click to choose .html files (multi-select)</span>
                      <span className="text-[10px]">Max 500 KB each</span>
                    </>
                  )}

                </button>
                {uploadFiles.length > 0 && (
                  <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto text-xs">
                    {uploadFiles.map((f, idx) => (
                      <li
                        key={`${f.name}:${idx}`}
                        className="flex items-center gap-2 px-2 py-1 rounded bg-muted/40 border border-border"
                      >
                        <FileCode className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="truncate flex-1" title={f.name}>{f.name}</span>
                        <span className="text-[10px] text-muted-foreground">{formatBytes(f.size)}</span>
                        <button
                          type="button"
                          onClick={() => setUploadFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-muted-foreground hover:text-destructive"
                          disabled={uploading}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              )}


              {/* Customer */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Customer name</label>
                <input
                  type="text"
                  list="uct-customer-suggestions"
                  value={uploadCustomer}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  placeholder="e.g. Carousell"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <datalist id="uct-customer-suggestions">
                  {customerSuggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {customerSuggestions.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Start typing to reuse an existing customer name.
                  </p>
                )}
              </div>

              {/* Industry */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Industry</label>
                <select
                  value={uploadIndustry}
                  onChange={(e) => setUploadIndustry(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select industry…</option>
                  {EMAIL_TEMPLATE_INDUSTRIES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Used to filter templates in the Email Repository.
                </p>
              </div>

              {/* Template type */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Template type <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  {(["amp", "html"] as TemplateType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setUploadType(t)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium uppercase transition-all ${
                        uploadType === t
                          ? "bg-gradient-magic text-primary-foreground shadow-magic"
                          : "bg-muted/50 text-muted-foreground border border-border hover:bg-muted"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  The use case is auto-classified by AI (welcome, cart abandonment, gamification, etc.).
                </p>
              </div>
            </div>


            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setUploadOpen(false)}
                disabled={uploading}
                className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={(uploadMode === "file" ? uploadFiles.length === 0 : !pasteHtml.trim() || !uploadLabel.trim()) || uploading}
                className="px-4 py-2 rounded-lg bg-gradient-magic text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                {uploading && uploadProgress
                  ? `Uploading ${uploadProgress.done}/${uploadProgress.total}…`
                  : uploadMode === "paste"
                    ? "Save Template"
                    : uploadFiles.length > 1
                      ? `Save ${uploadFiles.length} Templates`
                      : "Save Template"}
              </button>

            </div>
          </motion.div>
        </div>
      )}

      {/* Rename modal */}
      {renameTarget && (
        <div
          className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !renaming && setRenameTarget(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-xl"
          >
            <h3 className="text-lg font-display font-semibold text-foreground mb-4">Rename template</h3>
            <input
              type="text"
              maxLength={TEMPLATE_LABEL_MAX}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRenameTarget(null)}
                disabled={renaming}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                disabled={!renameValue.trim() || renaming}
                className="px-4 py-2 rounded-lg bg-gradient-magic text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {renaming && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
