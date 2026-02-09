
-- 1. Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id uuid NOT NULL REFERENCES public.donors(id),
  action text NOT NULL, -- 'edit_direct', 'edit_pending', 'edit_approved', 'edit_rejected', 'status_change', 'created'
  changed_by uuid NOT NULL,
  changed_fields jsonb, -- { field: { old: ..., new: ... } }
  metadata jsonb, -- extra context (pending_update_id, source, etc.)
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view their donor audit logs"
  ON public.audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM donors JOIN partners ON partners.id = donors.partner_id
    WHERE donors.id = audit_logs.donor_id AND partners.user_id = auth.uid()
  ));

CREATE POLICY "Partners can insert audit logs for their donors"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    changed_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM donors JOIN partners ON partners.id = donors.partner_id
      WHERE donors.id = audit_logs.donor_id AND partners.user_id = auth.uid()
    )
  );

CREATE INDEX idx_audit_logs_donor_id ON public.audit_logs(donor_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 2. Add source column to pending_donor_updates
ALTER TABLE public.pending_donor_updates
  ADD COLUMN source text NOT NULL DEFAULT 'phone';

-- 3. Allow partners to INSERT into pending_donor_updates for their own donors
CREATE POLICY "Partners can insert pending updates for their donors"
  ON public.pending_donor_updates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM donors JOIN partners ON partners.id = donors.partner_id
    WHERE donors.id = pending_donor_updates.donor_id AND partners.user_id = auth.uid()
  ));
