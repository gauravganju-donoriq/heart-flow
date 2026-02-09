
-- Heart Request Form (7117F) data
CREATE TABLE public.heart_request_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id UUID NOT NULL REFERENCES public.donors(id),
  tissue_recovery_id UUID REFERENCES public.tissue_recoveries(id),

  -- Request type
  request_type TEXT NOT NULL DEFAULT 'pathology', -- 'pathology' or 'heart_return_only'

  -- ME/Coroner info (not on donor record)
  circumstances_of_death TEXT,
  me_coroner_name TEXT,
  me_institution TEXT,
  me_address TEXT,
  me_city_state_zip TEXT,
  me_telephone TEXT,

  -- Height/Weight measurement method
  height_method TEXT, -- 'estimated', 'measured', 'reported'
  weight_method TEXT, -- 'estimated', 'measured', 'reported'

  -- Consent & requests
  consented_for_research BOOLEAN DEFAULT false,
  return_heart BOOLEAN DEFAULT false,
  histologic_slides_requested BOOLEAN DEFAULT false,

  -- Form metadata
  form_completed_by TEXT,
  form_completed_date DATE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT heart_request_forms_donor_unique UNIQUE (donor_id)
);

-- Enable RLS
ALTER TABLE public.heart_request_forms ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage heart request forms"
  ON public.heart_request_forms FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Partner read
CREATE POLICY "Partners can view their heart request forms"
  ON public.heart_request_forms FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM donors JOIN partners ON partners.id = donors.partner_id
    WHERE donors.id = heart_request_forms.donor_id AND partners.user_id = auth.uid()
  ));

-- Partner insert
CREATE POLICY "Partners can insert their heart request forms"
  ON public.heart_request_forms FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM donors JOIN partners ON partners.id = donors.partner_id
    WHERE donors.id = heart_request_forms.donor_id AND partners.user_id = auth.uid()
  ));

-- Partner update
CREATE POLICY "Partners can update their heart request forms"
  ON public.heart_request_forms FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM donors JOIN partners ON partners.id = donors.partner_id
    WHERE donors.id = heart_request_forms.donor_id AND partners.user_id = auth.uid()
  ));

-- Timestamp trigger
CREATE TRIGGER update_heart_request_forms_updated_at
  BEFORE UPDATE ON public.heart_request_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
