import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import DocumentUpload from '@/components/DocumentUpload';
import ShipmentTracking from '@/components/ShipmentTracking';
import CallTranscript from '@/components/CallTranscript';
import TissueRecoveryForm from '@/components/TissueRecoveryForm';
import PendingDonorUpdates from '@/components/admin/PendingDonorUpdates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, Users, FileText, Bell, ArrowLeft, Check, X, Clock, Phone, Shield } from 'lucide-react';
import AIScreeningPanel from '@/components/admin/AIScreeningPanel';
import type { Database } from '@/integrations/supabase/types';

type Donor = Database['public']['Tables']['donors']['Row'];
type DonorStatus = Database['public']['Enums']['donor_status'];

interface DonorWithPartner extends Donor {
  partners: { organization_name: string; user_id: string } | null;
}

const statusStyles: Record<DonorStatus, string> = {
  draft: 'bg-gray-50 text-gray-500 border border-gray-200',
  submitted: 'bg-blue-50 text-blue-600 border border-blue-100',
  under_review: 'bg-amber-50 text-amber-600 border border-amber-100',
  approved: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  rejected: 'bg-red-50 text-red-500 border border-red-100',
};

const statusLabels: Record<DonorStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected',
};

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Partners', href: '/admin/partners', icon: <Users className="h-4 w-4" /> },
  { label: 'Donors', href: '/admin/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Screening', href: '/admin/screening-settings', icon: <Shield className="h-4 w-4" /> },
  { label: 'Notifications', href: '/admin/notifications', icon: <Bell className="h-4 w-4" /> },
];

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <dt className="text-[13px] text-muted-foreground">{label}</dt>
    <dd className="text-[13px]">{value || '—'}</dd>
  </div>
);

const BoolField = ({ label, value }: { label: string; value: boolean | null | undefined }) => (
  <Field label={label} value={value === true ? 'Yes' : value === false ? 'No' : '—'} />
);

const tabTriggerClass = "rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px] px-4 py-2.5";

const AdminDonorReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [donor, setDonor] = useState<DonorWithPartner | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchDonor(); }, [id]);

  const fetchDonor = async () => {
    const { data, error } = await supabase
      .from('donors')
      .select('*, partners (organization_name, user_id)')
      .eq('id', id)
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load donor' });
      navigate('/admin/donors');
      return;
    }
    setDonor(data as DonorWithPartner);
    setReviewNotes(data.review_notes || '');
    setLoading(false);
  };

  const handleStatusChange = async (newStatus: 'under_review' | 'approved' | 'rejected') => {
    if (!user || !donor) return;
    setSaving(true);

    const { error } = await supabase
      .from('donors')
      .update({ status: newStatus, review_notes: reviewNotes || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setSaving(false);
      return;
    }

    if (donor.partners?.user_id) {
      const title = newStatus === 'approved' ? 'Donor Approved' : newStatus === 'rejected' ? 'Donor Rejected' : 'Donor Under Review';
      const message = newStatus === 'approved'
        ? `Your donor ${donor.donor_code} has been approved.`
        : newStatus === 'rejected'
        ? `Your donor ${donor.donor_code} has been rejected. Please review the notes.`
        : `Your donor ${donor.donor_code} is now under review.`;
      await supabase.from('notifications').insert({ user_id: donor.partners.user_id, title, message, donor_id: donor.id });
    }

    toast({ title: 'Status Updated', description: `Donor has been marked as ${statusLabels[newStatus].toLowerCase()}` });
    fetchDonor();
    setSaving(false);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="DonorIQ">
        <div className="flex items-center justify-center py-12"><div className="text-muted-foreground text-[13px]">Loading...</div></div>
      </DashboardLayout>
    );
  }

  if (!donor) return null;

  const d = donor as any;
  const canReview = donor.status === 'submitted' || donor.status === 'under_review';

  return (
    <DashboardLayout navItems={navItems} title="DonorIQ">
      <div className="space-y-5 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/donors')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold font-mono">{donor.donor_code}</h1>
                {(donor as any).din && <span className="text-sm text-muted-foreground font-mono">{(donor as any).din}</span>}
                <Badge className={`rounded-md ${statusStyles[donor.status]}`}>{statusLabels[donor.status]}</Badge>
                {d.intake_method === 'phone' && (
                  <Badge variant="outline" className="gap-1"><Phone className="h-3 w-3" />Phone Intake</Badge>
                )}
              </div>
              <p className="text-[13px] text-muted-foreground">From: {donor.partners?.organization_name || 'Direct Admin Entry'}</p>
            </div>
          </div>
        </div>

        {/* Pending Updates */}
        <PendingDonorUpdates donorId={donor.id} onUpdated={fetchDonor} />

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
            <TabsTrigger value="overview" className={tabTriggerClass}>Overview</TabsTrigger>
            <TabsTrigger value="clinical" className={tabTriggerClass}>Clinical</TabsTrigger>
            {donor.status === 'approved' && (
              <TabsTrigger value="recovery" className={tabTriggerClass}>Recovery (7033F)</TabsTrigger>
            )}
            <TabsTrigger value="logistics" className={tabTriggerClass}>Logistics</TabsTrigger>
            <TabsTrigger value="documents" className={tabTriggerClass}>Documents</TabsTrigger>
            <TabsTrigger value="screening" className={tabTriggerClass}>AI Screening</TabsTrigger>
            {(canReview || donor.review_notes) && (
              <TabsTrigger value="review" className={tabTriggerClass}>Review</TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-5 mt-5">
            <Card>
              <CardHeader><p className="text-sm font-medium">Identifiers</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-3">
                  <Field label="External Donor ID" value={d.external_donor_id} />
                  <Field label="DIN (Donor Identification Number)" value={d.din} />
                  <Field label="System Code" value={donor.donor_code} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><p className="text-sm font-medium">Call Information</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-3">
                  <Field label="Type of Call (Q1)" value={d.call_type} />
                  <Field label="Caller's Name (Q2)" value={d.caller_name} />
                  <BoolField label="Prescreen/Update (Q24)" value={d.is_prescreen_update} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><p className="text-sm font-medium">Demographics</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="First Name" value={donor.first_name} />
                  <Field label="Last Name" value={donor.last_name} />
                  <Field label="Age (Q4)" value={d.donor_age} />
                  <Field label="Sex at Birth (Q5)" value={donor.gender} />
                  <Field label="Date of Birth" value={donor.date_of_birth ? new Date(donor.date_of_birth).toLocaleDateString() : null} />
                  <Field label="Blood Type" value={donor.blood_type} />
                  <Field label="Height — Inches (Q12)" value={d.height_inches} />
                  <Field label="Weight — Kgs (Q13)" value={d.weight_kgs} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><p className="text-sm font-medium">Death Details</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="Date of Death (Q6)" value={donor.death_date ? new Date(donor.death_date).toLocaleDateString() : null} />
                  <Field label="Time of Death (Q7)" value={d.time_of_death} />
                  <Field label="Time Zone (Q9)" value={d.death_timezone} />
                  <Field label="Type of Death (Q8)" value={d.death_type} />
                  <Field label="Cause of Death (Q10)" value={donor.cause_of_death} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><p className="text-sm font-medium">Timeline</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-3">
                  <Field label="Created" value={new Date(donor.created_at).toLocaleString()} />
                  {donor.submitted_at && <Field label="Submitted" value={new Date(donor.submitted_at).toLocaleString()} />}
                  {donor.reviewed_at && <Field label="Reviewed" value={new Date(donor.reviewed_at).toLocaleString()} />}
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clinical Tab */}
          <TabsContent value="clinical" className="space-y-5 mt-5">
            <Card>
              <CardHeader><p className="text-sm font-medium">Clinical Information</p></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <dt className="text-[13px] text-muted-foreground">Clinical Course (Q11)</dt>
                  <dd className="text-[13px] whitespace-pre-wrap">{d.clinical_course || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted-foreground">Medical History (Q14)</dt>
                  <dd className="text-[13px] whitespace-pre-wrap">{d.medical_history || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted-foreground">High Risk / Additional Notes (Q15)</dt>
                  <dd className="text-[13px] whitespace-pre-wrap">{d.high_risk_notes || '—'}</dd>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><p className="text-sm font-medium">Tissue Recovery</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="Donor Accepted/Deferred (Q16)" value={d.donor_accepted} />
                  <BoolField label="HV — Heart Valves (Q17)" value={d.hv_heart_valves} />
                  <Field label="HV Pathology Request (Q18)" value={d.hv_pathology_request} />
                  <BoolField label="AI — Aorto Iliac (Q19)" value={d.ai_aorto_iliac} />
                  <BoolField label="FM — Femoral En Bloc (Q20)" value={d.fm_femoral} />
                  <BoolField label="SV — Saphenous Vein (Q21)" value={d.sv_saphenous_vein} />
                  <BoolField label="Autopsy (Q22)" value={d.has_autopsy} />
                </dl>
              </CardContent>
          </Card>

            <Card>
              <CardHeader><p className="text-sm font-medium">Compliance</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-2">
                  <BoolField label="Consent Obtained" value={donor.consent_obtained} />
                  <BoolField label="Medical History Reviewed" value={donor.medical_history_reviewed} />
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recovery Tab */}
          {donor.status === 'approved' && (
            <TabsContent value="recovery" className="space-y-5 mt-5">
              <TissueRecoveryForm
                donorId={donor.id}
                donorInfo={{
                  donor_code: donor.donor_code,
                  donor_age: d.donor_age,
                  gender: donor.gender,
                  death_date: donor.death_date,
                  time_of_death: d.time_of_death,
                  death_type: d.death_type,
                  death_timezone: d.death_timezone,
                  external_donor_id: d.external_donor_id,
                  partner_name: donor.partners?.organization_name || null,
                  din: d.din,
                }}
              />
            </TabsContent>
          )}

          {/* Compliance (in Clinical tab was here but got displaced — re-add above) */}

          {/* Logistics Tab */}
          <TabsContent value="logistics" className="space-y-5 mt-5">
            <Card>
              <CardHeader><p className="text-sm font-medium">Logistics</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-2">
                  <Field label="External Donor ID (Q23)" value={d.external_donor_id} />
                  <Field label="Courier Update (Q25)" value={d.courier_update} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><p className="text-sm font-medium">Legacy Tissue Info</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-2">
                  <Field label="Tissue Type" value={donor.tissue_type} />
                  <Field label="Tissue Condition" value={donor.tissue_condition} />
                </dl>
              </CardContent>
            </Card>

            <ShipmentTracking donorId={donor.id} canAdd={false} />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-5 mt-5">
            {d.intake_method === 'phone' && <CallTranscript donorId={donor.id} />}
            <DocumentUpload donorId={donor.id} canUpload={true} />
          </TabsContent>

          {/* AI Screening Tab */}
          <TabsContent value="screening" className="mt-5">
            <AIScreeningPanel donorId={donor.id} />
          </TabsContent>

          {/* Review Tab */}
          {(canReview || donor.review_notes) && (
            <TabsContent value="review" className="space-y-5 mt-5">
              {canReview && (
                <Card className="border border-border bg-muted/30">
                  <CardHeader><p className="text-sm font-medium">Review Actions</p></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reviewNotes" className="text-[13px]">Review Notes</Label>
                      <Textarea id="reviewNotes" placeholder="Add notes about your decision (visible to partner)" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} />
                    </div>
                    <div className="flex items-center gap-3">
                      {donor.status === 'submitted' && (
                        <Button variant="outline" onClick={() => handleStatusChange('under_review')} disabled={saving} className="h-9 text-[13px]"><Clock className="h-4 w-4 mr-2" />Mark Under Review</Button>
                      )}
                      <Button variant="destructive" onClick={() => handleStatusChange('rejected')} disabled={saving} className="h-9 text-[13px]"><X className="h-4 w-4 mr-2" />Reject</Button>
                      <Button onClick={() => handleStatusChange('approved')} disabled={saving} className="bg-green-600 hover:bg-green-700 h-9 text-[13px]"><Check className="h-4 w-4 mr-2" />Approve</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!canReview && donor.review_notes && (
                <div className={`p-4 border-l-4 rounded-r-lg ${donor.status === 'rejected' ? 'border-l-red-400 bg-muted/30' : 'border-l-emerald-400 bg-muted/30'}`}>
                  <p className="text-sm font-medium mb-1">Review Notes</p>
                  <p className="text-[13px]">{donor.review_notes}</p>
                  {donor.reviewed_at && <p className="text-xs text-muted-foreground mt-2">Reviewed on {new Date(donor.reviewed_at).toLocaleString()}</p>}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDonorReview;
