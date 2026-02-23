
-- 1. Create brand_profile_versions table
CREATE TABLE public.brand_profile_versions (
  brand_profile_version_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL,
  website_url_original TEXT,
  website_host_normalized TEXT NOT NULL,
  extraction_method TEXT NOT NULL DEFAULT 'url_crawl',
  extraction_version TEXT DEFAULT '1.0',
  source_fingerprint TEXT,
  brand_profile_json JSONB NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'success',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by_user_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_profile_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read brand_profile_versions" ON public.brand_profile_versions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert brand_profile_versions" ON public.brand_profile_versions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update brand_profile_versions" ON public.brand_profile_versions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete brand_profile_versions" ON public.brand_profile_versions FOR DELETE USING (true);

-- Index for fast lookups
CREATE INDEX idx_brand_profile_versions_host ON public.brand_profile_versions (website_host_normalized);
CREATE INDEX idx_brand_profile_versions_brand_id ON public.brand_profile_versions (brand_id);

-- 2. Add latest_brand_profile_version_id to brand_profiles
ALTER TABLE public.brand_profiles ADD COLUMN latest_brand_profile_version_id UUID;

-- 3. Add brand_profile_version_id to ai_use_case_runs
ALTER TABLE public.ai_use_case_runs ADD COLUMN brand_profile_version_id UUID;
