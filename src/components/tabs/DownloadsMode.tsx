import React, { useEffect, useMemo, useState } from "react";
import { Download, Loader2, RefreshCw, Search, Trash2, FileCode } from "lucide-react";
import { toast } from "sonner";
import {
  listHtmlDownloads,
  deleteHtmlDownload,
  HtmlDownloadRecord,
} from "@/lib/htmlDownloadsService";
import { industryLabel } from "@/lib/emailTemplateIndustries";

const SOURCE_LABEL: Record<string, string> = {
  "email-repository": "Email Repository",
  "email-repository-mockup": "Repository · Mockup",
  "interactive-preview": "Interactive Preview",
  "amp-studio": "AMP Studio",
  other: "Other",
};

function fmtBytes(n: number): string {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export const DownloadsMode: React.FC = () => {
  const [rows, setRows] = useState<HtmlDownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listHtmlDownloads();
      setRows(data);
    } catch (e: any) {
      toast.error(`Failed to load downloads: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sources = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.source));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterSource !== "all" && r.source !== filterSource) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [
          r.fileName,
          r.customerName,
          r.templateLabel,
          r.useCaseCategory,
          industryLabel(r.industry),
          r.variant,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, filterSource]);

  const totals = useMemo(() => {
    const total = rows.length;
    const bySource = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {});
    return { total, bySource };
  }, [rows]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteHtmlDownload(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Entry removed");
    } catch (e: any) {
      toast.error(`Delete failed: ${e?.message || e}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" /> Downloads
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Every HTML export logged from the Email Repository, mockups, and the Interactive Preview.
            Version increments per template each time it's re-exported.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted/50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <div className="text-[10px] uppercase text-muted-foreground">Total downloads</div>
          <div className="text-2xl font-display font-semibold">{totals.total}</div>
        </div>
        {Object.entries(totals.bySource)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([src, n]) => (
            <div key={src} className="rounded-xl border border-border bg-card/40 p-3">
              <div className="text-[10px] uppercase text-muted-foreground truncate">
                {SOURCE_LABEL[src] || src}
              </div>
              <div className="text-2xl font-display font-semibold">{n}</div>
            </div>
          ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="relative col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search filename, brand, use case…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABEL[s] || s}
            </option>
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
            <FileCode className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">
            {rows.length === 0 ? "No downloads yet" : "No downloads match your filters"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Download an email from the repository or Interactive Preview to log it here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card/40">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs">
              <tr>
                <th className="text-left px-3 py-2 font-medium">File</th>
                <th className="text-left px-3 py-2 font-medium">Version</th>
                <th className="text-left px-3 py-2 font-medium">Source</th>
                <th className="text-left px-3 py-2 font-medium">Brand / Use case</th>
                <th className="text-left px-3 py-2 font-medium">Size</th>
                <th className="text-left px-3 py-2 font-medium">Downloaded</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground truncate max-w-[280px]" title={r.fileName}>
                      {r.fileName}
                    </div>
                    {r.contentHash && (
                      <div className="text-[10px] font-mono text-muted-foreground truncate" title={r.contentHash}>
                        sha1 {r.contentHash.slice(0, 10)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium">
                      v{r.version}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/80">
                      {SOURCE_LABEL[r.source] || r.source}
                    </span>
                    {r.variant && (
                      <div className="text-[10px] text-muted-foreground mt-1">{r.variant}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.customerName && <div className="text-foreground">{r.customerName}</div>}
                    {r.templateLabel && (
                      <div className="text-muted-foreground truncate max-w-[200px]" title={r.templateLabel}>
                        {r.templateLabel}
                      </div>
                    )}
                    {r.useCaseCategory && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px]">
                        {r.useCaseCategory}
                      </span>
                    )}
                    {r.industry && (
                      <span className="inline-block mt-1 ml-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px]">
                        {industryLabel(r.industry)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {fmtBytes(r.fileSizeBytes)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(r.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      title="Remove log entry"
                      className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DownloadsMode;
