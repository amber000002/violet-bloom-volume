
CREATE TABLE public.html_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  source text NOT NULL,
  template_id uuid NULL,
  template_label text NULL,
  customer_name text NULL,
  industry text NULL,
  use_case_category text NULL,
  variant text NULL,
  version integer NOT NULL DEFAULT 1,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  content_hash text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.html_downloads TO authenticated;
GRANT SELECT, INSERT ON public.html_downloads TO anon;
GRANT ALL ON public.html_downloads TO service_role;
ALTER TABLE public.html_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "html_downloads_read_all" ON public.html_downloads FOR SELECT USING (true);
CREATE POLICY "html_downloads_insert_all" ON public.html_downloads FOR INSERT WITH CHECK (true);
CREATE POLICY "html_downloads_delete_all" ON public.html_downloads FOR DELETE USING (true);
CREATE INDEX idx_html_downloads_created ON public.html_downloads (created_at DESC);
CREATE INDEX idx_html_downloads_template ON public.html_downloads (template_id);
