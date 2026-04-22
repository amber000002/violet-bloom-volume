// Reuse an archived .pptx by swapping its slide backgrounds with the
// current Slide Layout Editor templates. The original generator places the
// background as the FIRST <p:pic> on each slide (full-bleed at x=0, y=0,
// EMU 9144000 x 5143500). We locate that pic, follow its r:embed → media
// file, and overwrite the binary with the new template image.
//
// This intentionally avoids regenerating content (we don't have the source
// CSV anymore) — it just refreshes the visual chrome.

import JSZip from "jszip";
import { fetchSlots, REPORT_TYPES, SlideSlot } from "./slideTemplateService";
import { supabase } from "@/integrations/supabase/client";
import { DiagnosticsExportRecord } from "./diagnosticsExportRepository";

interface SlotBg {
  position: number;
  bytes: Uint8Array;
  contentType: string;
  ext: string;
  /** Object URL or data URL we can re-decode for transcoding. */
  blobUrl: string;
}

/**
 * Transcode an image (given as object/blob URL) into a target format
 * (png | jpg | jpeg | gif | webp | bmp). Returns Uint8Array bytes.
 * This lets us swap a JPG template into a slot that originally held a PNG
 * without having to rewrite [Content_Types].xml or relationship targets,
 * which is the safest way to keep PowerPoint happy.
 */
async function transcodeImage(
  blobUrl: string,
  targetExt: string,
): Promise<Uint8Array> {
  const ext = targetExt.toLowerCase();
  const mime =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "gif"
        ? "image/png" // gif encoding not supported by canvas; fall back to png bytes (PPT will still render)
        : ext === "webp"
          ? "image/webp"
          : ext === "bmp"
            ? "image/bmp"
            : "image/png";

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Failed to decode template image"));
    el.src = blobUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || 1920;
  canvas.height = img.naturalHeight || 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // For JPG, fill white background since JPEG has no alpha.
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      mime,
      mime === "image/jpeg" ? 0.92 : undefined,
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function downloadBlob(record: DiagnosticsExportRecord): Promise<Blob | null> {
  const { data, error } = await supabase.storage
    .from("diagnostics-exports")
    .download(record.storage_path);
  if (error || !data) return null;
  return data;
}

function isReskinnedFileName(fileName: string): boolean {
  return /_reskinned_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/i.test(fileName);
}

async function resolveReuseBaseRecord(
  record: DiagnosticsExportRecord,
): Promise<DiagnosticsExportRecord> {
  if (!record.source_file_name || !isReskinnedFileName(record.file_name)) {
    return record;
  }

  let query = supabase
    .from("diagnostics_exports")
    .select("*")
    .eq("source_file_name", record.source_file_name)
    .eq("report_type", record.report_type)
    .not("file_name", "ilike", "%_reskinned_%")
    .order("created_at", { ascending: false })
    .limit(1);

  if (record.website_host_normalized) {
    query = query.eq("website_host_normalized", record.website_host_normalized);
  }

  const { data, error } = await query;
  if (error || !data?.length) return record;
  return data[0] as DiagnosticsExportRecord;
}

async function loadSlotBackgrounds(): Promise<Map<number, SlotBg>> {
  const slots: SlideSlot[] = await fetchSlots(REPORT_TYPES.INBOX_DIAGNOSTICS);
  const map = new Map<number, SlotBg>();
  await Promise.all(
    slots
      .filter((s) => s.background_url)
      .map(async (s) => {
        try {
          const resp = await fetch(s.background_url!);
          if (!resp.ok) return;
          const blob = await resp.blob();
          const buf = await blob.arrayBuffer();
          const contentType = blob.type || resp.headers.get("content-type") || "image/png";
          const ext =
            contentType.includes("jpeg") || contentType.includes("jpg")
              ? "jpg"
              : contentType.includes("webp")
                ? "webp"
                : "png";
          map.set(s.position, {
            position: s.position,
            bytes: new Uint8Array(buf),
            contentType,
            ext,
            blobUrl: URL.createObjectURL(blob),
          });
        } catch {
          /* skip */
        }
      }),
  );
  return map;
}

/** Get list of slide files in a pptx, ordered by slide number. */
function listSlideFiles(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml$/)![1], 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml$/)![1], 10);
      return na - nb;
    });
}

/**
 * In a slide XML, locate the first <p:pic> whose <a:ext cx="9144000" cy="5143500">
 * — that's the full-bleed background — and return the rId of its blip embed.
 */
function findBackgroundEmbedRid(slideXml: string): string | null {
  // Iterate <p:pic> blocks and check for the background dimensions.
  const picRegex = /<p:pic[\s\S]*?<\/p:pic>/g;
  let m: RegExpExecArray | null;
  while ((m = picRegex.exec(slideXml)) !== null) {
    const block = m[0];
    // Background extents: cx=9144000 cy=5143500 (or cy=6858000 for full 7.5")
    const hasBgExt =
      /<a:ext\s+cx="9144000"\s+cy="(?:5143500|6858000)"/.test(block) &&
      /<a:off\s+x="0"\s+y="0"/.test(block);
    if (hasBgExt) {
      const rid = block.match(/<a:blip[^>]*r:embed="([^"]+)"/);
      if (rid) return rid[1];
    }
  }
  return null;
}

/** Resolve an rId from a slide's _rels file → target media path (relative). */
function resolveRidTarget(relsXml: string, rid: string): string | null {
  const re = new RegExp(
    `<Relationship[^>]*Id="${rid}"[^>]*Target="([^"]+)"`,
    "i",
  );
  const m = relsXml.match(re);
  if (!m) return null;
  // Targets are like "../media/image1.png"
  let target = m[1];
  if (target.startsWith("../")) target = target.slice(3);
  return `ppt/${target}`;
}

/**
 * Rewrite an archived .pptx with new slide backgrounds from the current
 * Slide Layout Editor. Returns a Blob ready to download.
 */
export async function reusePptWithCurrentTemplate(
  record: DiagnosticsExportRecord,
  onStatus?: (msg: string) => void,
): Promise<Blob> {
  onStatus?.("Loading archived report…");
  const baseRecord = await resolveReuseBaseRecord(record);
  if (baseRecord.id !== record.id) {
    onStatus?.("Using the clean source archive before applying current templates…");
  }

  const original = await downloadBlob(baseRecord);
  if (!original) throw new Error("Could not fetch original PPT from repository");

  onStatus?.("Loading current template…");
  const slotBgs = await loadSlotBackgrounds();
  if (slotBgs.size === 0) {
    throw new Error(
      "No slide backgrounds configured in the Resource Library yet. Upload at least one background and try again.",
    );
  }

  onStatus?.("Rebuilding presentation…");
  const zip = await JSZip.loadAsync(await original.arrayBuffer());
  const slidePaths = listSlideFiles(zip);

  let swappedCount = 0;

  for (let i = 0; i < slidePaths.length; i++) {
    const position = i + 1; // 1-indexed
    const slot = slotBgs.get(position);
    if (!slot) continue;

    const slidePath = slidePaths[i];
    const relPath = slidePath.replace(
      /ppt\/slides\/(slide\d+\.xml)/,
      "ppt/slides/_rels/$1.rels",
    );
    const slideXml = await zip.file(slidePath)!.async("string");
    const relsFile = zip.file(relPath);
    if (!relsFile) continue;
    const relsXml = await relsFile.async("string");

    const rid = findBackgroundEmbedRid(slideXml);
    if (!rid) continue;
    const targetMedia = resolveRidTarget(relsXml, rid);
    if (!targetMedia) continue;

    // Always transcode the new background to match the original media's
    // extension and write it back to the SAME path. This avoids any need to
    // touch [Content_Types].xml or relationship targets — the safest path
    // to keep PowerPoint from flagging the file as corrupted.
    const currentExt = (targetMedia.split(".").pop() || "png").toLowerCase();
    let bytes: Uint8Array;
    if (currentExt === slot.ext) {
      bytes = slot.bytes;
    } else {
      try {
        bytes = await transcodeImage(slot.blobUrl, currentExt);
      } catch (e) {
        console.warn("[reuse] transcode failed, falling back to raw bytes", e);
        bytes = slot.bytes;
      }
    }
    zip.file(targetMedia, bytes);
    swappedCount++;
  }

  if (swappedCount === 0) {
    throw new Error(
      "Couldn't locate any background images in this archive — it may have been generated before the Slide Layout Editor was enabled.",
    );
  }

  // Release object URLs we created for transcoding.
  slotBgs.forEach((s) => {
    try { URL.revokeObjectURL(s.blobUrl); } catch { /* noop */ }
  });

  onStatus?.(`Updated ${swappedCount} slide background${swappedCount === 1 ? "" : "s"}.`);
  return await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    compression: "DEFLATE",
  });
}

/** Trigger a browser download for a regenerated PPT blob. */
export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Suggest a filename for the regenerated PPT. */
export function buildReusedFileName(originalName: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const base = originalName
    .replace(/\.pptx$/i, "")
    .replace(/(_reskinned_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})+$/i, "");
  return `${base}_reskinned_${ts}.pptx`;
}
