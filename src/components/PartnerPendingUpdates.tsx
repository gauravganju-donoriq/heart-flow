import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface PendingUpdate {
  id: string;
  proposed_changes: Record<string, unknown>;
  status: string;
  created_at: string;
  review_notes: string | null;
  reviewed_at: string | null;
}

const fieldLabels: Record<string, string> = {
  call_type: 'Call Type', caller_name: 'Caller Name', donor_age: 'Age', gender: 'Sex at Birth',
  death_date: 'Date of Death', time_of_death: 'Time of Death', death_type: 'Type of Death',
  death_timezone: 'Time Zone', cause_of_death: 'Cause of Death', clinical_course: 'Clinical Course',
  height_inches: 'Height (inches)', weight_kgs: 'Weight (kgs)', medical_history: 'Medical History',
  high_risk_notes: 'High Risk Notes', donor_accepted: 'Accepted/Deferred', hv_heart_valves: 'Heart Valves',
  hv_pathology_request: 'HV Pathology Request', ai_aorto_iliac: 'Aorto Iliac', fm_femoral: 'Femoral En Bloc',
  sv_saphenous_vein: 'Saphenous Vein', has_autopsy: 'Autopsy', external_donor_id: 'External Donor ID',
  is_prescreen_update: 'Prescreen/Update', courier_update: 'Courier Update', first_name: 'First Name',
  last_name: 'Last Name', date_of_birth: 'Date of Birth', blood_type: 'Blood Type',
  tissue_type: 'Tissue Type', tissue_condition: 'Tissue Condition',
  consent_obtained: 'Consent Obtained', medical_history_reviewed: 'Medical History Reviewed',
};

const formatValue = (val: unknown): string => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
};

const statusBadge: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending Approval', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-500 border-red-200' },
};

const PartnerPendingUpdates = ({ donorId }: { donorId: string }) => {
  const [updates, setUpdates] = useState<PendingUpdate[]>([]);

  useEffect(() => {
    supabase
      .from('pending_donor_updates')
      .select('id, proposed_changes, status, created_at, review_notes, reviewed_at')
      .eq('donor_id', donorId)
      .in('status', ['pending', 'approved', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setUpdates(data as unknown as PendingUpdate[]);
      });
  }, [donorId]);

  if (updates.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Proposed Changes</p>
      {updates.map((update) => {
        const changes = update.proposed_changes || {};
        const changedKeys = Object.keys(changes);
        const badge = statusBadge[update.status] || statusBadge.pending;

        return (
          <Card key={update.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-muted-foreground">
                  {new Date(update.created_at).toLocaleString()} — {changedKeys.length} field{changedKeys.length !== 1 ? 's' : ''}
                </p>
                <Badge variant="outline" className={`rounded-md ${badge.className}`}>{badge.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-2 bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  <div>Field</div>
                  <div>Proposed Value</div>
                </div>
                <div className="divide-y">
                  {changedKeys.map((key) => (
                    <div key={key} className="grid grid-cols-2 px-4 py-2 text-[13px]">
                      <div className="font-medium text-muted-foreground">{fieldLabels[key] || key}</div>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{formatValue(changes[key])}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {update.status === 'rejected' && update.review_notes && (
                <p className="text-[13px] text-muted-foreground">
                  <span className="font-medium">Admin notes:</span> {update.review_notes}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default PartnerPendingUpdates;
