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

const BG_EMU_W = 9144000; // 10 inches
const BG_EMU_H = 5143500; // 5.625 inches (PPT 16:9 height as used by generator)

interface SlotBg {
  position: number;
  bytes: Uint8Array;
  contentType: string;
  ext: string;
}

async function downloadBlob(record: DiagnosticsExportRecord): Promise<Blob | null> {
  const { data, error } = await supabase.storage
    .from("diagnostics-exports")
    .download(record.storage_path);
  if (error || !data) return null;
  return data;
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
          const buf = await resp.arrayBuffer();
          const contentType = resp.headers.get("content-type") || "image/png";
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

/** Update the slide's _rels Relationship Target/Type for a given rId. */
function updateRelTarget(
  relsXml: string,
  rid: string,
  newTarget: string,
  newContentType: string,
): string {
  // newTarget is like "ppt/media/image1.png" — convert back to "../media/image1.png"
  const rel = newTarget.startsWith("ppt/")
    ? "../" + newTarget.slice(4)
    : newTarget;
  return relsXml.replace(
    new RegExp(`(<Relationship[^>]*Id="${rid}"[^>]*Target=")[^"]+(")`, "i"),
    `$1${rel}$2`,
  );
}

/** Ensure [Content_Types].xml has an override or default for the new image type. */
function ensureContentType(ctXml: string, ext: string, mime: string): string {
  if (new RegExp(`Extension="${ext}"`, "i").test(ctXml)) return ctXml;
  return ctXml.replace(
    /<Types[^>]*>/,
    (m) => `${m}<Default Extension="${ext}" ContentType="${mime}"/>`,
  );
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
  const original = await downloadBlob(record);
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

  let ctXml = await zip.file("[Content_Types].xml")!.async("string");
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

    // Replace the media binary with the new background. Keep the same
    // filename if extension matches, otherwise write a new file and
    // re-point the relationship.
    const currentExt = targetMedia.split(".").pop()?.toLowerCase();
    if (currentExt === slot.ext) {
      zip.file(targetMedia, slot.bytes);
    } else {
      const newPath = targetMedia.replace(/\.[^.]+$/, `.${slot.ext}`);
      // Remove old media (best-effort) and write new file
      zip.remove(targetMedia);
      zip.file(newPath, slot.bytes);
      const newRelsXml = updateRelTarget(relsXml, rid, newPath, slot.contentType);
      zip.file(relPath, newRelsXml);
      ctXml = ensureContentType(ctXml, slot.ext, slot.contentType);
    }
    swappedCount++;
  }

  zip.file("[Content_Types].xml", ctXml);

  if (swappedCount === 0) {
    throw new Error(
      "Couldn't locate any background images in this archive — it may have been generated before the Slide Layout Editor was enabled.",
    );
  }

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
  const base = originalName.replace(/\.pptx$/i, "");
  return `${base}_reskinned_${ts}.pptx`;
}
