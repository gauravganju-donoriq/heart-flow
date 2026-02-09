
-- Allow admins to insert donors
CREATE POLICY "Admins can insert donors"
  ON public.donors FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to upload documents
CREATE POLICY "Admins can upload documents"
  ON public.documents FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND uploaded_by = auth.uid()
  );

-- Storage policies for donor-documents bucket
CREATE POLICY "Authenticated users can upload to donor-documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'donor-documents');

CREATE POLICY "Authenticated users can read from donor-documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'donor-documents');
