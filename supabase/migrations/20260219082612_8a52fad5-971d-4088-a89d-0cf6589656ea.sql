
-- Brand Profiles table
CREATE TABLE public.brand_profiles (
  brand_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  website_url TEXT,
  website_host_normalized TEXT NOT NULL,
  brand_name TEXT,
  industry_selected TEXT NOT NULL,
  brand_profile_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_brand_profiles_host_industry 
  ON public.brand_profiles (website_host_normalized, industry_selected);

ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read brand_profiles" ON public.brand_profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert brand_profiles" ON public.brand_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update brand_profiles" ON public.brand_profiles FOR UPDATE USING (true);

-- AI Use Case Runs table
CREATE TABLE public.ai_use_case_runs (
  run_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brand_profiles(brand_id) ON DELETE CASCADE,
  website_host_normalized TEXT NOT NULL,
  industry_normalized TEXT NOT NULL,
  channels_selected TEXT[] NOT NULL DEFAULT '{}',
  internal_resource_version TEXT,
  prompt_version TEXT DEFAULT '1.0',
  output_format TEXT NOT NULL DEFAULT 'table_json',
  ai_output_payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  hash_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_use_case_runs_hash ON public.ai_use_case_runs (hash_key);
CREATE INDEX idx_ai_use_case_runs_brand ON public.ai_use_case_runs (brand_id);

ALTER TABLE public.ai_use_case_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ai_use_case_runs" ON public.ai_use_case_runs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert ai_use_case_runs" ON public.ai_use_case_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update ai_use_case_runs" ON public.ai_use_case_runs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete ai_use_case_runs" ON public.ai_use_case_runs FOR DELETE USING (true);

-- Latest pointer table for fast retrieval
CREATE TABLE public.ai_use_case_latest (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brand_profiles(brand_id) ON DELETE CASCADE,
  industry_normalized TEXT NOT NULL,
  channels_selected_key TEXT NOT NULL,
  latest_run_id UUID NOT NULL REFERENCES public.ai_use_case_runs(run_id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ai_use_case_latest_lookup 
  ON public.ai_use_case_latest (brand_id, industry_normalized, channels_selected_key);

ALTER TABLE public.ai_use_case_latest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ai_use_case_latest" ON public.ai_use_case_latest FOR SELECT USING (true);
CREATE POLICY "Anyone can insert ai_use_case_latest" ON public.ai_use_case_latest FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update ai_use_case_latest" ON public.ai_use_case_latest FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete ai_use_case_latest" ON public.ai_use_case_latest FOR DELETE USING (true);

-- Trigger for brand_profiles updated_at
CREATE TRIGGER update_brand_profiles_updated_at
  BEFORE UPDATE ON public.brand_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_resource_files_updated_at();
