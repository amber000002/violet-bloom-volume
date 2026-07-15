import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { validateAmpEmail, AmpValidationError } from "./ampEmailValidator";

export type TemplateType = "amp" | "html";

export interface UseCaseTemplate {
  id: string;
  label: string;
  customerName: string | null;
  industry: string | null;
  templateType: TemplateType;
  useCaseCategory: string | null;
  useCaseCategoryConfidence: number | null;
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
    customerName: row.customer_name ?? null,
    industry: row.industry ?? null,
    templateType: (row.template_type ?? "amp") as TemplateType,
    useCaseCategory: row.use_case_category ?? null,
    useCaseCategoryConfidence: row.use_case_category_confidence != null ? Number(row.use_case_category_confidence) : null,
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

async function classifyTemplate(params: { html: string; label: string; customer: string; templateType: TemplateType }): Promise<{ category: string; confidence: number } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("classify-email-template", {
      body: {
        html: params.html,
        label: params.label,
        customer: params.customer,
        templateType: params.templateType,
      },
    });
    if (error) {
      console.warn("[classify-email-template] failed", error);
      return null;
    }
    if (!data?.category) return null;
    return { category: data.category, confidence: data.confidence ?? 0.5 };
  } catch (e) {
    console.warn("[classify-email-template] threw", e);
    return null;
  }
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
  customerName?: string;
  industry?: string;
  templateType?: TemplateType;
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

  const customerName = (params.customerName ?? "").trim() || null;
  const industry = (params.industry ?? "").trim() || null;
  const templateType: TemplateType = params.templateType === "html" ? "html" : "amp";

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

  // Classify first so category is stored on insert
  const classification = await classifyTemplate({
    html: params.html,
    label,
    customer: customerName ?? "",
    templateType,
  });

  const insertPayload: any = {
    label,
    customer_name: customerName,
    industry,
    template_type: templateType,
    use_case_category: classification?.category ?? null,
    use_case_category_confidence: classification?.confidence ?? null,
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

export async function updateUseCaseTemplateMeta(id: string, patch: {
  customerName?: string | null;
  industry?: string | null;
  templateType?: TemplateType;
  useCaseCategory?: string | null;
}): Promise<UseCaseTemplate> {
  const update: any = {};
  if (patch.customerName !== undefined) update.customer_name = patch.customerName;
  if (patch.industry !== undefined) update.industry = patch.industry;
  if (patch.templateType !== undefined) update.template_type = patch.templateType;
  if (patch.useCaseCategory !== undefined) {
    update.use_case_category = patch.useCaseCategory;
    update.use_case_category_confidence = patch.useCaseCategory ? 1 : null;
  }
  const { data, error } = await supabase
    .from(TABLE)
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToTemplate(data);
}

export async function reclassifyUseCaseTemplate(t: UseCaseTemplate): Promise<UseCaseTemplate> {
  const c = await classifyTemplate({
    html: t.htmlContent,
    label: t.label,
    customer: t.customerName ?? "",
    templateType: t.templateType,
  });
  if (!c) throw new Error("Classification failed");
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      use_case_category: c.category,
      use_case_category_confidence: c.confidence,
    })
    .eq("id", t.id)
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

export const EMAIL_USE_CASE_CATEGORIES = [
  "Welcome",
  "Onboarding",
  "Cart Abandonment",
  "Browse Abandonment",
  "Gamification",
  "Promotional",
  "Newsletter",
  "Transactional",
  "Re-engagement",
  "Product Announcement",
  "Feedback / Survey",
  "Loyalty / Rewards",
  "Event / Webinar",
  "Other",
];
