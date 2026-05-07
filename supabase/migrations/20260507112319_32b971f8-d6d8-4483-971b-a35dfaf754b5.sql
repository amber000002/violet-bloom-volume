-- Table for uploaded use case email templates
CREATE TABLE public.use_case_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  html_content TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  amp_valid BOOLEAN NOT NULL DEFAULT true,
  amp_validator_errors JSONB,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX use_case_templates_active_label_unique
  ON public.use_case_templates (lower(label))
  WHERE is_active = true;

ALTER TABLE public.use_case_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read use_case_templates"
  ON public.use_case_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert use_case_templates"
  ON public.use_case_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update use_case_templates"
  ON public.use_case_templates FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete use_case_templates"
  ON public.use_case_templates FOR DELETE USING (true);

CREATE TRIGGER use_case_templates_updated_at
  BEFORE UPDATE ON public.use_case_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_resource_files_updated_at();

-- Storage bucket for thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('use-case-templates', 'use-case-templates', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read use-case-templates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'use-case-templates');
CREATE POLICY "Anyone can upload use-case-templates"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'use-case-templates');
CREATE POLICY "Anyone can update use-case-templates"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'use-case-templates');
CREATE POLICY "Anyone can delete use-case-templates"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'use-case-templates');