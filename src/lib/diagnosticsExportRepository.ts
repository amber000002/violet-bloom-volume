// Repository service for Inbox Diagnostics PPT exports.
// Persists generated .pptx files in Lovable Cloud Storage and tracks them
// in the `diagnostics_exports` table so users can re-download or re-load
// previous reports.

import { supabase } from "@/integrations/supabase/client";

const BUCKET = "diagnostics-exports";

export interface DiagnosticsExportRecord {
  id: string;
  file_name: string;
  storage_path: string;
  brand_name: string | null;
  industry: string | null;
  website_host_normalized: string | null;
  source_file_name: string | null;
  month_range: string | null;
  report_type: string;
  file_size_bytes: number | null;
  created_at: string;
  campaign_csv_path: string | null;
  postmaster_csv_path: string | null;
  context_text: string | null;
}

export interface SaveExportParams {
  blob: Blob;
  fileName: string;
  brandName?: string | null;
  industry?: string | null;
  websiteUrl?: string | null;
  sourceFileName?: string | null;
  monthRange?: string | null;
  reportType?: string;
  /** Raw text of the campaign performance CSV to archive for future reload. */
  campaignCsvText?: string | null;
  /** Raw text of the optional Postmaster Tools CSV to archive for future reload. */
  postmasterCsvText?: string | null;
  /** Optional analyst-supplied context note to archive with the report. */
  contextText?: string | null;
}

export interface LoadedExportSources {
  campaignCsvText: string | null;
  postmasterCsvText: string | null;
  contextText: string | null;
}

function normalizeHost(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = url.startsWith("http") ? new URL(url) : new URL(`https://${url}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function sanitizeForPath(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
}

/**
 * Upload a generated PPT blob to storage and create a registry row.
 * Failures are swallowed (returns null) so the user-facing download is
 * never blocked by repository errors.
 */
export async function saveDiagnosticsExport(
  params: SaveExportParams
): Promise<DiagnosticsExportRecord | null> {
  const { blob, fileName } = params;
  const host = normalizeHost(params.websiteUrl);
  const industryKey = params.industry?.trim().toLowerCase().replace(/\s+/g, "-") || "general";
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = sanitizeForPath(fileName.replace(/\.pptx$/i, ""));
  const storagePath = `${industryKey}/${host || "unknown-host"}/${ts}_${safeName}.pptx`;

  try {
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, blob, {
        contentType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        upsert: false,
      });
    if (uploadErr) {
      console.warn("[diagnosticsExportRepository] upload failed", uploadErr);
      return null;
    }

    // Upload source CSVs alongside the PPT so the report can be reloaded later.
    let campaignCsvPath: string | null = null;
    let postmasterCsvPath: string | null = null;

    if (params.campaignCsvText && params.campaignCsvText.trim().length > 0) {
      const path = `${industryKey}/${host || "unknown-host"}/${ts}_${safeName}__campaign.csv`;
      const { error: csvErr } = await supabase.storage.from(BUCKET).upload(
        path,
        new Blob([params.campaignCsvText], { type: "text/csv" }),
        { contentType: "text/csv", upsert: false },
      );
      if (!csvErr) campaignCsvPath = path;
      else console.warn("[diagnosticsExportRepository] campaign csv upload failed", csvErr);
    }

    if (params.postmasterCsvText && params.postmasterCsvText.trim().length > 0) {
      const path = `${industryKey}/${host || "unknown-host"}/${ts}_${safeName}__postmaster.csv`;
      const { error: csvErr } = await supabase.storage.from(BUCKET).upload(
        path,
        new Blob([params.postmasterCsvText], { type: "text/csv" }),
        { contentType: "text/csv", upsert: false },
      );
      if (!csvErr) postmasterCsvPath = path;
      else console.warn("[diagnosticsExportRepository] postmaster csv upload failed", csvErr);
    }

    const { data, error: insertErr } = await supabase
      .from("diagnostics_exports")
      .insert({
        file_name: fileName,
        storage_path: storagePath,
        brand_name: params.brandName ?? null,
        industry: params.industry ?? null,
        website_host_normalized: host,
        source_file_name: params.sourceFileName ?? null,
        month_range: params.monthRange ?? null,
        report_type: params.reportType ?? "analysis",
        file_size_bytes: blob.size,
        campaign_csv_path: campaignCsvPath,
        postmaster_csv_path: postmasterCsvPath,
        context_text: params.contextText ?? null,
      })
      .select()
      .single();

    if (insertErr) {
      console.warn("[diagnosticsExportRepository] insert failed", insertErr);
      // Roll back uploads so we don't leave orphaned files
      const toRemove = [storagePath];
      if (campaignCsvPath) toRemove.push(campaignCsvPath);
      if (postmasterCsvPath) toRemove.push(postmasterCsvPath);
      await supabase.storage.from(BUCKET).remove(toRemove);
      return null;
    }

    return data as DiagnosticsExportRecord;
  } catch (err) {
    console.warn("[diagnosticsExportRepository] unexpected error", err);
    return null;
  }
}

/**
 * Fetch all exports, most recent first. If `industry` is provided, results
 * are scoped to that industry (case-insensitive); otherwise returns global.
 */
export async function listDiagnosticsExports(
  industry?: string | null,
  limit: number = 100
): Promise<DiagnosticsExportRecord[]> {
  let query = supabase
    .from("diagnostics_exports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (industry && industry.trim()) {
    query = query.ilike("industry", industry.trim());
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[diagnosticsExportRepository] list failed", error);
    return [];
  }
  return (data || []) as DiagnosticsExportRecord[];
}

/**
 * Trigger a download of a stored export by streaming the blob to the user.
 */
export async function downloadDiagnosticsExport(
  record: DiagnosticsExportRecord
): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(record.storage_path);
    if (error || !data) {
      console.warn("[diagnosticsExportRepository] download failed", error);
      return false;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = record.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.warn("[diagnosticsExportRepository] download error", err);
    return false;
  }
}

/**
 * Delete a stored export (file + registry row).
 */
export async function deleteDiagnosticsExport(
  record: DiagnosticsExportRecord
): Promise<boolean> {
  try {
    await supabase.storage.from(BUCKET).remove([record.storage_path]);
    const { error } = await supabase
      .from("diagnostics_exports")
      .delete()
      .eq("id", record.id);
    if (error) {
      console.warn("[diagnosticsExportRepository] delete failed", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[diagnosticsExportRepository] delete error", err);
    return false;
  }
}
