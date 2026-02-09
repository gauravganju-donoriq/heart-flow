
-- Add linked_donor_id column for follow-up records linked to already-submitted donors
ALTER TABLE public.donors
ADD COLUMN linked_donor_id uuid REFERENCES public.donors(id);

-- Add unique partial index to prevent duplicate external_donor_id per partner
CREATE UNIQUE INDEX idx_donors_partner_external_donor_id
ON public.donors (partner_id, external_donor_id)
WHERE external_donor_id IS NOT NULL;
