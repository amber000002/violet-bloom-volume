
-- Table to store parsed metadata/index for uploaded resource JSON files
CREATE TABLE public.resource_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_path TEXT NOT NULL, -- path in storage bucket
  source_name TEXT NOT NULL, -- from metadata.source
  version TEXT, -- from metadata.version
  industries TEXT[] NOT NULL DEFAULT '{}', -- all industries found in use_cases
  stages TEXT[] NOT NULL DEFAULT '{}', -- all stages found
  channels TEXT[] NOT NULL DEFAULT '{}', -- all channels found
  use_case_count INTEGER NOT NULL DEFAULT 0,
  resource_category TEXT NOT NULL DEFAULT 'lifecycle_use_case_library',
  raw_metadata JSONB, -- store the metadata block
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS but allow public read (no auth required for this app)
ALTER TABLE public.resource_files ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can read resource_files"
  ON public.resource_files FOR SELECT
  USING (true);

-- Anyone can insert (no auth in this app)
CREATE POLICY "Anyone can insert resource_files"
  ON public.resource_files FOR INSERT
  WITH CHECK (true);

-- Anyone can update
CREATE POLICY "Anyone can update resource_files"
  ON public.resource_files FOR UPDATE
  USING (true);

-- Anyone can delete
CREATE POLICY "Anyone can delete resource_files"
  ON public.resource_files FOR DELETE
  USING (true);

-- Make usecases bucket public for reads
UPDATE storage.buckets SET public = true WHERE id = 'usecases';

-- Storage policies for the usecases bucket
CREATE POLICY "Anyone can read usecases"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'usecases');

CREATE POLICY "Anyone can upload to usecases"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'usecases');

CREATE POLICY "Anyone can update usecases"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'usecases');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_resource_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_resource_files_updated_at
  BEFORE UPDATE ON public.resource_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_resource_files_updated_at();
