import { supabase } from "@/integrations/supabase/client";

export type HtmlDownloadSource =
  | "email-repository"
  | "email-repository-mockup"
  | "interactive-preview"
  | "amp-studio"
  | "other";

export interface HtmlDownloadRecord {
  id: string;
  fileName: string;
  source: HtmlDownloadSource | string;
  templateId: string | null;
  templateLabel: string | null;
  customerName: string | null;
  industry: string | null;
  useCaseCategory: string | null;
  variant: string | null;
  version: number;
  fileSizeBytes: number;
  contentHash: string | null;
  notes: string | null;
  createdAt: string;
}

export interface LogDownloadInput {
  fileName: string;
  source: HtmlDownloadSource | string;
  content: string;
  templateId?: string | null;
  templateLabel?: string | null;
  customerName?: string | null;
  industry?: string | null;
  useCaseCategory?: string | null;
  variant?: string | null;
  notes?: string | null;
}

function mapRow(r: any): HtmlDownloadRecord {
  return {
    id: r.id,
    fileName: r.file_name,
    source: r.source,
    templateId: r.template_id,
    templateLabel: r.template_label,
    customerName: r.customer_name,
    industry: r.industry,
    useCaseCategory: r.use_case_category,
    variant: r.variant,
    version: Number(r.version || 1),
    fileSizeBytes: Number(r.file_size_bytes || 0),
    contentHash: r.content_hash,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

async function hashContent(content: string): Promise<string> {
  try {
    const enc = new TextEncoder().encode(content);
    const buf = await crypto.subtle.digest("SHA-1", enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

export async function logHtmlDownload(input: LogDownloadInput): Promise<HtmlDownloadRecord | null> {
  try {
    const size = new Blob([input.content]).size;
    const contentHash = await hashContent(input.content);

    // Compute version = count of prior downloads for the same template/label + 1
    let version = 1;
    const matchKey = input.templateId ?? null;
    if (matchKey) {
      const { count } = await supabase
        .from("html_downloads")
        .select("id", { count: "exact", head: true })
        .eq("template_id", matchKey);
      version = (count ?? 0) + 1;
    } else if (input.fileName) {
      const { count } = await supabase
        .from("html_downloads")
        .select("id", { count: "exact", head: true })
        .eq("file_name", input.fileName);
      version = (count ?? 0) + 1;
    }

    const row = {
      file_name: input.fileName,
      source: input.source,
      template_id: input.templateId ?? null,
      template_label: input.templateLabel ?? null,
      customer_name: input.customerName ?? null,
      industry: input.industry ?? null,
      use_case_category: input.useCaseCategory ?? null,
      variant: input.variant ?? null,
      version,
      file_size_bytes: size,
      content_hash: contentHash || null,
      notes: input.notes ?? null,
    };

    const { data, error } = await supabase
      .from("html_downloads")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  } catch (e) {
    // Never let logging block a user download
    // eslint-disable-next-line no-console
    console.warn("logHtmlDownload failed", e);
    return null;
  }
}

export async function listHtmlDownloads(): Promise<HtmlDownloadRecord[]> {
  const { data, error } = await supabase
    .from("html_downloads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function deleteHtmlDownload(id: string): Promise<void> {
  const { error } = await supabase.from("html_downloads").delete().eq("id", id);
  if (error) throw error;
}
