
-- Slide template slots table
CREATE TABLE public.slide_template_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type text NOT NULL DEFAULT 'inbox-diagnostics',
  position integer NOT NULL,
  title text NOT NULL,
  slide_type text NOT NULL DEFAULT 'data',
  background_path text,
  background_filename text,
  background_width integer,
  background_height integer,
  file_size_bytes bigint,
  uploaded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (report_type, position)
);

ALTER TABLE public.slide_template_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read slide_template_slots"
  ON public.slide_template_slots FOR SELECT USING (true);
CREATE POLICY "Anyone can insert slide_template_slots"
  ON public.slide_template_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update slide_template_slots"
  ON public.slide_template_slots FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete slide_template_slots"
  ON public.slide_template_slots FOR DELETE USING (true);

CREATE INDEX idx_slide_template_slots_report_type
  ON public.slide_template_slots (report_type, position);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.update_slide_template_slots_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER slide_template_slots_updated_at
  BEFORE UPDATE ON public.slide_template_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_slide_template_slots_updated_at();

-- Storage bucket for background images
INSERT INTO storage.buckets (id, name, public)
VALUES ('slide-template-backgrounds', 'slide-template-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies (single-tenant workspace pattern)
CREATE POLICY "Anyone can view slide template backgrounds"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'slide-template-backgrounds');

CREATE POLICY "Anyone can upload slide template backgrounds"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'slide-template-backgrounds');

CREATE POLICY "Anyone can update slide template backgrounds"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'slide-template-backgrounds');

CREATE POLICY "Anyone can delete slide template backgrounds"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'slide-template-backgrounds');
