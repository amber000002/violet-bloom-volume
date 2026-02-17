/**
 * Cloud persistence layer for Resource Library JSON files.
 * Stores raw JSON in storage bucket + parsed index in resource_files table.
 * Auto-resolves matching resources by industry.
 */
import { supabase } from "@/integrations/supabase/client";
import { JSONResourceFile, JSONUseCase, IndustryRelevance } from "@/types/resources";

export interface ResourceFileRecord {
  id: string;
  file_path: string;
  source_name: string;
  version: string | null;
  industries: string[];
  stages: string[];
  channels: string[];
  use_case_count: number;
  resource_category: string;
  raw_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/** Extract metadata index from a parsed JSON resource */
function extractIndex(json: JSONResourceFile) {
  const industries = new Set<string>();
  const stages = new Set<string>();
  const channels = new Set<string>();
  let useCaseCount = 0;

  for (const uc of json.use_cases) {
    if (!uc.use_case_id || !uc.name) continue;
    useCaseCount++;
    if (uc.industry) industries.add(uc.industry);
    if (uc.stage) stages.add(uc.stage.toLowerCase().trim().replace(/\s+/g, "-"));
    if (uc.channels) uc.channels.forEach(ch => channels.add(ch.toLowerCase()));
  }

  return {
    industries: Array.from(industries),
    stages: Array.from(stages),
    channels: Array.from(channels),
    useCaseCount,
  };
}

/** Validate JSON matches lifecycle use case resource schema */
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
  // Allow partial validity - only fail if ALL use cases are invalid
  const validCount = json.use_cases.filter(uc => uc.industry && uc.stage).length;
  return { valid: validCount > 0, errors };
}

/** Upload raw JSON to storage and insert/update index record */
export async function uploadResourceJSON(json: JSONResourceFile): Promise<{ success: boolean; error?: string; record?: ResourceFileRecord }> {
  try {
    const source = json.metadata?.source || "unknown";
    const sanitizedSource = source.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const filePath = `resources/${sanitizedSource}_${Date.now()}.json`;

    // Upload raw JSON to storage
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const { error: uploadError } = await supabase.storage
      .from("usecases")
      .upload(filePath, blob, { contentType: "application/json", upsert: false });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { success: false, error: `Storage upload failed: ${uploadError.message}` };
    }

    // Extract index
    const index = extractIndex(json);

    // Insert index record
    const { data, error: insertError } = await supabase
      .from("resource_files")
      .insert([{
        file_path: filePath,
        source_name: source,
        version: json.metadata?.version || null,
        industries: index.industries,
        stages: index.stages,
        channels: index.channels,
        use_case_count: index.useCaseCount,
        resource_category: "lifecycle_use_case_library",
        raw_metadata: json.metadata as any,
      }])
      .select()
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError);
      return { success: false, error: `Index insert failed: ${insertError.message}` };
    }

    return { success: true, record: data as ResourceFileRecord };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Fetch all resource file index records */
export async function fetchResourceFileRecords(): Promise<ResourceFileRecord[]> {
  const { data, error } = await supabase
    .from("resource_files")
    .select("*")
    .eq("resource_category", "lifecycle_use_case_library")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch resource_files:", error);
    return [];
  }
  return (data || []) as ResourceFileRecord[];
}

/** Generic industry bucket list for cross-industry matching */
const GENERIC_INDUSTRIES = ["generic", "all"];

/** Find resource files that match a given industry */
export function filterRecordsByIndustry(records: ResourceFileRecord[], industry: string): ResourceFileRecord[] {
  const normalizedIndustry = industry.toLowerCase().trim();
  return records.filter(r =>
    r.industries.some(ind => ind === normalizedIndustry || GENERIC_INDUSTRIES.includes(ind))
  );
}

/** Download and parse a JSON file from storage */
export async function downloadResourceJSON(filePath: string): Promise<JSONResourceFile | null> {
  try {
    const { data, error } = await supabase.storage
      .from("usecases")
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

/** Resolve the best matching JSON for an industry: most recently uploaded matching file */
export async function resolveResourceForIndustry(industry: string): Promise<JSONResourceFile | null> {
  const records = await fetchResourceFileRecords();
  const matching = filterRecordsByIndustry(records, industry);

  if (matching.length === 0) return null;

  // Use most recently uploaded
  const best = matching[0]; // already sorted by created_at desc
  return downloadResourceJSON(best.file_path);
}
