
-- Helper function: returns true for admin, user, super_admin
CREATE OR REPLACE FUNCTION public.has_internal_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'user', 'super_admin')
  )
$$;

-- Admin activity log table
CREATE TABLE public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can view activity logs"
ON public.admin_activity_log FOR SELECT
USING (has_internal_role(auth.uid()));

-- === DONORS: replace admin-only with internal ===
DROP POLICY IF EXISTS "Admins can view all donors" ON public.donors;
DROP POLICY IF EXISTS "Admins can insert donors" ON public.donors;
DROP POLICY IF EXISTS "Admins can update all donors" ON public.donors;

CREATE POLICY "Internal users can view all donors"
ON public.donors FOR SELECT USING (has_internal_role(auth.uid()));

CREATE POLICY "Internal users can insert donors"
ON public.donors FOR INSERT WITH CHECK (has_internal_role(auth.uid()));

CREATE POLICY "Internal users can update donors"
ON public.donors FOR UPDATE USING (has_internal_role(auth.uid()));

-- === AUDIT_LOGS ===
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;

CREATE POLICY "Internal users can view all audit logs"
ON public.audit_logs FOR SELECT USING (has_internal_role(auth.uid()));

CREATE POLICY "Internal users can insert audit logs"
ON public.audit_logs FOR INSERT WITH CHECK (has_internal_role(auth.uid()));

-- === DOCUMENTS ===
DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can upload documents" ON public.documents;

CREATE POLICY "Internal users can view all documents"
ON public.documents FOR SELECT USING (has_internal_role(auth.uid()));

CREATE POLICY "Internal users can upload documents"
ON public.documents FOR INSERT WITH CHECK (has_internal_role(auth.uid()) AND uploaded_by = auth.uid());

-- === SCREENING_RESULTS ===
DROP POLICY IF EXISTS "Admins can view screening results" ON public.screening_results;
DROP POLICY IF EXISTS "Admins can insert screening results" ON public.screening_results;

CREATE POLICY "Internal users can view screening results"
ON public.screening_results FOR SELECT USING (has_internal_role(auth.uid()));

CREATE POLICY "Internal users can insert screening results"
ON public.screening_results FOR INSERT WITH CHECK (has_internal_role(auth.uid()));

-- === CALL_TRANSCRIPTS ===
DROP POLICY IF EXISTS "Admins can view all transcripts" ON public.call_transcripts;

CREATE POLICY "Internal users can view all transcripts"
ON public.call_transcripts FOR SELECT USING (has_internal_role(auth.uid()));

-- === TISSUE_RECOVERIES ===
DROP POLICY IF EXISTS "Admins can view all tissue recoveries" ON public.tissue_recoveries;
DROP POLICY IF EXISTS "Admins can insert tissue recoveries" ON public.tissue_recoveries;
DROP POLICY IF EXISTS "Admins can update tissue recoveries" ON public.tissue_recoveries;

CREATE POLICY "Internal users can view all tissue recoveries"
ON public.tissue_recoveries FOR SELECT USING (has_internal_role(auth.uid()));

CREATE POLICY "Internal users can insert tissue recoveries"
ON public.tissue_recoveries FOR INSERT WITH CHECK (has_internal_role(auth.uid()));

CREATE POLICY "Internal users can update tissue recoveries"
ON public.tissue_recoveries FOR UPDATE USING (has_internal_role(auth.uid()));

-- === RECOVERED_TISSUES ===
DROP POLICY IF EXISTS "Admins can manage recovered tissues" ON public.recovered_tissues;
DROP POLICY IF EXISTS "Admins can view all recovered tissues" ON public.recovered_tissues;
DROP POLICY IF EXISTS "Admins can delete recovered tissues" ON public.recovered_tissues;

CREATE POLICY "Internal users can manage recovered tissues"
ON public.recovered_tissues FOR ALL USING (has_internal_role(auth.uid()));

-- === HEART_REQUEST_FORMS ===
DROP POLICY IF EXISTS "Admins can manage heart request forms" ON public.heart_request_forms;

CREATE POLICY "Internal users can manage heart request forms"
ON public.heart_request_forms FOR ALL USING (has_internal_role(auth.uid()));

-- === PLASMA_DILUTION_WORKSHEETS ===
DROP POLICY IF EXISTS "Admins can view all plasma dilution worksheets" ON public.plasma_dilution_worksheets;
DROP POLICY IF EXISTS "Admins can insert plasma dilution worksheets" ON public.plasma_dilution_worksheets;
DROP POLICY IF EXISTS "Admins can update plasma dilution worksheets" ON public.plasma_dilution_worksheets;

CREATE POLICY "Internal users can view all plasma dilution worksheets"
ON public.plasma_dilution_worksheets FOR SELECT USING (has_internal_role(auth.uid()));

CREATE POLICY "Internal users can insert plasma dilution worksheets"
ON public.plasma_dilution_worksheets FOR INSERT WITH CHECK (has_internal_role(auth.uid()));

CREATE POLICY "Internal users can update plasma dilution worksheets"
ON public.plasma_dilution_worksheets FOR UPDATE USING (has_internal_role(auth.uid()));

-- === SHIPMENTS ===
DROP POLICY IF EXISTS "Admins can view all shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can insert shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can update shipments" ON public.shipments;

CREATE POLICY "Internal users can view all shipments"
ON public.shipments FOR SELECT USING (has_internal_role(auth.uid()));

CREATE POLICY "Internal users can insert shipments"
ON public.shipments FOR INSERT WITH CHECK (has_internal_role(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Internal users can update shipments"
ON public.shipments FOR UPDATE USING (has_internal_role(auth.uid()));

-- === SCREENING_GUIDELINES (user=SELECT only, admin keeps manage) ===
DROP POLICY IF EXISTS "Admins can view screening guidelines" ON public.screening_guidelines;

CREATE POLICY "Internal users can view screening guidelines"
ON public.screening_guidelines FOR SELECT USING (has_internal_role(auth.uid()));

-- === PARTNERS (user=SELECT only, admin keeps manage) ===
DROP POLICY IF EXISTS "Admins can view all partners" ON public.partners;

CREATE POLICY "Internal users can view all partners"
ON public.partners FOR SELECT USING (has_internal_role(auth.uid()));

-- === PENDING_DONOR_UPDATES (user=SELECT only, admin keeps UPDATE) ===
DROP POLICY IF EXISTS "Admins can view all pending updates" ON public.pending_donor_updates;

CREATE POLICY "Internal users can view all pending updates"
ON public.pending_donor_updates FOR SELECT USING (has_internal_role(auth.uid()));

-- === NOTIFICATIONS ===
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

CREATE POLICY "Internal users can insert notifications"
ON public.notifications FOR INSERT WITH CHECK (has_internal_role(auth.uid()));
