
-- Add delete policies for recovered_tissues (needed for save workflow that deletes and re-inserts)
CREATE POLICY "Admins can delete recovered tissues"
  ON public.recovered_tissues FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can delete their recovered tissues"
  ON public.recovered_tissues FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tissue_recoveries tr
    JOIN donors ON donors.id = tr.donor_id
    JOIN partners ON partners.id = donors.partner_id
    WHERE tr.id = recovered_tissues.tissue_recovery_id AND partners.user_id = auth.uid()
  ));
