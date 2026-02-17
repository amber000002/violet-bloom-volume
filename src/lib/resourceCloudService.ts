/**
 * Cloud persistence layer for Resource Library JSON files.
 * Uses resource_library_items table + resource-library storage bucket.
 * Supports SHA-256 checksum dedup, soft-delete, and auto-resolve by industry.
 */
import { supabase } from "@/integrations/supabase/client";
import { JSONResourceFile, JSONUseCase, IndustryRelevance } from "@/types/resources";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000000";
const BUCKET = "resource-library";

export interface ResourceLibraryItem {
  id: string;
  org_id: string;
  resource_type: string;
  industry: string | null;
  framework: string | null;
  display_name: string;
  file_path: string;
  schema_version: string | null;
  source: string | null;
  version: string | null;
  last_updated: string | null;
  checksum_sha256: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ===== LOGGING =====
function log(event: string, details: Record<string, unknown>) {
  console.log(`[ResourceCloud] ${event}`, details);
}

// ===== SHA-256 CHECKSUM =====
async function computeSHA256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ===== VALIDATION =====
export function validateLifecycleJSON(json: JSONResourceFile): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!json.metadata) errors.push("Missing 'metadata' block");
  if (!json.use_cases || !Array.isArray(json.use_cases)) {
    errors.push("Missing or invalid 'use_cases' array");
    return { valid: false, errors };
  }
  for (const uc of json.use_cases) {
    if (!uc.industry) errors.push(`Use case "${uc.name || uc.use_case_id}" missing 'industry'`);
    if (!uc.stage) errors.push(`Use case "${uc.name || uc.use_case_id}" missing 'stage'`);
    if (!uc.channels || uc.channels.length === 0) errors.push(`Use case "${uc.name || uc.use_case_id}" missing 'channels'`);
  }
  const validCount = json.use_cases.filter(uc => uc.industry && uc.stage).length;
  return { valid: validCount > 0, errors };
}

// ===== DETERMINE INDUSTRY =====
function determineIndustry(useCases: JSONUseCase[]): string | null {
  const industries = new Set<string>();
  for (const uc of useCases) {
    if (uc.industry) industries.add(uc.industry.toLowerCase().trim());
  }
  if (industries.size === 0) return null;
  if (industries.size === 1) return [...industries][0];
  return "multi";
}

// ===== DETERMINE FRAMEWORK =====
function determineFramework(useCases: JSONUseCase[]): string | null {
  const frameworks = new Set<string>();
  for (const uc of useCases) {
    if (uc.framework) frameworks.add(uc.framework.toLowerCase().trim());
  }
  if (frameworks.size === 1) return [...frameworks][0];
  return null;
}

// ===== UPLOAD =====
export async function uploadResourceJSON(
  json: JSONResourceFile,
  orgId: string = DEFAULT_ORG_ID
): Promise<{ success: boolean; error?: string; item?: ResourceLibraryItem; alreadyExists?: boolean }> {
  const rawContent = JSON.stringify(json, null, 2);
  const resourceType = "internal_use_case_json";

  log("resource_upload_started", { orgId, source: json.metadata?.source });

  try {
    // 1. Compute checksum
    const checksum = await computeSHA256(rawContent);
    log("resource_upload_validated", { checksum, resourceType });

    // 2. Check for existing duplicate
    const { data: existing } = await supabase
      .from("resource_library_items")
      .select("*")
      .eq("org_id", orgId)
      .eq("resource_type", resourceType)
      .eq("checksum_sha256", checksum)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      log("resource_upload_complete", { status: "already_exists", id: existing.id });
      return { success: true, item: existing as ResourceLibraryItem, alreadyExists: true };
    }

    // 3. Build storage path
    const sanitizedSource = (json.metadata?.source || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const filePath = `org/${orgId}/resources/${resourceType}/${sanitizedSource}_${Date.now()}.json`;

    // 4. Upload to storage
    const blob = new Blob([rawContent], { type: "application/json" });
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, blob, { contentType: "application/json", upsert: false });

    if (uploadError) {
      log("resource_upload_storage_failed", { error: uploadError.message });
      return { success: false, error: `Storage upload failed: ${uploadError.message}` };
    }
    log("resource_upload_storage_written", { filePath });

    // 5. Extract metadata
    const industry = determineIndustry(json.use_cases);
    const framework = determineFramework(json.use_cases);
    const displayName = json.metadata?.source || sanitizedSource;

    // 6. Insert DB record
    const { data: record, error: insertError } = await supabase
      .from("resource_library_items")
      .insert([{
        org_id: orgId,
        resource_type: resourceType,
        industry,
        framework,
        display_name: displayName,
        file_path: filePath,
        schema_version: "1.0",
        source: json.metadata?.source || null,
        version: json.metadata?.version || null,
        last_updated: json.metadata?.last_updated || null,
        checksum_sha256: checksum,
        is_active: true,
      }])
      .select()
      .single();

    if (insertError) {
      // Rollback: delete the uploaded file
      log("resource_upload_db_failed", { error: insertError.message });
      await supabase.storage.from(BUCKET).remove([filePath]);
      return { success: false, error: `DB insert failed: ${insertError.message}` };
    }

    log("resource_upload_db_written", { id: record.id });
    log("resource_upload_complete", { id: record.id, filePath, checksum });

    return { success: true, item: record as ResourceLibraryItem };
  } catch (err: any) {
    log("resource_upload_error", { error: err.message });
    return { success: false, error: err.message };
  }
}

// ===== FETCH ALL ACTIVE ITEMS =====
export async function fetchResourceLibraryItems(
  orgId: string = DEFAULT_ORG_ID
): Promise<ResourceLibraryItem[]> {
  const { data, error } = await supabase
    .from("resource_library_items")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch resource_library_items:", error);
    return [];
  }
  return (data || []) as ResourceLibraryItem[];
}

// ===== SOFT DELETE =====
export async function softDeleteResourceItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("resource_library_items")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Failed to soft-delete resource:", error);
    return false;
  }
  return true;
}

// ===== DOWNLOAD JSON FROM STORAGE =====
export async function downloadResourceJSON(filePath: string): Promise<JSONResourceFile | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(filePath);

    if (error || !data) {
      console.error("Failed to download resource:", error);
      return null;
    }

    const text = await data.text();
    return JSON.parse(text) as JSONResourceFile;
  } catch (err) {
    console.error("Failed to parse downloaded resource:", err);
    return null;
  }
}

// ===== RESOLVE BEST RESOURCE FOR INDUSTRY =====
export async function resolveResourceForIndustry(
  industry: string,
  orgId: string = DEFAULT_ORG_ID
): Promise<JSONResourceFile | null> {
  const normalizedIndustry = industry.toLowerCase().trim();

  // Query items matching industry or "multi"
  const { data, error } = await supabase
    .from("resource_library_items")
    .select("*")
    .eq("org_id", orgId)
    .eq("resource_type", "internal_use_case_json")
    .eq("is_active", true)
    .or(`industry.eq.${normalizedIndustry},industry.eq.multi`)
    .order("last_updated", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  const best = data[0] as ResourceLibraryItem;
  return downloadResourceJSON(best.file_path);
}

// ===== LEGACY COMPAT EXPORTS =====
// Keep old function signatures working during transition
export type ResourceFileRecord = ResourceLibraryItem;
export const fetchResourceFileRecords = fetchResourceLibraryItems;
export const filterRecordsByIndustry = (records: ResourceLibraryItem[], industry: string) => {
  const norm = industry.toLowerCase().trim();
  return records.filter(r => r.industry === norm || r.industry === "multi");
};
