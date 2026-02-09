
-- Add intake_method column to donors
ALTER TABLE public.donors ADD COLUMN intake_method text;

-- Create call_transcripts table
CREATE TABLE public.call_transcripts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id uuid REFERENCES public.donors(id),
  partner_id uuid NOT NULL REFERENCES public.partners(id),
  retell_call_id text UNIQUE NOT NULL,
  transcript text NOT NULL,
  call_duration_seconds integer,
  caller_phone text,
  extracted_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;

-- Admins can view all transcripts
CREATE POLICY "Admins can view all transcripts"
  ON public.call_transcripts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Partners can view their own transcripts
CREATE POLICY "Partners can view their own transcripts"
  ON public.call_transcripts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM partners
    WHERE partners.id = call_transcripts.partner_id
    AND partners.user_id = auth.uid()
  ));

-- No insert/update/delete policies for regular users (webhook uses service role)
