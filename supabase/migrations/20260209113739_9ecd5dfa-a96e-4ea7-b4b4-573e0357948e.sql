CREATE TABLE public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  tracking_number text NOT NULL,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their donor shipments"
  ON public.shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM donors
      JOIN partners ON partners.id = donors.partner_id
      WHERE donors.id = shipments.donor_id
      AND partners.user_id = auth.uid()
    )
  );

CREATE POLICY "Partners can add shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM donors
      JOIN partners ON partners.id = donors.partner_id
      WHERE donors.id = shipments.donor_id
      AND partners.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Admins can view all shipments"
  ON public.shipments FOR SELECT
  USING (has_role(auth.uid(), 'admin'));