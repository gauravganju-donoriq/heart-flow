import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Check, X, ArrowRight, ChevronDown } from 'lucide-react';

interface PendingUpdate {
  id: string;
  donor_id: string;
  proposed_changes: Record<string, unknown>;
  status: string;
  review_notes: string | null;
  created_at: string;
  donors: {
    donor_code: string | null;
    status: string;
    partners: { organization_name: string } | null;
  } | null;
}

const fieldLabels: Record<string, string> = {
  call_type: 'Call Type',
  caller_name: 'Caller Name',
  donor_age: 'Age',
  gender: 'Sex at Birth',
  death_date: 'Date of Death',
  time_of_death: 'Time of Death',
  death_type: 'Type of Death',
  death_timezone: 'Time Zone',
  cause_of_death: 'Cause of Death',
  clinical_course: 'Clinical Course',
  height_inches: 'Height (inches)',
  weight_kgs: 'Weight (kgs)',
  medical_history: 'Medical History',
  high_risk_notes: 'High Risk Notes',
  donor_accepted: 'Accepted/Deferred',
  hv_heart_valves: 'Heart Valves',
  hv_pathology_request: 'HV Pathology Request',
  ai_aorto_iliac: 'Aorto Iliac',
  fm_femoral: 'Femoral En Bloc',
  sv_saphenous_vein: 'Saphenous Vein',
  has_autopsy: 'Autopsy',
  external_donor_id: 'External Donor ID',
  is_prescreen_update: 'Prescreen/Update',
  courier_update: 'Courier Update',
  first_name: 'First Name',
  last_name: 'Last Name',
  date_of_birth: 'Date of Birth',
  blood_type: 'Blood Type',
  tissue_type: 'Tissue Type',
  tissue_condition: 'Tissue Condition',
};

const formatValue = (val: unknown): string => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
};

interface PendingDonorUpdatesProps {
  donorId: string;
  onUpdated?: () => void;
}

const PendingDonorUpdates = ({ donorId, onUpdated }: PendingDonorUpdatesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [updates, setUpdates] = useState<PendingUpdate[]>([]);
  const [currentDonor, setCurrentDonor] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [donorId]);

  const fetchData = async () => {
    const [updatesRes, donorRes] = await Promise.all([
      supabase
        .from('pending_donor_updates')
        .select('*, donors(donor_code, status, partners(organization_name))')
        .eq('donor_id', donorId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('donors')
        .select('*')
        .eq('id', donorId)
        .single(),
    ]);

    if (updatesRes.data) setUpdates(updatesRes.data as unknown as PendingUpdate[]);
    if (donorRes.data) setCurrentDonor(donorRes.data as Record<string, unknown>);
    setLoading(false);
  };

  const handleAction = async (updateId: string, action: 'approved' | 'rejected') => {
    if (!user) return;
    setSaving(updateId);

    const update = updates.find(u => u.id === updateId);
    if (!update) return;

    // Build before/after diff for audit
    const changedFieldsDiff: Record<string, { old: unknown; new: unknown }> = {};
    const changes = update.proposed_changes || {};
    for (const key of Object.keys(changes)) {
      changedFieldsDiff[key] = { old: currentDonor[key] ?? null, new: changes[key] };
    }

    if (action === 'approved') {
      const { error: donorError } = await supabase
        .from('donors')
        .update(update.proposed_changes as Record<string, unknown>)
        .eq('id', donorId);

      if (donorError) {
        toast({ variant: 'destructive', title: 'Error', description: `Failed to apply changes: ${donorError.message}` });
        setSaving(null);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('pending_donor_updates')
      .update({
        status: action,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes[updateId] || null,
      })
      .eq('id', updateId);

    if (updateError) {
      toast({ variant: 'destructive', title: 'Error', description: updateError.message });
      setSaving(null);
      return;
    }

    // Write audit log
    await (supabase.from as any)('audit_logs').insert({
      donor_id: donorId,
      action: action === 'approved' ? 'edit_approved' : 'edit_rejected',
      changed_by: user.id,
      changed_fields: changedFieldsDiff,
      metadata: { pending_update_id: updateId, review_notes: reviewNotes[updateId] || null },
    });

    // Notify partner
    const donor = update.donors;
    if (donor) {
      const { data: partnerData } = await supabase
        .from('donors')
        .select('partners(user_id)')
        .eq('id', donorId)
        .single();

      const partnerId = (partnerData as any)?.partners?.user_id;
      if (partnerId) {
        const title = action === 'approved' ? 'Update Approved' : 'Update Rejected';
        const message = action === 'approved'
          ? `Proposed changes to donor ${donor.donor_code} have been approved and applied.`
          : `Proposed changes to donor ${donor.donor_code} have been rejected.${reviewNotes[updateId] ? ` Notes: ${reviewNotes[updateId]}` : ''}`;

        await supabase.from('notifications').insert({
          user_id: partnerId,
          title,
          message,
          donor_id: donorId,
        });
      }
    }

    toast({
      title: action === 'approved' ? 'Changes Applied' : 'Changes Rejected',
      description: action === 'approved'
        ? 'The proposed updates have been applied to the donor record.'
        : 'The proposed updates have been rejected.',
    });

    setSaving(null);
    fetchData();
    onUpdated?.();
  };

  if (loading) return null;
  if (updates.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Pending Updates</p>
      <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
        {updates.map((update) => {
          const changes = update.proposed_changes || {};
          const changedKeys = Object.keys(changes).filter(
            key => changes[key] !== null && changes[key] !== undefined && changes[key] !== ''
          );

          return (
            <Collapsible key={update.id}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-muted/30 transition-colors text-left group">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 rounded-md text-[11px] shrink-0">
                    Awaiting Approval
                  </Badge>
                  <span className="text-[13px] text-muted-foreground truncate">
                    {changedKeys.length} field{changedKeys.length !== 1 ? 's' : ''} · {new Date(update.created_at).toLocaleDateString()}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-5 pb-5 space-y-4">
                  {/* Diff table */}
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="grid grid-cols-3 bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                      <div>Field</div>
                      <div>Current</div>
                      <div>Proposed</div>
                    </div>
                    <div className="divide-y divide-border">
                      {changedKeys.map((key) => {
                        const currentVal = currentDonor[key];
                        const proposedVal = changes[key];
                        const isChanged = formatValue(currentVal) !== formatValue(proposedVal);

                        return (
                          <div key={key} className="grid grid-cols-3 px-4 py-2 text-[13px]">
                            <div className="font-medium text-muted-foreground">{fieldLabels[key] || key}</div>
                            <div className="text-muted-foreground">{formatValue(currentVal)}</div>
                            <div className="flex items-center gap-2">
                              {isChanged && <ArrowRight className="h-3 w-3 text-amber-600 shrink-0" />}
                              <span className={isChanged ? 'font-medium' : ''}>
                                {formatValue(proposedVal)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review notes */}
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Review Notes (optional)</Label>
                    <Textarea
                      placeholder="Add notes about your decision..."
                      value={reviewNotes[update.id] || ''}
                      onChange={(e) => setReviewNotes(prev => ({ ...prev, [update.id]: e.target.value }))}
                      rows={2}
                      className="text-[13px]"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleAction(update.id, 'rejected')}
                      disabled={saving === update.id}
                      className="h-8 text-[13px] text-destructive hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleAction(update.id, 'approved')}
                      disabled={saving === update.id}
                      className="h-8 text-[13px]"
                    >
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      Approve & Apply
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};

export default PendingDonorUpdates;
