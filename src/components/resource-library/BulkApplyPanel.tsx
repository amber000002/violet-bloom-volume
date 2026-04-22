import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Upload, X, ChevronDown, Loader2, Image as ImageIcon } from "lucide-react";
import { SlideSlot } from "@/lib/slideTemplateService";

export type Preset = "all" | "data" | "special" | "empty" | "custom";

interface BulkApplyPanelProps {
  slots: SlideSlot[];
  preset: Preset;
  customSelection: Set<string>;
  onPresetChange: (preset: Preset) => void;
  onCustomSelectionChange: (sel: Set<string>) => void;
  onApply: (file: File, targetSlots: SlideSlot[], skipExisting: boolean) => Promise<void>;
  busy: boolean;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_TTL_MS = 5 * 60 * 1000;
const SS_KEY = "bulkApply.state.v1";

interface PersistedState {
  preset: Preset;
  customSelection: string[];
  expanded: boolean;
  fileName?: string;
  fileDataUrl?: string;
  fileType?: string;
  savedAt?: number;
  skipExisting: boolean;
}

const formatRanges = (positions: number[]): string => {
  if (positions.length === 0) return "None";
  const sorted = [...positions].sort((a, b) => a - b);
  if (sorted.length <= 10) return sorted.join(", ");
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur !== prev + 1) {
      ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = cur;
    }
    prev = cur;
  }
  return ranges.join(", ");
};

export const BulkApplyPanel: React.FC<BulkApplyPanelProps> = ({
  slots,
  preset,
  customSelection,
  onPresetChange,
  onCustomSelectionChange,
  onApply,
  busy,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [skipExisting, setSkipExisting] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);

  // Compute target slots from preset / custom selection
  const targetSlots = useMemo<SlideSlot[]>(() => {
    switch (preset) {
      case "all":
        return slots;
      case "data":
        return slots.filter((s) => s.slide_type === "data");
      case "special":
        return slots.filter((s) => s.slide_type === "special");
      case "empty":
        return slots.filter((s) => !s.background_path);
      case "custom":
        return slots.filter((s) => customSelection.has(s.id));
      default:
        return [];
    }
  }, [preset, customSelection, slots]);

  const overlapCount = useMemo(
    () => targetSlots.filter((s) => !!s.background_path).length,
    [targetSlots],
  );

  const effectiveCount = skipExisting ? targetSlots.length - overlapCount : targetSlots.length;

  // Hydrate from session storage once slots are available
  useEffect(() => {
    if (hydratedRef.current || slots.length === 0) return;
    hydratedRef.current = true;
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (!raw) return;
      const s: PersistedState = JSON.parse(raw);
      if (s.expanded) setExpanded(true);
      if (s.preset) onPresetChange(s.preset);
      if (s.customSelection?.length) onCustomSelectionChange(new Set(s.customSelection));
      if (typeof s.skipExisting === "boolean") setSkipExisting(s.skipExisting);
      if (s.fileDataUrl && s.fileName && s.savedAt && Date.now() - s.savedAt < FILE_TTL_MS) {
        fetch(s.fileDataUrl)
          .then((r) => r.blob())
          .then((blob) => {
            const f = new File([blob], s.fileName!, { type: s.fileType || blob.type });
            setFile(f);
            setPreviewUrl(URL.createObjectURL(blob));
          })
          .catch(() => null);
      }
    } catch {
      /* ignore */
    }
  }, [slots, onPresetChange, onCustomSelectionChange]);

  // Persist on changes
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!expanded && !file && customSelection.size === 0) {
      sessionStorage.removeItem(SS_KEY);
      return;
    }
    const persist = async () => {
      let fileDataUrl: string | undefined;
      if (file) {
        fileDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
      const state: PersistedState = {
        preset,
        customSelection: Array.from(customSelection),
        expanded,
        skipExisting,
        fileName: file?.name,
        fileType: file?.type,
        fileDataUrl,
        savedAt: file ? Date.now() : undefined,
      };
      try {
        sessionStorage.setItem(SS_KEY, JSON.stringify(state));
      } catch {
        /* quota */
      }
    };
    persist();
  }, [preset, customSelection, expanded, skipExisting, file]);

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) return "Only PNG or JPG allowed";
    if (f.size > MAX_FILE_BYTES) return "File exceeds 5MB";
    return null;
  };

  const acceptFile = (f: File | null | undefined) => {
    if (!f) return;
    const err = validateFile(f);
    if (err) {
      // simple inline error via alert; toast wired in parent for apply errors
      alert(err);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleExpand = () => {
    setExpanded(true);
    if (preset !== "custom") onPresetChange("data"); // default
  };

  const handleCollapse = () => {
    setExpanded(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    onPresetChange("data");
    onCustomSelectionChange(new Set());
    sessionStorage.removeItem(SS_KEY);
  };

  const handleApplyClick = () => {
    if (!file || effectiveCount === 0) return;
    if (!skipExisting && overlapCount > 0) {
      setConfirmOpen(true);
      return;
    }
    void runApply();
  };

  const runApply = async () => {
    if (!file) return;
    setConfirmOpen(false);
    await onApply(file, targetSlots, skipExisting);
    handleCollapse();
  };

  const positions = targetSlots.map((s) => s.position);
  const summary = formatRanges(positions);

  if (!expanded) {
    return (
      <div className="rounded-xl border border-border bg-card/40 backdrop-blur-sm p-3">
        <button
          onClick={handleExpand}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/15 text-primary text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Apply to multiple slots
        </button>
      </div>
    );
  }

  const presetChip = (key: Preset, label: string, count: number | string) => {
    const active = preset === key;
    return (
      <button
        key={key}
        onClick={() => {
          onPresetChange(key);
          if (key !== "custom") onCustomSelectionChange(new Set());
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
          active
            ? "bg-primary/15 border-primary/60 text-primary"
            : "bg-background/60 border-border text-muted-foreground hover:bg-muted/40"
        }`}
      >
        {label}
        <span
          className={`text-[10px] ${active ? "text-primary/80" : "text-muted-foreground/70"}`}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          acceptFile(f);
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-primary/30 bg-card/60 backdrop-blur-sm p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Apply branded slide to multiple slots</h4>
          <button
            onClick={handleCollapse}
            className="p-1 rounded hover:bg-muted/40 text-muted-foreground"
            aria-label="Collapse"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-4">
          {/* Dropzone */}
          <div
            className="w-[180px] flex-shrink-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              acceptFile(e.dataTransfer.files?.[0]);
            }}
          >
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px]">Drop or click</span>
                </div>
              )}
            </div>
            {file && (
              <div className="mt-1 text-[10px] text-muted-foreground truncate" title={file.name}>
                {file.name}
              </div>
            )}
          </div>

          {/* Right side: presets + summary */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {presetChip("all", "All slides", slots.length)}
              {presetChip("data", "Data slides", slots.filter((s) => s.slide_type === "data").length)}
              {presetChip("special", "Special slides", slots.filter((s) => s.slide_type === "special").length)}
              {presetChip("empty", "Empty slots", slots.filter((s) => !s.background_path).length)}
              {presetChip("custom", "Custom selection", customSelection.size || "—")}
            </div>

            <div className="text-[11px] text-muted-foreground">
              <span className="text-foreground/70 font-medium">Selected:</span>{" "}
              {targetSlots.length > 0 ? (
                <>
                  Slides {summary} ({targetSlots.length} slots)
                </>
              ) : (
                "No slots selected"
              )}
            </div>

            <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={skipExisting}
                onChange={(e) => setSkipExisting(e.target.checked)}
                className="w-3.5 h-3.5 accent-primary"
              />
              Skip slots that already have a background
              {!skipExisting && overlapCount > 0 && (
                <span className="text-amber-400">
                  ({overlapCount} will be overwritten)
                </span>
              )}
            </label>

            <div className="flex justify-end">
              <button
                onClick={handleApplyClick}
                disabled={!file || effectiveCount === 0 || busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {effectiveCount === 0
                  ? "Apply"
                  : `Apply to ${effectiveCount} slot${effectiveCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Overwrite confirmation */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full rounded-xl border border-border bg-card p-5 space-y-3 shadow-xl"
            >
              <h3 className="text-sm font-semibold text-foreground">
                Replace {overlapCount} existing background{overlapCount === 1 ? "" : "s"}?
              </h3>
              <p className="text-xs text-muted-foreground">
                {overlapCount} of the {targetSlots.length} selected slots already have backgrounds.
                These will be overwritten with <span className="text-foreground">{file?.name}</span>.
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={runApply}
                  className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90"
                >
                  Replace {overlapCount} background{overlapCount === 1 ? "" : "s"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
