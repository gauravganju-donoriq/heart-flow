
-- Create plasma_dilution_worksheets table
CREATE TABLE public.plasma_dilution_worksheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  sample_type TEXT,
  sample_datetime TIMESTAMPTZ,
  death_type TEXT,
  blood_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  colloids JSONB NOT NULL DEFAULT '[]'::jsonb,
  crystalloids JSONB NOT NULL DEFAULT '[]'::jsonb,
  bsa_value NUMERIC,
  blood_volume NUMERIC,
  plasma_volume NUMERIC,
  is_sample_acceptable BOOLEAN,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_donor_worksheet UNIQUE (donor_id)
);

-- Enable RLS
ALTER TABLE public.plasma_dilution_worksheets ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can view all plasma dilution worksheets"
ON public.plasma_dilution_worksheets FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert plasma dilution worksheets"
ON public.plasma_dilution_worksheets FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update plasma dilution worksheets"
ON public.plasma_dilution_worksheets FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Partner policies (same pattern as tissue_recoveries)
CREATE POLICY "Partners can view their plasma dilution worksheets"
ON public.plasma_dilution_worksheets FOR SELECT
USING (EXISTS (
  SELECT 1 FROM donors JOIN partners ON partners.id = donors.partner_id
  WHERE donors.id = plasma_dilution_worksheets.donor_id AND partners.user_id = auth.uid()
));

CREATE POLICY "Partners can insert their plasma dilution worksheets"
ON public.plasma_dilution_worksheets FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM donors JOIN partners ON partners.id = donors.partner_id
  WHERE donors.id = plasma_dilution_worksheets.donor_id AND partners.user_id = auth.uid()
));

CREATE POLICY "Partners can update their plasma dilution worksheets"
ON public.plasma_dilution_worksheets FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM donors JOIN partners ON partners.id = donors.partner_id
  WHERE donors.id = plasma_dilution_worksheets.donor_id AND partners.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_plasma_dilution_worksheets_updated_at
BEFORE UPDATE ON public.plasma_dilution_worksheets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
