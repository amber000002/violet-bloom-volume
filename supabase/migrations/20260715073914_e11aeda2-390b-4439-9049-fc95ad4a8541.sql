
ALTER TABLE public.use_case_templates
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS template_type TEXT NOT NULL DEFAULT 'amp' CHECK (template_type IN ('amp','html')),
  ADD COLUMN IF NOT EXISTS use_case_category TEXT,
  ADD COLUMN IF NOT EXISTS use_case_category_confidence NUMERIC;
