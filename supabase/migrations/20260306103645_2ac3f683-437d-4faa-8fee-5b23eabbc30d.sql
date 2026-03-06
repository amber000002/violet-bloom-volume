ALTER TABLE public.brand_profiles
  ADD COLUMN IF NOT EXISTS profile_completeness_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iteration_count integer DEFAULT 0;