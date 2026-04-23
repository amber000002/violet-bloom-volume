ALTER TABLE public.diagnostics_exports
  ADD COLUMN IF NOT EXISTS campaign_csv_path TEXT,
  ADD COLUMN IF NOT EXISTS postmaster_csv_path TEXT,
  ADD COLUMN IF NOT EXISTS context_text TEXT;