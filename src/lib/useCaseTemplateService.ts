import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { validateAmpEmail, AmpValidationError } from "./ampEmailValidator";

export interface UseCaseTemplate {
  id: string;
  label: string;
  htmlContent: string;
  fileSizeBytes: number;
  thumbnailUrl: string | null;
  ampValid: boolean;
  ampValidatorErrors: AmpValidationError[] | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

const TABLE = "use_case_templates" as const;

export const TEMPLATE_MAX_BYTES = 500 * 1024; // 500 KB
export const TEMPLATE_LABEL_MAX = 60;

function rowToTemplate(row: any): UseCaseTemplate {
  return {
    id: row.id,
    label: row.label,
    htmlContent: row.html_content,
    fileSizeBytes: Number(row.file_size_bytes ?? 0),
    thumbnailUrl: row.thumbnail_url ?? null,
    ampValid: !!row.amp_valid,
    ampValidatorErrors: (row.amp_validator_errors as AmpValidationError[] | null) ?? null,
    usageCount: Number(row.usage_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listUseCaseTemplates(): Promise<UseCaseTemplate[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToTemplate);
}

export async function uploadUseCaseTemplate(params: {
  label: string;
  html: string;
}): Promise<UseCaseTemplate> {
  const label = params.label.trim();
  if (!label) throw new Error("Label is required");
  if (label.length > TEMPLATE_LABEL_MAX) {
    throw new Error(`Label must be ${TEMPLATE_LABEL_MAX} characters or fewer`);
  }
  const bytes = new TextEncoder().encode(params.html).length;
  if (bytes > TEMPLATE_MAX_BYTES) {
    throw new Error(`Template exceeds 500 KB (got ${(bytes / 1024).toFixed(1)} KB)`);
  }

  // Duplicate label check (case-insensitive)
  const { data: dupes } = await supabase
    .from(TABLE)
    .select("id, label")
    .eq("is_active", true)
    .ilike("label", label);
  if (dupes && dupes.length > 0) {
    throw new Error("A template with this name already exists");
  }

  const validation = validateAmpEmail(params.html);

  const insertPayload = {
    label,
    html_content: params.html,
    file_size_bytes: bytes,
    amp_valid: validation.valid,
    amp_validator_errors: (validation.errors as unknown as Json) ?? null,
    usage_count: 0,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(insertPayload)
    .select("*")
    .single();
  if (error) throw error;
  return rowToTemplate(data);
}

export async function renameUseCaseTemplate(id: string, label: string): Promise<UseCaseTemplate> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label is required");
  if (trimmed.length > TEMPLATE_LABEL_MAX) {
    throw new Error(`Label must be ${TEMPLATE_LABEL_MAX} characters or fewer`);
  }
  const { data: dupes } = await supabase
    .from(TABLE)
    .select("id, label")
    .eq("is_active", true)
    .ilike("label", trimmed)
    .neq("id", id);
  if (dupes && dupes.length > 0) {
    throw new Error("A template with this name already exists");
  }
  const { data, error } = await supabase
    .from(TABLE)
    .update({ label: trimmed })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToTemplate(data);
}

export async function replaceUseCaseTemplate(id: string, html: string): Promise<UseCaseTemplate> {
  const bytes = new TextEncoder().encode(html).length;
  if (bytes > TEMPLATE_MAX_BYTES) {
    throw new Error(`Template exceeds 500 KB (got ${(bytes / 1024).toFixed(1)} KB)`);
  }
  const validation = validateAmpEmail(html);
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      html_content: html,
      file_size_bytes: bytes,
      amp_valid: validation.valid,
      amp_validator_errors: (validation.errors as unknown as Json) ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToTemplate(data);
}

export async function softDeleteUseCaseTemplate(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ is_active: false }).eq("id", id);
  if (error) throw error;
}
