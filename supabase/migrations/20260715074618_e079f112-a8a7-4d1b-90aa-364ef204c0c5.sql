ALTER TABLE public.use_case_templates ADD COLUMN IF NOT EXISTS industry text;
CREATE INDEX IF NOT EXISTS use_case_templates_industry_idx ON public.use_case_templates (industry);