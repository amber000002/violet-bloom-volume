CREATE TABLE public.amp_template_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  html_content TEXT NOT NULL,
  template_id UUID,
  template_label TEXT,
  brand_id UUID,
  brand_name TEXT,
  website_host_normalized TEXT,
  amp_valid BOOLEAN NOT NULL DEFAULT true,
  amp_validator_errors JSONB,
  auto_fixes_applied JSONB,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.amp_template_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read amp_template_drafts" ON public.amp_template_drafts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert amp_template_drafts" ON public.amp_template_drafts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update amp_template_drafts" ON public.amp_template_drafts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete amp_template_drafts" ON public.amp_template_drafts FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_amp_template_drafts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_amp_template_drafts_updated_at
BEFORE UPDATE ON public.amp_template_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_amp_template_drafts_updated_at();

CREATE INDEX idx_amp_template_drafts_created_at ON public.amp_template_drafts(created_at DESC);