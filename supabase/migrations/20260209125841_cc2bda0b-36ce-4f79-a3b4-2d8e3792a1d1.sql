
-- Table for the 7033F Tissue Recovery Form (one per donor)
CREATE TABLE public.tissue_recoveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  consent_delivery_method TEXT, -- 'portal', 'in_shipper', 'emailed'
  packaging_deviation BOOLEAN DEFAULT false,
  packaging_notes TEXT,
  heart_request_needed BOOLEAN DEFAULT false,
  heart_request_form_completed BOOLEAN DEFAULT false,
  form_completed_by TEXT,
  lemaitre_donor_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(donor_id)
);

-- Table for individual recovered tissue lines
CREATE TABLE public.recovered_tissues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tissue_recovery_id UUID NOT NULL REFERENCES public.tissue_recoveries(id) ON DELETE CASCADE,
  tissue_category TEXT NOT NULL, -- 'vascular' or 'cardiac'
  tissue_type TEXT NOT NULL, -- e.g. 'RIGHT Saphenous Vein', 'Aortoiliac Artery', 'Heart for Valves'
  timestamp_value TIMESTAMP WITH TIME ZONE, -- wet ice or cold solution date/time
  recovery_technician TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tissue_recoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovered_tissues ENABLE ROW LEVEL SECURITY;

-- tissue_recoveries policies
CREATE POLICY "Admins can view all tissue recoveries"
  ON public.tissue_recoveries FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert tissue recoveries"
  ON public.tissue_recoveries FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tissue recoveries"
  ON public.tissue_recoveries FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view their tissue recoveries"
  ON public.tissue_recoveries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM donors JOIN partners ON partners.id = donors.partner_id
    WHERE donors.id = tissue_recoveries.donor_id AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Partners can insert their tissue recoveries"
  ON public.tissue_recoveries FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM donors JOIN partners ON partners.id = donors.partner_id
    WHERE donors.id = tissue_recoveries.donor_id AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Partners can update their tissue recoveries"
  ON public.tissue_recoveries FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM donors JOIN partners ON partners.id = donors.partner_id
    WHERE donors.id = tissue_recoveries.donor_id AND partners.user_id = auth.uid()
  ));

-- recovered_tissues policies
CREATE POLICY "Admins can view all recovered tissues"
  ON public.recovered_tissues FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage recovered tissues"
  ON public.recovered_tissues FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view their recovered tissues"
  ON public.recovered_tissues FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tissue_recoveries tr
    JOIN donors ON donors.id = tr.donor_id
    JOIN partners ON partners.id = donors.partner_id
    WHERE tr.id = recovered_tissues.tissue_recovery_id AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Partners can insert their recovered tissues"
  ON public.recovered_tissues FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tissue_recoveries tr
    JOIN donors ON donors.id = tr.donor_id
    JOIN partners ON partners.id = donors.partner_id
    WHERE tr.id = recovered_tissues.tissue_recovery_id AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Partners can update their recovered tissues"
  ON public.recovered_tissues FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tissue_recoveries tr
    JOIN donors ON donors.id = tr.donor_id
    JOIN partners ON partners.id = donors.partner_id
    WHERE tr.id = recovered_tissues.tissue_recovery_id AND partners.user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_tissue_recoveries_updated_at
  BEFORE UPDATE ON public.tissue_recoveries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
