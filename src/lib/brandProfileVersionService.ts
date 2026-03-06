import { supabase } from "@/integrations/supabase/client";
import { CoreBrandJSON, BrandDesignProfile } from "@/types/brandProfile";
import { computeCompletenessScore, mergeProfiles } from "@/lib/brandEnrichmentEngine";

// ===== HELPERS =====

export function normalizeHost(url: string): string {
  try {
    let host = url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "").toLowerCase().trim();
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
}): Promise<string> {
  const host = normalizeHost(params.websiteUrl);
  const industryNorm = params.industry.toLowerCase().trim();

  const { data: existing } = await supabase
    .from("brand_profiles")
    .select("brand_id")
    .eq("website_host_normalized", host)
    .eq("industry_selected", industryNorm)
    .maybeSingle();

  if (existing) return existing.brand_id;

  const { data: inserted, error } = await supabase
    .from("brand_profiles")
    .insert({
      website_url: params.websiteUrl,
      website_host_normalized: host,
      industry_selected: industryNorm,
      brand_name: params.brandName || null,
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
  const host = normalizeHost(params.websiteUrl);

  const { data, error } = await supabase
    .from("brand_profile_versions" as any)
    .insert({
      brand_id: params.brandId,
      website_url_original: params.websiteUrl,
      website_host_normalized: host,
      extraction_method: params.extractionMethod || "url_crawl",
      extraction_version: params.extractionVersion || "1.0",
      source_fingerprint: params.sourceFingerprint || null,
      brand_profile_json: params.brandProfileJson as any,
      brand_design_profile_json: params.brandDesignProfileJson || null,
      confidence: params.confidence || "medium",
      status: params.status || "success",
      notes: params.notes || null,
    })
    .select("brand_profile_version_id")
    .single();

  if (error) throw new Error(`Failed to create brand profile version: ${error.message}`);

  const versionId = (data as any).brand_profile_version_id;

  // Update brand_profiles with latest version pointer, brand name, scores
  const brandName = params.brandProfileJson?.brand_identity?.brand_name;
  const completeness = computeCompletenessScore(params.brandProfileJson);
  await supabase
    .from("brand_profiles")
    .update({
      latest_brand_profile_version_id: versionId,
      brand_profile_json: params.brandProfileJson as any,
      brand_design_profile_json: params.brandDesignProfileJson || null,
      brand_name: brandName || null,
      website_url: params.websiteUrl,
      profile_completeness_score: completeness,
    } as any)
    .eq("brand_id", params.brandId);

  // Increment iteration_count
  const { data: currentProfile } = await supabase
    .from("brand_profiles")
    .select("iteration_count")
    .eq("brand_id", params.brandId)
    .maybeSingle();
  const currentCount = (currentProfile as any)?.iteration_count || 0;
  await supabase
    .from("brand_profiles")
    .update({ iteration_count: currentCount + 1 } as any)
    .eq("brand_id", params.brandId);

  return versionId;
}

// ===== LOAD BRAND PROFILE METADATA (completeness + iteration) =====

export async function loadBrandProfileMeta(params: {
  websiteUrl: string;
  industry: string;
}): Promise<{ brandId: string; completenessScore: number; iterationCount: number; lastUpdated: string } | null> {
  const host = normalizeHost(params.websiteUrl);
  const { data, error } = await supabase
    .from("brand_profiles")
    .select("brand_id, profile_completeness_score, iteration_count, updated_at")
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
  };
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
