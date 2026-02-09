
-- Create pending_donor_updates table
CREATE TABLE public.pending_donor_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id uuid NOT NULL REFERENCES public.donors(id),
  call_transcript_id uuid REFERENCES public.call_transcripts(id),
  proposed_changes jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_donor_updates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view all pending updates"
ON public.pending_donor_updates FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update pending updates"
ON public.pending_donor_updates FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Partners can view pending updates for their donors
CREATE POLICY "Partners can view their pending updates"
ON public.pending_donor_updates FOR SELECT
USING (EXISTS (
  SELECT 1 FROM donors
  JOIN partners ON partners.id = donors.partner_id
  WHERE donors.id = pending_donor_updates.donor_id
  AND partners.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_pending_donor_updates_updated_at
BEFORE UPDATE ON public.pending_donor_updates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Drop linked_donor_id column (no longer needed)
ALTER TABLE public.donors DROP COLUMN IF EXISTS linked_donor_id;
