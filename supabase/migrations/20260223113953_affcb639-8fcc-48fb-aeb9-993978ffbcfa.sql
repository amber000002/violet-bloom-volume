
-- Add website_text_blocks JSONB column to brand_profile_versions
ALTER TABLE public.brand_profile_versions
ADD COLUMN website_text_blocks jsonb DEFAULT NULL;

COMMENT ON COLUMN public.brand_profile_versions.website_text_blocks IS 'Structured text blocks extracted from website pages (hero_text, product_intro_sections, differentiator_sections, value_proposition_blocks, headline_candidates, cta_phrases)';
