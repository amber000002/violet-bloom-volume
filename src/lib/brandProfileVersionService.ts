import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { CoreBrandJSON, BrandDesignProfile } from "@/types/brandProfile";
import { computeCompletenessScore, mergeProfiles } from "@/lib/brandEnrichmentEngine";

// ===== HELPERS =====

function sanitizeTextForPostgres(value: string | null | undefined): string | null {
  if (value == null) return null;

  let cleaned = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);

    // Postgres JSONB/text cannot store NUL characters; they surface as
    // "unsupported Unicode escape sequence" when sent through JSON APIs.
    if (code === 0) continue;

    // Drop malformed surrogate halves while preserving valid emoji pairs.
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        cleaned += value[i] + value[i + 1];
        i++;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue;

    cleaned += value[i];
  }

  return cleaned;
}

function sanitizeJsonForPostgres<T>(value: T): T {
  if (typeof value === "string") return sanitizeTextForPostgres(value) as T;
  if (Array.isArray(value)) return value.map(item => sanitizeJsonForPostgres(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sanitizeJsonForPostgres(entry),
      ])
    ) as T;
  }
  return value;
}

export function normalizeHost(url: string): string {
  try {
    let host = url.replace(/^https?:\/\//, "").replace(/^www\./, "").toLowerCase().trim();
    // Strip path, query, and fragment — keep only the hostname
    host = host.split("/")[0].split("?")[0].split("#")[0];
    return host || url.toLowerCase().trim();
  } catch {
    return url.toLowerCase().trim();
  }
}

// ===== TYPES =====

export interface BrandProfileVersion {
  brandProfileVersionId: string;
  brandId: string;
  websiteUrlOriginal: string | null;
  websiteHostNormalized: string;
  extractionMethod: string;
  extractionVersion: string | null;
  sourceFingerprint: string | null;
  brandProfileJson: CoreBrandJSON;
  brandDesignProfileJson: BrandDesignProfile | null;
  confidence: string;
  status: string;
  generatedAt: string;
  notes: string | null;
}

// ===== ENSURE BRAND EXISTS =====

export async function ensureBrandProfile(params: {
  websiteUrl: string;
  industry: string;
  brandName?: string;
  eventSchemaCSV?: string;
  userPropertiesCSV?: string;
}): Promise<string> {
  const safeWebsiteUrl = sanitizeTextForPostgres(params.websiteUrl) || "";
  const safeIndustry = sanitizeTextForPostgres(params.industry) || "";
  const host = normalizeHost(safeWebsiteUrl);
  const industryNorm = safeIndustry.toLowerCase().trim();

  const { data: existing } = await supabase
    .from("brand_profiles")
    .select("brand_id")
    .eq("website_host_normalized", host)
    .eq("industry_selected", industryNorm)
    .maybeSingle();

  if (existing) {
    // Update schema CSVs if provided
    const updates: Record<string, string | null> = {};
    if (params.eventSchemaCSV) updates.event_schema_csv = sanitizeTextForPostgres(params.eventSchemaCSV);
    if (params.userPropertiesCSV) updates.user_properties_csv = sanitizeTextForPostgres(params.userPropertiesCSV);
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase.from("brand_profiles").update(updates).eq("brand_id", existing.brand_id);
      if (updateError) throw new Error(`Failed to update brand profile schema fields: ${updateError.message}`);
    }
    return existing.brand_id;
  }

  const { data: inserted, error } = await supabase
    .from("brand_profiles")
    .insert({
      website_url: safeWebsiteUrl,
      website_host_normalized: host,
      industry_selected: industryNorm,
      brand_name: sanitizeTextForPostgres(params.brandName) || null,
      event_schema_csv: sanitizeTextForPostgres(params.eventSchemaCSV) || null,
      user_properties_csv: sanitizeTextForPostgres(params.userPropertiesCSV) || null,
    })
    .select("brand_id")
    .single();

  if (error) throw new Error(`Failed to create brand profile: ${error.message}`);
  return inserted.brand_id;
}

// ===== CREATE VERSION =====

export async function createBrandProfileVersion(params: {
  brandId: string;
  websiteUrl: string;
  brandProfileJson: CoreBrandJSON;
  brandDesignProfileJson?: BrandDesignProfile | null;
  extractionMethod?: string;
  extractionVersion?: string;
  sourceFingerprint?: string;
  confidence?: string;
  status?: string;
  notes?: string;
}): Promise<string> {
  const safeWebsiteUrl = sanitizeTextForPostgres(params.websiteUrl) || "";
  const safeBrandProfileJson = sanitizeJsonForPostgres(params.brandProfileJson);
  const safeBrandDesignProfileJson = sanitizeJsonForPostgres(params.brandDesignProfileJson || null);
  const host = normalizeHost(safeWebsiteUrl);

  const { data, error } = await supabase
    .from("brand_profile_versions")
    .insert({
      brand_id: params.brandId,
      website_url_original: safeWebsiteUrl,
      website_host_normalized: host,
      extraction_method: sanitizeTextForPostgres(params.extractionMethod) || "url_crawl",
      extraction_version: sanitizeTextForPostgres(params.extractionVersion) || "1.0",
      source_fingerprint: sanitizeTextForPostgres(params.sourceFingerprint) || null,
      brand_profile_json: safeBrandProfileJson as unknown as Json,
      brand_design_profile_json: safeBrandDesignProfileJson as unknown as Json,
      confidence: sanitizeTextForPostgres(params.confidence) || "medium",
      status: sanitizeTextForPostgres(params.status) || "success",
      notes: sanitizeTextForPostgres(params.notes) || null,
    })
    .select("brand_profile_version_id")
    .single();

  if (error) throw new Error(`Failed to create brand profile version: ${error.message}`);

  const versionId = data.brand_profile_version_id;

  // Update brand_profiles with latest version pointer, brand name, scores
  const brandName = safeBrandProfileJson?.brand_identity?.brand_name;
  const completeness = computeCompletenessScore(safeBrandProfileJson);
  const { error: profileUpdateError } = await supabase
    .from("brand_profiles")
    .update({
      latest_brand_profile_version_id: versionId,
      brand_profile_json: safeBrandProfileJson as unknown as Json,
      brand_design_profile_json: safeBrandDesignProfileJson as unknown as Json,
      brand_name: brandName || null,
      website_url: safeWebsiteUrl,
      profile_completeness_score: completeness,
    })
    .eq("brand_id", params.brandId);
  if (profileUpdateError) throw new Error(`Failed to update saved brand profile: ${profileUpdateError.message}`);

  // Increment iteration_count
  const { data: currentProfile } = await supabase
    .from("brand_profiles")
    .select("iteration_count")
    .eq("brand_id", params.brandId)
    .maybeSingle();
  const currentCount = currentProfile?.iteration_count || 0;
  const { error: iterationError } = await supabase
    .from("brand_profiles")
    .update({ iteration_count: currentCount + 1 })
    .eq("brand_id", params.brandId);
  if (iterationError) throw new Error(`Failed to update brand profile iteration count: ${iterationError.message}`);

  return versionId;
}

// ===== LOAD BRAND PROFILE METADATA (completeness + iteration) =====

export async function loadBrandProfileMeta(params: {
  websiteUrl: string;
  industry: string;
}): Promise<{ brandId: string; completenessScore: number; iterationCount: number; lastUpdated: string; eventSchemaCSV: string | null; userPropertiesCSV: string | null } | null> {
  const host = normalizeHost(params.websiteUrl);
  const { data, error } = await supabase
    .from("brand_profiles")
    .select("brand_id, profile_completeness_score, iteration_count, updated_at, event_schema_csv, user_properties_csv")
    .eq("website_host_normalized", host)
    .eq("industry_selected", params.industry.toLowerCase().trim())
    .maybeSingle();

  if (error || !data) return null;
  const row = data as any;
  return {
    brandId: row.brand_id,
    completenessScore: row.profile_completeness_score || 0,
    iterationCount: row.iteration_count || 0,
    lastUpdated: row.updated_at,
    eventSchemaCSV: row.event_schema_csv || null,
    userPropertiesCSV: row.user_properties_csv || null,
  };
}

// ===== SAVE SCHEMA CSVs =====

export async function saveBrandSchemaCSVs(params: {
  websiteUrl: string;
  industry: string;
  eventSchemaCSV?: string;
  userPropertiesCSV?: string;
}): Promise<void> {
  const host = normalizeHost(params.websiteUrl);
  const updates: Record<string, any> = {};
  if (params.eventSchemaCSV !== undefined) updates.event_schema_csv = params.eventSchemaCSV || null;
  if (params.userPropertiesCSV !== undefined) updates.user_properties_csv = params.userPropertiesCSV || null;
  if (Object.keys(updates).length === 0) return;

  await supabase
    .from("brand_profiles")
    .update(updates)
    .eq("website_host_normalized", host)
    .eq("industry_selected", params.industry.toLowerCase().trim());
}

// ===== ENRICH EXISTING PROFILE =====

export async function enrichBrandProfile(params: {
  brandId: string;
  existingProfile: CoreBrandJSON;
  newProfile: CoreBrandJSON;
}): Promise<CoreBrandJSON> {
  return mergeProfiles(params.existingProfile, params.newProfile);
}

// ===== LOAD VERSIONS FOR A HOST =====

export async function loadBrandProfileVersions(params: {
  websiteUrl: string;
  industry: string;
}): Promise<BrandProfileVersion[]> {
  const host = normalizeHost(params.websiteUrl);

  const { data, error } = await supabase
    .from("brand_profile_versions" as any)
    .select("*")
    .eq("website_host_normalized", host)
    .order("generated_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return (data as any[]).map(row => ({
    brandProfileVersionId: row.brand_profile_version_id,
    brandId: row.brand_id,
    websiteUrlOriginal: row.website_url_original,
    websiteHostNormalized: row.website_host_normalized,
    extractionMethod: row.extraction_method,
    extractionVersion: row.extraction_version,
    sourceFingerprint: row.source_fingerprint,
    brandProfileJson: row.brand_profile_json as CoreBrandJSON,
    brandDesignProfileJson: row.brand_design_profile_json || null,
    confidence: row.confidence,
    status: row.status,
    generatedAt: row.generated_at,
    notes: row.notes,
  }));
}

// ===== LOAD ALL RECENT BRAND PROFILE VERSIONS (no filter) =====

export async function loadAllRecentBrandVersions(limit = 20): Promise<BrandProfileVersion[]> {
  const { data, error } = await supabase
    .from("brand_profile_versions" as any)
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as any[]).map(row => ({
    brandProfileVersionId: row.brand_profile_version_id,
    brandId: row.brand_id,
    websiteUrlOriginal: row.website_url_original,
    websiteHostNormalized: row.website_host_normalized,
    extractionMethod: row.extraction_method,
    extractionVersion: row.extraction_version,
    sourceFingerprint: row.source_fingerprint,
    brandProfileJson: row.brand_profile_json as CoreBrandJSON,
    brandDesignProfileJson: row.brand_design_profile_json || null,
    confidence: row.confidence,
    status: row.status,
    generatedAt: row.generated_at,
    notes: row.notes,
  }));
}

// ===== LOAD SINGLE VERSION =====

export async function loadBrandProfileVersionById(versionId: string): Promise<BrandProfileVersion | null> {
  const { data, error } = await supabase
    .from("brand_profile_versions" as any)
    .select("*")
    .eq("brand_profile_version_id", versionId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as any;

  return {
    brandProfileVersionId: row.brand_profile_version_id,
    brandId: row.brand_id,
    websiteUrlOriginal: row.website_url_original,
    websiteHostNormalized: row.website_host_normalized,
    extractionMethod: row.extraction_method,
    extractionVersion: row.extraction_version,
    sourceFingerprint: row.source_fingerprint,
    brandProfileJson: row.brand_profile_json as CoreBrandJSON,
    brandDesignProfileJson: row.brand_design_profile_json || null,
    confidence: row.confidence,
    status: row.status,
    generatedAt: row.generated_at,
    notes: row.notes,
  };
}
