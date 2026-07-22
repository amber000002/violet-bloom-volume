import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, X, Copy, Download, ArrowLeft, Mail, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  listUseCaseTemplates,
  reclassifyUseCaseTemplate,
  UseCaseTemplate,
  EMAIL_USE_CASE_CATEGORIES,
} from "@/lib/useCaseTemplateService";
import { EMAIL_TEMPLATE_INDUSTRIES, industryLabel } from "@/lib/emailTemplateIndustries";
import { AmpEmailPreviewFrame } from "@/components/email/AmpEmailPreviewFrame";
import { generateEmailMockup } from "@/lib/emailMockup";
import { logHtmlDownload } from "@/lib/htmlDownloadsService";

export const EmailRepositoryMode: React.FC = () => {
  const [templates, setTemplates] = useState<UseCaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCustomer, setFilterCustomer] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterIndustry, setFilterIndustry] = useState<string>("all");
  const [selected, setSelected] = useState<UseCaseTemplate | null>(null);
  const [reclassifyingId, setReclassifyingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listUseCaseTemplates();
        setTemplates(data);
      } catch (e: any) {
        toast.error(`Failed to load templates: ${e?.message || e}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const customers = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => t.customerName && set.add(t.customerName));
    return Array.from(set).sort();
  }, [templates]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => t.useCaseCategory && set.add(t.useCaseCategory));
    return Array.from(set).sort();
  }, [templates]);

  const industries = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => t.industry && set.add(t.industry));
    return Array.from(set).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (filterCustomer !== "all" && (t.customerName ?? "") !== filterCustomer) return false;
      if (filterType !== "all" && t.templateType !== filterType) return false;
      if (filterCategory !== "all" && (t.useCaseCategory ?? "") !== filterCategory) return false;
      if (filterIndustry !== "all" && (t.industry ?? "") !== filterIndustry) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${t.label} ${t.customerName ?? ""} ${t.useCaseCategory ?? ""} ${industryLabel(t.industry)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [templates, filterCustomer, filterType, filterCategory, filterIndustry, search]);

  const handleCopy = async (html: string) => {
    try {
      await navigator.clipboard.writeText(html);
      toast.success("Code copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleDownload = (t: UseCaseTemplate) => {
    const blob = new Blob([t.htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = t.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.download = `${safe || "email"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMockup = (t: UseCaseTemplate) => {
    const mockupHtml = generateEmailMockup(t.htmlContent, {
      brandName: t.customerName ?? undefined,
      useCase: t.useCaseCategory,
      industry: t.industry,
    });
    const blob = new Blob([mockupHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = t.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.download = `${safe || "email"}-mockup.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Mockup downloaded (branding masked)");
  };


  const handleReclassify = async (t: UseCaseTemplate) => {
    setReclassifyingId(t.id);
    try {
      const updated = await reclassifyUseCaseTemplate(t);
      setTemplates((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      if (selected?.id === updated.id) setSelected(updated);
      toast.success(`Classified as ${updated.useCaseCategory}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to classify");
    } finally {
      setReclassifyingId(null);
    }
  };

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to repository
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(selected.htmlContent)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted/50"
            >
              <Copy className="w-4 h-4" /> Copy code
            </button>
            <button
              onClick={() => handleDownloadMockup(selected)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted/50"
              title="Download a branding-masked mockup version"
            >
              <Download className="w-4 h-4" /> Download mockup
            </button>
            <button
              onClick={() => handleDownload(selected)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-magic text-primary-foreground text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Download .html
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-display font-semibold text-foreground">{selected.label}</h3>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium uppercase">
              {selected.templateType}
            </span>
            {selected.customerName && (
              <span className="px-2 py-0.5 rounded bg-muted text-foreground/80 text-[10px]">
                {selected.customerName}
              </span>
            )}
            {selected.industry && (
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px]">
                {industryLabel(selected.industry)}
              </span>
            )}
            {selected.useCaseCategory && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px]">
                {selected.useCaseCategory}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Code (left) */}
          <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">HTML Code</span>
              <button
                onClick={() => handleCopy(selected.htmlContent)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <pre className="p-3 text-[11px] leading-relaxed overflow-auto max-h-[70vh] font-mono text-foreground/80 bg-muted/20">
              <code>{selected.htmlContent}</code>
            </pre>
          </div>

          {/* Preview (right) */}
          <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-xs font-medium text-muted-foreground">Preview</span>
            </div>
            <AmpEmailPreviewFrame
              title={selected.label}
              html={selected.htmlContent}
              className="w-full h-[70vh] bg-white"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" /> Email Repository
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Gallery of every email uploaded via Resource Library → Use Case Templates. Filter by customer, template type, or AI-classified use case.
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(e.target.value)}
          className="px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All customers</option>
          {customers.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterIndustry}
          onChange={(e) => setFilterIndustry(e.target.value)}
          className="px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All industries</option>
          {(industries.length ? industries : EMAIL_TEMPLATE_INDUSTRIES.map((i) => i.value)).map((v) => (
            <option key={v} value={v}>{industryLabel(v)}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Types</option>
          <option value="amp">AMP</option>
          <option value="html">HTML</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All use cases</option>
          {(categories.length ? categories : EMAIL_USE_CASE_CATEGORIES).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">
            {templates.length === 0 ? "No emails yet" : "No emails match your filters"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload emails via Resource Library → Use Case Templates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {filtered.map((t) => (
              <motion.button
                layout
                key={t.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                onClick={() => setSelected(t)}
                className="text-left group rounded-xl border border-border bg-card/40 overflow-hidden hover:border-primary/50 transition-colors"
              >
                <div className="relative aspect-[4/5] bg-white overflow-hidden">
                  <AmpEmailPreviewFrame
                    title={t.label}
                    html={t.htmlContent}
                    allowInteraction={false}
                    className="w-[200%] h-[200%] origin-top-left scale-50"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm text-foreground truncate" title={t.label}>
                    {t.label}
                  </p>
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
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        {t.useCaseCategory}
                      </span>
                    )}
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReclassify(t);
                      }}
                      title="Re-run AI classification"
                      className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[10px] flex items-center gap-1 cursor-pointer hover:bg-amber-500/20"
                    >
                      {reclassifyingId === t.id ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-2.5 h-2.5" />
                      )}
                      {t.useCaseCategory ? "Reclassify" : "Classify"}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
