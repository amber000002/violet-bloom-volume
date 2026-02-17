
-- Create resource_library_items table
CREATE TABLE public.resource_library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  resource_type text NOT NULL DEFAULT 'internal_use_case_json',
  industry text,
  framework text,
  display_name text NOT NULL,
  file_path text NOT NULL,
  schema_version text,
  source text,
  version text,
  last_updated date,
  checksum_sha256 text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resource_library_items ENABLE ROW LEVEL SECURITY;

-- Open RLS policies (no auth system exists yet; can be scoped to org_id later)
CREATE POLICY "Anyone can read resource_library_items"
  ON public.resource_library_items FOR SELECT USING (true);

CREATE POLICY "Anyone can insert resource_library_items"
  ON public.resource_library_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update resource_library_items"
  ON public.resource_library_items FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete resource_library_items"
  ON public.resource_library_items FOR DELETE USING (true);

-- Updated_at trigger
CREATE TRIGGER update_resource_library_items_updated_at
  BEFORE UPDATE ON public.resource_library_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_resource_files_updated_at();

-- Unique constraint: same org + type + checksum = duplicate
CREATE UNIQUE INDEX idx_resource_library_items_checksum
  ON public.resource_library_items (org_id, resource_type, checksum_sha256)
  WHERE is_active = true;

-- Create resource-library storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('resource-library', 'resource-library', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resource-library bucket
CREATE POLICY "Anyone can read resource-library files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resource-library');

CREATE POLICY "Anyone can upload resource-library files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resource-library');

CREATE POLICY "Anyone can update resource-library files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'resource-library');

CREATE POLICY "Anyone can delete resource-library files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'resource-library');
