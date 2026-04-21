
-- 1. Repository table
CREATE TABLE public.diagnostics_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  brand_name TEXT,
  industry TEXT,
  website_host_normalized TEXT,
  source_file_name TEXT,
  month_range TEXT,
  report_type TEXT NOT NULL DEFAULT 'analysis',
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_diagnostics_exports_industry ON public.diagnostics_exports (industry);
CREATE INDEX idx_diagnostics_exports_host ON public.diagnostics_exports (website_host_normalized);
CREATE INDEX idx_diagnostics_exports_created ON public.diagnostics_exports (created_at DESC);

ALTER TABLE public.diagnostics_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read diagnostics_exports"
  ON public.diagnostics_exports FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert diagnostics_exports"
  ON public.diagnostics_exports FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can update diagnostics_exports"
  ON public.diagnostics_exports FOR UPDATE TO public USING (true);

CREATE POLICY "Anyone can delete diagnostics_exports"
  ON public.diagnostics_exports FOR DELETE TO public USING (true);

-- 2. Public storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('diagnostics-exports', 'diagnostics-exports', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies (public bucket — allow anyone read/upload/delete)
CREATE POLICY "Public can read diagnostics-exports"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'diagnostics-exports');

CREATE POLICY "Public can upload diagnostics-exports"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'diagnostics-exports');

CREATE POLICY "Public can update diagnostics-exports"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'diagnostics-exports');

CREATE POLICY "Public can delete diagnostics-exports"
  ON storage.objects FOR DELETE TO public
  USING (bucket_id = 'diagnostics-exports');
