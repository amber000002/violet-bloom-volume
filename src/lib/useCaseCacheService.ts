import { supabase } from "@/integrations/supabase/client";
import { AugmentedUseCase } from "@/types/augmentedUseCase";

// ===== HELPERS =====

function normalizeHost(url: string): string {
  try {
    let host = url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "").toLowerCase().trim();
    return host || url.toLowerCase().trim();
  } catch {
    return url.toLowerCase().trim();
  }
}

async function computeSHA256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function buildChannelsKey(channels: string[]): string {
  return [...channels].sort().join("|");
}

async function buildHashKey(
  websiteHostNormalized: string,
  industryNormalized: string,
  channelsSorted: string[],
  resourceVersion?: string,
  promptVersion?: string,
): Promise<string> {
  const raw = [
    websiteHostNormalized,
    industryNormalized,
    buildChannelsKey(channelsSorted),
    resourceVersion || "",
    promptVersion || "1.0",
  ].join("__");
  return computeSHA256(raw);
}

// ===== BRAND UPSERT =====

export async function upsertBrandProfile(params: {
  websiteUrl: string;
  industry: string;
  brandName?: string;
  brandProfileJson?: any;
}): Promise<string> {
  const host = normalizeHost(params.websiteUrl);
  const industryNorm = params.industry.toLowerCase().trim();

  // Try to find existing
  const { data: existing } = await supabase
    .from("brand_profiles")
    .select("brand_id")
    .eq("website_host_normalized", host)
    .eq("industry_selected", industryNorm)
    .maybeSingle();

  if (existing) {
    // Update if brand profile json is provided
    if (params.brandProfileJson) {
      await supabase
        .from("brand_profiles")
        .update({
          brand_profile_json: params.brandProfileJson,
          brand_name: params.brandName || null,
          website_url: params.websiteUrl,
        })
        .eq("brand_id", existing.brand_id);
    }
    return existing.brand_id;
  }

  // Insert new
  const { data: inserted, error } = await supabase
    .from("brand_profiles")
    .insert({
      website_url: params.websiteUrl,
      website_host_normalized: host,
      industry_selected: industryNorm,
      brand_name: params.brandName || null,
      brand_profile_json: params.brandProfileJson || null,
    })
    .select("brand_id")
    .single();

  if (error) throw new Error(`Failed to create brand profile: ${error.message}`);
  return inserted.brand_id;
}

// ===== SAVE AI RUN =====

export interface SaveRunParams {
  brandId: string;
  websiteUrl: string;
  industry: string;
  channelsSelected: string[];
  augmentedUseCases: AugmentedUseCase[];
  resourceVersion?: string;
  promptVersion?: string;
}

export async function saveAIUseCaseRun(params: SaveRunParams): Promise<string> {
  const host = normalizeHost(params.websiteUrl);
  const industryNorm = params.industry.toLowerCase().trim();
  const channelsKey = buildChannelsKey(params.channelsSelected);
  const hashKey = await buildHashKey(host, industryNorm, params.channelsSelected, params.resourceVersion, params.promptVersion);

  const payload = {
    schema_version: "1.0",
    brand: { brand_id: params.brandId, website: host },
    industry: industryNorm,
    channels_selected: params.channelsSelected,
    generated_at: new Date().toISOString(),
    rows: params.augmentedUseCases,
  };

  // Insert run
  const { data: run, error: runError } = await supabase
    .from("ai_use_case_runs")
    .insert({
      brand_id: params.brandId,
      website_host_normalized: host,
      industry_normalized: industryNorm,
      channels_selected: params.channelsSelected,
      internal_resource_version: params.resourceVersion || null,
      prompt_version: params.promptVersion || "1.0",
      ai_output_payload: payload as any,
      status: "success",
      hash_key: hashKey,
    })
    .select("run_id")
    .single();

  if (runError) throw new Error(`Failed to save AI run: ${runError.message}`);

  // Upsert latest pointer
  const { data: existingLatest } = await supabase
    .from("ai_use_case_latest")
    .select("id")
    .eq("brand_id", params.brandId)
    .eq("industry_normalized", industryNorm)
    .eq("channels_selected_key", channelsKey)
    .maybeSingle();

  if (existingLatest) {
    await supabase
      .from("ai_use_case_latest")
      .update({ latest_run_id: run.run_id, updated_at: new Date().toISOString() })
      .eq("id", existingLatest.id);
  } else {
    await supabase
      .from("ai_use_case_latest")
      .insert({
        brand_id: params.brandId,
        industry_normalized: industryNorm,
        channels_selected_key: channelsKey,
        latest_run_id: run.run_id,
      });
  }

  return run.run_id;
}

// ===== LOAD CACHED RESULT =====

export interface CachedRun {
  runId: string;
  generatedAt: string;
  status: string;
  channelsSelected: string[];
  augmentedUseCases: AugmentedUseCase[];
  industry: string;
}

export async function loadLatestCachedRun(params: {
  websiteUrl: string;
  industry: string;
  channelsSelected: string[];
}): Promise<CachedRun | null> {
  const host = normalizeHost(params.websiteUrl);
  const industryNorm = params.industry.toLowerCase().trim();
  const channelsKey = buildChannelsKey(params.channelsSelected);

  // Find latest pointer
  const { data: latest } = await supabase
    .from("ai_use_case_latest")
    .select("latest_run_id")
    .eq("industry_normalized", industryNorm)
    .eq("channels_selected_key", channelsKey)
    .maybeSingle();

  if (!latest) return null;

  // Load the run
  const { data: run } = await supabase
    .from("ai_use_case_runs")
    .select("*")
    .eq("run_id", latest.latest_run_id)
    .eq("status", "success")
    .maybeSingle();

  if (!run) return null;

  const payload = run.ai_output_payload as any;
  return {
    runId: run.run_id,
    generatedAt: run.generated_at,
    status: run.status,
    channelsSelected: run.channels_selected,
    augmentedUseCases: payload?.rows || [],
    industry: run.industry_normalized,
  };
}

// ===== LOAD RUN HISTORY =====

export interface RunHistoryItem {
  runId: string;
  generatedAt: string;
  status: string;
  channelsSelected: string[];
  useCaseCount: number;
}

export async function loadRunHistory(params: {
  websiteUrl: string;
  industry: string;
}): Promise<RunHistoryItem[]> {
  const host = normalizeHost(params.websiteUrl);
  const industryNorm = params.industry.toLowerCase().trim();

  const { data, error } = await supabase
    .from("ai_use_case_runs")
    .select("run_id, generated_at, status, channels_selected, ai_output_payload")
    .eq("website_host_normalized", host)
    .eq("industry_normalized", industryNorm)
    .order("generated_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];

  return data.map(run => {
    const payload = run.ai_output_payload as any;
    return {
      runId: run.run_id,
      generatedAt: run.generated_at,
      status: run.status,
      channelsSelected: run.channels_selected,
      useCaseCount: payload?.rows?.length || 0,
    };
  });
}

// ===== LOAD SPECIFIC RUN =====

export async function loadRunById(runId: string): Promise<CachedRun | null> {
  const { data: run } = await supabase
    .from("ai_use_case_runs")
    .select("*")
    .eq("run_id", runId)
    .maybeSingle();

  if (!run) return null;

  const payload = run.ai_output_payload as any;
  return {
    runId: run.run_id,
    generatedAt: run.generated_at,
    status: run.status,
    channelsSelected: run.channels_selected,
    augmentedUseCases: payload?.rows || [],
    industry: run.industry_normalized,
  };
}
