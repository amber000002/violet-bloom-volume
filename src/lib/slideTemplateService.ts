import { supabase } from "@/integrations/supabase/client";

const BUCKET = "slide-template-backgrounds";

export interface SlideSlot {
  id: string;
  report_type: string;
  position: number;
  title: string;
  slide_type: "data" | "special";
  background_path: string | null;
  background_filename: string | null;
  background_width: number | null;
  background_height: number | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
  background_url?: string | null;
}

/** Default slot list for the Inbox Diagnostics deck (per PRD §8). */
export const DEFAULT_INBOX_DIAGNOSTICS_SLOTS: Array<Pick<SlideSlot, "position" | "title" | "slide_type">> = [
  { position: 1, title: "Title / hero", slide_type: "special" },
  { position: 2, title: "Campaign overview", slide_type: "data" },
  { position: 3, title: "Campaign overview by provider", slide_type: "data" },
  { position: 4, title: "Monthly overview", slide_type: "data" },
  { position: 5, title: "Email metrics trend", slide_type: "data" },
  { position: 6, title: "Infrastructure details", slide_type: "data" },
  { position: 7, title: "Google Postmaster Reputation", slide_type: "data" },
  { position: 8, title: "Google Postmaster Reputation (2)", slide_type: "data" },
  { position: 9, title: "Best performing campaigns – by open rate", slide_type: "data" },
  { position: 10, title: "Best performing campaigns – by CTR", slide_type: "data" },
  { position: 11, title: "Underperforming campaigns – by open rate", slide_type: "data" },
  { position: 12, title: "Underperforming campaigns – by CTR", slide_type: "data" },
  { position: 13, title: "Creative & Content Effectiveness Analysis", slide_type: "data" },
  { position: 14, title: "Creative Optimizations", slide_type: "data" },
  { position: 15, title: "Key Learnings & Recommendations", slide_type: "data" },
  { position: 16, title: "Thank You", slide_type: "special" },
];

export const REPORT_TYPES = {
  INBOX_DIAGNOSTICS: "inbox-diagnostics",
} as const;

const publicUrl = (path: string | null): string | null => {
  if (!path) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
};

/** Fetch all slots for a report type. Seeds defaults if table is empty for that report. */
export async function fetchSlots(reportType: string = REPORT_TYPES.INBOX_DIAGNOSTICS): Promise<SlideSlot[]> {
  const { data, error } = await supabase
    .from("slide_template_slots")
    .select("*")
    .eq("report_type", reportType)
    .order("position", { ascending: true });

  if (error) throw error;

  if (!data || data.length === 0) {
    if (reportType === REPORT_TYPES.INBOX_DIAGNOSTICS) {
      await seedDefaultSlots();
      return fetchSlots(reportType);
    }
    return [];
  }

  return (data as SlideSlot[]).map((s) => ({
    ...s,
    slide_type: (s.slide_type === "special" ? "special" : "data") as "data" | "special",
    background_url: publicUrl(s.background_path),
  }));
}

/** Seed the default 16 inbox-diagnostics slots (idempotent via unique constraint). */
export async function seedDefaultSlots(): Promise<void> {
  const rows = DEFAULT_INBOX_DIAGNOSTICS_SLOTS.map((s) => ({
    report_type: REPORT_TYPES.INBOX_DIAGNOSTICS,
    position: s.position,
    title: s.title,
    slide_type: s.slide_type,
  }));
  // Insert each separately to gracefully ignore conflicts
  for (const row of rows) {
    await supabase.from("slide_template_slots").upsert(row, { onConflict: "report_type,position" });
  }
}

/** Upload a background image to storage and update the slot record. */
export async function uploadSlotBackground(
  slot: SlideSlot,
  file: File,
): Promise<SlideSlot> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${slot.report_type}/slot-${String(slot.position).padStart(2, "0")}-${Date.now()}.${ext}`;

  // If there's an existing background, remove it first (best-effort).
  if (slot.background_path) {
    await supabase.storage.from(BUCKET).remove([slot.background_path]).catch(() => null);
  }

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "image/png", upsert: true });
  if (upErr) throw upErr;

  // Read dimensions client-side
  const dims = await readImageDimensions(file).catch(() => ({ width: 1920, height: 1080 }));

  const { data: updated, error: updErr } = await supabase
    .from("slide_template_slots")
    .update({
      background_path: path,
      background_filename: file.name,
      background_width: dims.width,
      background_height: dims.height,
      file_size_bytes: file.size,
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", slot.id)
    .select()
    .single();
  if (updErr) throw updErr;

  return { ...(updated as SlideSlot), background_url: publicUrl(updated.background_path) };
}

export interface BulkApplyResult {
  applied: SlideSlot[];
  skipped: SlideSlot[];
  failed: Array<{ slot: SlideSlot; error: string }>;
}

/**
 * Upload one image once and apply it to many slots. Each slot gets its own
 * storage object (so individual replacement/removal stays clean), but the
 * source File is read just once.
 */
export async function bulkUploadSlotBackgrounds(
  slots: SlideSlot[],
  file: File,
  options: { skipExisting: boolean },
): Promise<BulkApplyResult> {
  const result: BulkApplyResult = { applied: [], skipped: [], failed: [] };
  const dims = await readImageDimensions(file).catch(() => ({ width: 1920, height: 1080 }));

  for (const slot of slots) {
    if (options.skipExisting && slot.background_path) {
      result.skipped.push(slot);
      continue;
    }
    try {
      const updated = await uploadSlotBackground(slot, file);
      result.applied.push({ ...updated, background_width: dims.width, background_height: dims.height });
    } catch (e) {
      result.failed.push({ slot, error: (e as Error)?.message || "Upload failed" });
    }
  }
  return result;
}

/** Restore many slots to a previous state (used by Undo on bulk apply). */
export async function restoreSlotsToSnapshot(snapshots: SlideSlot[]): Promise<SlideSlot[]> {
  const restored: SlideSlot[] = [];
  for (const snap of snapshots) {
    const { data, error } = await supabase
      .from("slide_template_slots")
      .update({
        background_path: snap.background_path,
        background_filename: snap.background_filename,
        background_width: snap.background_width,
        background_height: snap.background_height,
        file_size_bytes: snap.file_size_bytes,
        uploaded_at: snap.uploaded_at,
      })
      .eq("id", snap.id)
      .select()
      .single();
    if (!error && data) {
      restored.push({ ...(data as SlideSlot), background_url: publicUrl(data.background_path) });
    }
  }
  return restored;
}

/** Clear a slot's background (storage + DB). */
export async function removeSlotBackground(slot: SlideSlot): Promise<SlideSlot> {
  if (slot.background_path) {
    await supabase.storage.from(BUCKET).remove([slot.background_path]).catch(() => null);
  }
  const { data: updated, error } = await supabase
    .from("slide_template_slots")
    .update({
      background_path: null,
      background_filename: null,
      background_width: null,
      background_height: null,
      file_size_bytes: null,
      uploaded_at: null,
    })
    .eq("id", slot.id)
    .select()
    .single();
  if (error) throw error;
  return { ...(updated as SlideSlot), background_url: null };
}

/** Fetch and base64-encode all backgrounds for the generator. Keyed by position. */
export async function fetchSlotBackgroundsBase64(
  reportType: string = REPORT_TYPES.INBOX_DIAGNOSTICS,
): Promise<Record<number, string>> {
  const slots = await fetchSlots(reportType);
  const result: Record<number, string> = {};
  await Promise.all(
    slots
      .filter((s) => s.background_url)
      .map(async (s) => {
        try {
          const resp = await fetch(s.background_url!);
          if (!resp.ok) return;
          const buf = await resp.arrayBuffer();
          const mime = resp.headers.get("content-type") || "image/png";
          result[s.position] = `data:${mime};base64,${arrayBufferToBase64(buf)}`;
        } catch {
          /* best-effort */
        }
      }),
  );
  return result;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let out = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as unknown as number[]);
  }
  return btoa(out);
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
