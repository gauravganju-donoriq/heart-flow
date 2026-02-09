import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Check, X, ArrowRight } from 'lucide-react';

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
    <div className="space-y-4">
      {updates.map((update) => {
        const changes = update.proposed_changes || {};
        const changedKeys = Object.keys(changes).filter(
          key => changes[key] !== null && changes[key] !== undefined && changes[key] !== ''
        );

        return (
          <Card key={update.id} className="border border-amber-200 bg-amber-50/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    Pending Update
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 rounded-md">
                      Awaiting Approval
                    </Badge>
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    Received {new Date(update.created_at).toLocaleString()} — {changedKeys.length} field{changedKeys.length !== 1 ? 's' : ''} proposed
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Side-by-side diff */}
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-3 bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  <div>Field</div>
                  <div>Current Value</div>
                  <div>Proposed Value</div>
                </div>
                <div className="divide-y">
                  {changedKeys.map((key) => {
                    const currentVal = currentDonor[key];
                    const proposedVal = changes[key];
                    const isChanged = formatValue(currentVal) !== formatValue(proposedVal);

                    return (
                      <div key={key} className={`grid grid-cols-3 px-4 py-2 text-[13px] ${isChanged ? 'bg-amber-50/50' : ''}`}>
                        <div className="font-medium text-muted-foreground">{fieldLabels[key] || key}</div>
                        <div>{formatValue(currentVal)}</div>
                        <div className="flex items-center gap-2">
                          {isChanged && <ArrowRight className="h-3 w-3 text-amber-600 shrink-0" />}
                          <span className={isChanged ? 'font-medium text-amber-800' : ''}>
                            {formatValue(proposedVal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review notes */}
              <div className="space-y-2">
                <Label className="text-[13px]">Review Notes (optional)</Label>
                <Textarea
                  placeholder="Add notes about your decision..."
                  value={reviewNotes[update.id] || ''}
                  onChange={(e) => setReviewNotes(prev => ({ ...prev, [update.id]: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  variant="destructive"
                  onClick={() => handleAction(update.id, 'rejected')}
                  disabled={saving === update.id}
                  className="h-9 text-[13px]"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject Changes
                </Button>
                <Button
                  onClick={() => handleAction(update.id, 'approved')}
                  disabled={saving === update.id}
                  className="bg-green-600 hover:bg-green-700 h-9 text-[13px]"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve & Apply Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default PendingDonorUpdates;
