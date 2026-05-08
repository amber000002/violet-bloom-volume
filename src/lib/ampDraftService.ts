import { supabase } from "@/integrations/supabase/client";

export interface AmpDraft {
  id: string;
  name: string;
  htmlContent: string;
  templateId: string | null;
  templateLabel: string | null;
  brandId: string | null;
  brandName: string | null;
  websiteHostNormalized: string | null;
  ampValid: boolean;
  ampValidatorErrors: any;
  autoFixesApplied: any;
  fileSizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

function mapRow(r: any): AmpDraft {
  return {
    id: r.id,
    name: r.name,
    htmlContent: r.html_content,
    templateId: r.template_id,
    templateLabel: r.template_label,
    brandId: r.brand_id,
    brandName: r.brand_name,
    websiteHostNormalized: r.website_host_normalized,
    ampValid: r.amp_valid,
    ampValidatorErrors: r.amp_validator_errors,
    autoFixesApplied: r.auto_fixes_applied,
    fileSizeBytes: Number(r.file_size_bytes || 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listAmpDrafts(): Promise<AmpDraft[]> {
  const { data, error } = await supabase
    .from("amp_template_drafts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export interface SaveAmpDraftInput {
  name: string;
  htmlContent: string;
  templateId?: string | null;
  templateLabel?: string | null;
  brandId?: string | null;
  brandName?: string | null;
  websiteHostNormalized?: string | null;
  ampValid?: boolean;
  ampValidatorErrors?: any;
  autoFixesApplied?: any;
}

export async function saveAmpDraft(input: SaveAmpDraftInput): Promise<AmpDraft> {
  const name = input.name?.trim();
  if (!name) throw new Error("Draft name is required");
  if (!input.htmlContent) throw new Error("Draft HTML is empty");

  const row = {
    name,
    html_content: input.htmlContent,
    template_id: input.templateId ?? null,
    template_label: input.templateLabel ?? null,
    brand_id: input.brandId ?? null,
    brand_name: input.brandName ?? null,
    website_host_normalized: input.websiteHostNormalized ?? null,
    amp_valid: input.ampValid ?? true,
    amp_validator_errors: input.ampValidatorErrors ?? null,
    auto_fixes_applied: input.autoFixesApplied ?? null,
    file_size_bytes: new Blob([input.htmlContent]).size,
  };

  const { data, error } = await supabase
    .from("amp_template_drafts")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function deleteAmpDraft(id: string): Promise<void> {
  const { error } = await supabase.from("amp_template_drafts").delete().eq("id", id);
  if (error) throw error;
}

export async function renameAmpDraft(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name cannot be empty");
  const { error } = await supabase
    .from("amp_template_drafts")
    .update({ name: trimmed })
    .eq("id", id);
  if (error) throw error;
}
