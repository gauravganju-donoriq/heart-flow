
-- Add status and carrier columns to shipments
ALTER TABLE public.shipments
  ADD COLUMN status text NOT NULL DEFAULT 'label_created',
  ADD COLUMN carrier text;

-- Allow admins to update shipments (for status changes)
CREATE POLICY "Admins can update shipments"
  ON public.shipments FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert shipments
CREATE POLICY "Admins can insert shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
