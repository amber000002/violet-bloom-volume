ALTER TABLE public.brand_profiles
  ADD COLUMN IF NOT EXISTS event_schema_csv text,
  ADD COLUMN IF NOT EXISTS user_properties_csv text;