import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Plus,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  fetchSlots,
  uploadSlotBackground,
  removeSlotBackground,
  REPORT_TYPES,
  SlideSlot,
} from "@/lib/slideTemplateService";
import { toast } from "sonner";

interface SlideLayoutEditorProps {
  onClose: () => void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const REC_W = 1920;
const REC_H = 1080;

export const SlideLayoutEditor: React.FC<SlideLayoutEditorProps> = ({ onClose }) => {
  const [slots, setSlots] = useState<SlideSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "data" | "special">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadFor, setPendingUploadFor] = useState<SlideSlot | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSlots(REPORT_TYPES.INBOX_DIAGNOSTICS);
        setSlots(data);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load slide template");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return "Only PNG or JPG allowed";
    if (file.size > MAX_FILE_BYTES) return "File exceeds 5MB";
    return null;
  };

  const handleUpload = useCallback(
    async (slot: SlideSlot, file: File) => {
      const err = validateFile(file);
      if (err) {
        toast.error(err);
        return;
      }
      setBusyId(slot.id);
      try {
        const updated = await uploadSlotBackground(slot, file);
        setSlots((prev) => prev.map((s) => (s.id === slot.id ? updated : s)));
        if (updated.background_width !== REC_W || updated.background_height !== REC_H) {
          toast.warning(`Uploaded ${updated.background_width}×${updated.background_height} (recommended ${REC_W}×${REC_H})`);
        } else {
          toast.success(`Updated slot ${slot.position}`);
        }
      } catch (e) {
        console.error(e);
        toast.error("Upload failed");
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const handleRemove = useCallback(async (slot: SlideSlot) => {
    if (!confirm(`Remove background for slot ${slot.position}?`)) return;
    setBusyId(slot.id);
    try {
      const updated = await removeSlotBackground(slot);
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? updated : s)));
      toast.success("Background removed");
    } catch (e) {
      console.error(e);
      toast.error("Remove failed");
    } finally {
      setBusyId(null);
    }
  }, []);

  const triggerFilePicker = (slot: SlideSlot) => {
    setPendingUploadFor(slot);
    fileInputRef.current?.click();
  };

  const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingUploadFor) return;
    await handleUpload(pendingUploadFor, file);
    setPendingUploadFor(null);
  };

  const onDrop = async (slot: SlideSlot, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (slot.background_path && !confirm("Replace existing background?")) return;
    await handleUpload(slot, file);
  };

  const filtered = slots.filter((s) => {
    if (typeFilter !== "all" && s.slide_type !== typeFilter) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !String(s.position).includes(search))
      return false;
    return true;
  });

  const selected = slots.find((s) => s.id === selectedId) || null;
  const filledCount = slots.filter((s) => !!s.background_path).length;

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        onChange={onFileInputChange}
        className="hidden"
      />

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to library
        </button>
        <div className="text-xs text-muted-foreground">
          {filledCount}/{slots.length} slots filled
        </div>
      </div>

      <div>
        <h3 className="text-lg font-display font-semibold text-foreground">Slide layout editor</h3>
        <p className="text-xs text-muted-foreground">
          Resource library / Inbox Diagnostics Report template
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search by title or slide #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | "data" | "special")}
          className="px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All types</option>
          <option value="data">Data slides</option>
          <option value="special">Special slides</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading template...
        </div>
      ) : (
        <>
          {/* Slot grid */}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((slot) => {
              const isSelected = slot.id === selectedId;
              const isBusy = slot.id === busyId;
              const filled = !!slot.background_path;
              return (
                <motion.div
                  key={slot.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setSelectedId(slot.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => onDrop(slot, e)}
                  className={`cursor-pointer rounded-xl border bg-card/40 backdrop-blur-sm overflow-hidden transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  {/* Header strip */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border bg-muted/20">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                      Slide {slot.position}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          filled ? "bg-emerald-400" : "bg-muted-foreground/40"
                        }`}
                      />
                      {filled ? "Uploaded" : "Empty"}
                    </span>
                  </div>

                  {/* Body 16:9 */}
                  <div className="relative aspect-video bg-muted/40 flex items-center justify-center">
                    {isBusy ? (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    ) : filled ? (
                      <img
                        src={slot.background_url || ""}
                        alt={slot.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerFilePicker(slot);
                        }}
                        className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-[10px]">Drop slide here</span>
                      </button>
                    )}
                  </div>

                  {/* Footer strip */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-border bg-muted/10">
                    <span className="text-[11px] font-medium truncate text-foreground" title={slot.title}>
                      {slot.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">{slot.slide_type}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4"
            >
              <div className="flex gap-4">
                {/* Preview */}
                <div className="w-[180px] flex-shrink-0">
                  <div className="aspect-video rounded-lg border border-border bg-muted/40 flex items-center justify-center overflow-hidden">
                    {selected.background_url ? (
                      <img src={selected.background_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Slide {selected.position} – {selected.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground capitalize">{selected.slide_type} slide</div>
                  </div>

                  {selected.background_filename && (
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="truncate">{selected.background_filename}</span>
                      </div>
                      <div>
                        {selected.background_width}×{selected.background_height} •{" "}
                        {selected.file_size_bytes
                          ? `${(selected.file_size_bytes / 1024).toFixed(0)} KB`
                          : ""}
                      </div>
                      {selected.uploaded_at && (
                        <div>Updated {new Date(selected.uploaded_at).toLocaleString()}</div>
                      )}
                      {selected.background_width !== REC_W || selected.background_height !== REC_H ? (
                        <div className="flex items-center gap-1 text-amber-400">
                          <AlertTriangle className="w-3 h-3" />
                          Recommended {REC_W}×{REC_H}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {selected.slide_type === "data" && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                        Header 11.11%
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400">
                        Content 62.88%
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                        Insight 18%
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted-foreground/20 text-muted-foreground">
                        Footer 8%
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => triggerFilePicker(selected)}
                      disabled={busyId === selected.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {selected.background_path ? "Replace" : "Upload"}
                    </button>
                    {selected.background_path && (
                      <button
                        onClick={() => handleRemove(selected)}
                        disabled={busyId === selected.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-destructive hover:border-destructive disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};
