CREATE TABLE public.review_resolution_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_fingerprint TEXT NOT NULL,
  campaign_name TEXT,
  suggested_use_case_id TEXT,
  suggested_use_case_name TEXT,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  margin_over_second NUMERIC(4,3),
  evidence_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason_codes TEXT[] NOT NULL DEFAULT '{}'::text[],
  resolution_status TEXT NOT NULL DEFAULT 'unresolved',
  reason_for_review TEXT,
  top_candidates JSONB,
  industry TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.review_resolution_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read review_resolution_attempts" ON public.review_resolution_attempts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert review_resolution_attempts" ON public.review_resolution_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update review_resolution_attempts" ON public.review_resolution_attempts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete review_resolution_attempts" ON public.review_resolution_attempts FOR DELETE USING (true);