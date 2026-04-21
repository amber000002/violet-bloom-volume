import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileText, RefreshCw, Trash2, Calendar, Folder, Loader2, ChevronDown, ChevronUp, Globe, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  listDiagnosticsExports,
  downloadDiagnosticsExport,
  deleteDiagnosticsExport,
  DiagnosticsExportRecord,
} from "@/lib/diagnosticsExportRepository";
import {
  reusePptWithCurrentTemplate,
  triggerDownload,
  buildReusedFileName,
} from "@/lib/diagnosticsPptReuse";
import { saveDiagnosticsExport } from "@/lib/diagnosticsExportRepository";

interface DiagnosticsExportRepositoryProps {
  industry?: string;
  /** Bumped externally each time a new export is generated, to refresh the list. */
  refreshKey?: number;
}

const formatBytes = (bytes: number | null): string => {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export const DiagnosticsExportRepository: React.FC<DiagnosticsExportRepositoryProps> = ({
  industry,
  refreshKey,
}) => {
  const [records, setRecords] = useState<DiagnosticsExportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reusingId, setReusingId] = useState<string | null>(null);
  const [scope, setScope] = useState<"industry" | "all">("industry");
  const [expanded, setExpanded] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const scopedIndustry = scope === "industry" ? industry : undefined;
    const data = await listDiagnosticsExports(scopedIndustry, 100);
    setRecords(data);
    setLoading(false);
  }, [industry, scope]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleDownload = async (record: DiagnosticsExportRecord) => {
    setDownloadingId(record.id);
    const ok = await downloadDiagnosticsExport(record);
    setDownloadingId(null);
    if (ok) toast.success(`Downloaded ${record.file_name}`);
    else toast.error("Download failed — file may have been removed");
  };

  const handleDelete = async (record: DiagnosticsExportRecord) => {
    if (!confirm(`Remove "${record.file_name}" from the repository? This cannot be undone.`)) return;
    setDeletingId(record.id);
    const ok = await deleteDiagnosticsExport(record);
    setDeletingId(null);
    if (ok) {
      toast.success("Removed from repository");
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
    } else {
      toast.error("Failed to remove from repository");
    }
  };

  const handleReuse = async (record: DiagnosticsExportRecord) => {
    setReusingId(record.id);
    const toastId = toast.loading("Re-skinning with current template…");
    try {
      const blob = await reusePptWithCurrentTemplate(record, (msg) => {
        toast.loading(msg, { id: toastId });
      });
      const fileName = buildReusedFileName(record.file_name);
      triggerDownload(blob, fileName);
      // Archive the new version too so it shows up in the repository.
      try {
        await saveDiagnosticsExport({
          blob,
          fileName,
          brandName: record.brand_name,
          industry: record.industry,
          websiteUrl: record.website_host_normalized,
          sourceFileName: record.source_file_name,
          monthRange: record.month_range,
          reportType: record.report_type,
        });
      } catch {
        /* non-blocking */
      }
      toast.success(`Downloaded ${fileName}`, { id: toastId });
      load();
    } catch (err: any) {
      console.error("[reuse]", err);
      toast.error(err?.message || "Failed to re-skin presentation", { id: toastId });
    } finally {
      setReusingId(null);
    }
  };

  return (
    <div className="magic-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 text-left"
        >
          <Folder className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            Report Repository
          </h3>
          <span className="text-xs text-muted-foreground font-normal">
            ({records.length} {records.length === 1 ? "report" : "reports"})
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <div className="flex items-center gap-2">
          {industry && (
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => setScope("industry")}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  scope === "industry"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {industry}
              </button>
              <button
                onClick={() => setScope("all")}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  scope === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All industries
              </button>
            </div>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {loading && records.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading repository…
              </div>
            ) : records.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">
                  No reports in the repository yet.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Generate an Analysis Report and click <span className="font-medium">Add to PPT</span> — your export will be archived here automatically.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60 max-h-[420px] overflow-y-auto -mx-2">
                {records.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-2 py-3 hover:bg-muted/30 transition-colors rounded-md"
                  >
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate" title={r.file_name}>
                          {r.file_name}
                        </p>
                        <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {r.report_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(r.created_at)}
                        </span>
                        {r.brand_name && <span>· {r.brand_name}</span>}
                        {r.website_host_normalized && (
                          <span className="inline-flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {r.website_host_normalized}
                          </span>
                        )}
                        {r.month_range && <span>· {r.month_range}</span>}
                        <span>· {formatBytes(r.file_size_bytes)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleReuse(r)}
                      disabled={reusingId === r.id}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                      title="Reuse with current Slide Layout Editor templates"
                    >
                      {reusingId === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDownload(r)}
                      disabled={downloadingId === r.id}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                      title="Download original"
                    >
                      {downloadingId === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={deletingId === r.id}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      title="Remove from repository"
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
