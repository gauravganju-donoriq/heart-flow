import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { triggerAutoScreening } from '@/lib/autoScreen';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import DocumentUpload from '@/components/DocumentUpload';
import ShipmentTracking from '@/components/ShipmentTracking';
import CallTranscript from '@/components/CallTranscript';
import PartnerPendingUpdates from '@/components/PartnerPendingUpdates';
import TissueRecoveryForm from '@/components/TissueRecoveryForm';
import HeartRequestForm from '@/components/HeartRequestForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { ResponsiveTabsList, type TabItem } from '@/components/ui/responsive-tabs';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, FileText, Bell, ArrowLeft, Edit, Send, Phone } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Donor = Database['public']['Tables']['donors']['Row'];
type DonorStatus = Database['public']['Enums']['donor_status'];

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
  { label: 'Dashboard', href: '/partner', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Donors', href: '/partner/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Notifications', href: '/partner/notifications', icon: <Bell className="h-4 w-4" /> },
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

const DonorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [donor, setDonor] = useState<Donor | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchDonor(); }, [id]);

  const fetchDonor = async () => {
    const { data, error } = await supabase.from('donors').select('*').eq('id', id).single();
    if (error) { toast({ variant: 'destructive', title: 'Error', description: 'Failed to load donor' }); navigate('/partner/donors'); return; }
    setDonor(data); setLoading(false);
  };

  const handleSubmit = async () => {
    const { error } = await supabase.from('donors').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }
    // Audit log
    if (user) {
      await (supabase.from as any)('audit_logs').insert({
        donor_id: id!,
        action: 'status_change',
        changed_by: user.id,
        changed_fields: { status: { old: 'draft', new: 'submitted' } },
        metadata: { source: 'manual' },
      });
    }
    toast({ title: 'Submitted', description: 'Donor has been submitted for review' });
    if (id) triggerAutoScreening(id);
    fetchDonor();
  };

  if (loading) {
    return (<DashboardLayout navItems={navItems} title="Atlas"><div className="flex items-center justify-center py-12"><div className="text-muted-foreground text-[13px]">Loading...</div></div></DashboardLayout>);
  }

  if (!donor) return null;

  const d = donor as any;
  const isDraft = donor.status === 'draft';

  return (
    <DashboardLayout navItems={navItems} title="Atlas">
      <div className="space-y-5 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/partner/donors')}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold font-mono">{donor.donor_code}</h1>
                {(donor as any).din && <span className="text-sm text-muted-foreground font-mono">{(donor as any).din}</span>}
                <Badge className={`rounded-md ${statusStyles[donor.status]}`}>{statusLabels[donor.status]}</Badge>
                {donor.intake_method === 'phone' && <Badge variant="outline" className="gap-1"><Phone className="h-3 w-3" />Phone Intake</Badge>}
              </div>
              <p className="text-[13px] text-muted-foreground">{donor.first_name && donor.last_name ? `${donor.first_name} ${donor.last_name}` : 'Unnamed donor'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/partner/donors/${id}/edit`}>
              <Button variant="outline" size="sm" className="h-9 text-[13px]">
                <Edit className="h-3.5 w-3.5 mr-1.5" />{isDraft ? 'Edit' : 'Propose Changes'}
              </Button>
            </Link>
            {isDraft && (
              <Button onClick={handleSubmit} size="sm" className="h-9 text-[13px]"><Send className="h-3.5 w-3.5 mr-1.5" />Submit</Button>
            )}
          </div>
        </div>

        {/* Review Notes */}
        {donor.review_notes && (
          <Card>
            <CardHeader><p className="text-sm font-medium">Review Notes</p></CardHeader>
            <CardContent>
              <p className="text-[13px]">{donor.review_notes}</p>
              {donor.reviewed_at && (
                <p className="text-[12px] text-muted-foreground mt-2">Reviewed on {new Date(donor.reviewed_at).toLocaleString()}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pending Updates (read-only for partner) */}
        {!isDraft && id && <PartnerPendingUpdates donorId={id} />}

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <ResponsiveTabsList
            tabs={[
              { value: 'overview', label: 'Overview' },
              { value: 'clinical', label: 'Clinical' },
              ...(donor.status === 'approved' ? [{ value: 'recovery', label: 'Recovery (7033F)' }] : []),
              ...(donor.status === 'approved' && d.hv_heart_valves ? [{ value: 'heart_request', label: 'Heart Request (7117F)' }] : []),
              { value: 'logistics', label: 'Logistics' },
              { value: 'documents', label: 'Documents' },
            ]}
            activeValue={activeTab}
            onValueChange={setActiveTab}
          />

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
                  <Field label="Type of Call" value={d.call_type} />
                  <Field label="Caller's Name" value={d.caller_name} />
                  <BoolField label="Prescreen/Update" value={d.is_prescreen_update} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><p className="text-sm font-medium">Demographics</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="First Name" value={donor.first_name} />
                  <Field label="Last Name" value={donor.last_name} />
                  <Field label="Age" value={d.donor_age} />
                  <Field label="Sex at Birth" value={donor.gender} />
                  <Field label="Date of Birth" value={donor.date_of_birth ? new Date(donor.date_of_birth).toLocaleDateString() : null} />
                  <Field label="Blood Type" value={donor.blood_type} />
                  <Field label="Height (in)" value={d.height_inches} />
                  <Field label="Weight (kg)" value={d.weight_kgs} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><p className="text-sm font-medium">Death Details</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="Date of Death" value={donor.death_date ? new Date(donor.death_date).toLocaleDateString() : null} />
                  <Field label="Time of Death" value={d.time_of_death} />
                  <Field label="Time Zone" value={d.death_timezone} />
                  <Field label="Type of Death" value={d.death_type} />
                  <Field label="Cause of Death" value={donor.cause_of_death} />
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
                  <dt className="text-[13px] text-muted-foreground">Clinical Course</dt>
                  <dd className="text-[13px] whitespace-pre-wrap">{d.clinical_course || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted-foreground">Medical History</dt>
                  <dd className="text-[13px] whitespace-pre-wrap">{d.medical_history || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted-foreground">High Risk / Additional Notes</dt>
                  <dd className="text-[13px] whitespace-pre-wrap">{d.high_risk_notes || '—'}</dd>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><p className="text-sm font-medium">Tissue Recovery</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="Donor Accepted/Deferred" value={d.donor_accepted} />
                  <BoolField label="HV — Heart Valves" value={d.hv_heart_valves} />
                  <Field label="HV Pathology Request" value={d.hv_pathology_request} />
                  <BoolField label="AI — Aorto Iliac" value={d.ai_aorto_iliac} />
                  <BoolField label="FM — Femoral En Bloc" value={d.fm_femoral} />
                  <BoolField label="SV — Saphenous Vein" value={d.sv_saphenous_vein} />
                  <BoolField label="Autopsy" value={d.has_autopsy} />
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
              <TissueRecoveryForm donorId={donor.id} donorInfo={{ donor_code: donor.donor_code, donor_age: d.donor_age, gender: donor.gender, death_date: donor.death_date, time_of_death: d.time_of_death, death_type: d.death_type, death_timezone: d.death_timezone, external_donor_id: d.external_donor_id, partner_name: null, din: d.din, hv_heart_valves: d.hv_heart_valves, ai_aorto_iliac: d.ai_aorto_iliac, fm_femoral: d.fm_femoral, sv_saphenous_vein: d.sv_saphenous_vein }} />
            </TabsContent>
          )}

          {/* Heart Request Tab */}
          {donor.status === 'approved' && d.hv_heart_valves && (
            <TabsContent value="heart_request" className="space-y-5 mt-5">
              <HeartRequestForm
                donorId={donor.id}
                donorInfo={{
                  first_name: donor.first_name,
                  last_name: donor.last_name,
                  gender: donor.gender,
                  donor_age: d.donor_age,
                  height_inches: d.height_inches,
                  weight_kgs: d.weight_kgs,
                  cause_of_death: donor.cause_of_death,
                  external_donor_id: d.external_donor_id,
                  din: d.din,
                  partner_name: null,
                }}
              />
            </TabsContent>
          )}


          {/* Logistics Tab */}
          <TabsContent value="logistics" className="space-y-5 mt-5">
            <Card>
              <CardHeader><p className="text-sm font-medium">Shipping & Courier</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-2">
                  <Field label="External Donor ID" value={d.external_donor_id} />
                  <Field label="Courier Update" value={d.courier_update} />
                </dl>
              </CardContent>
            </Card>

            {(donor.tissue_type || donor.tissue_condition) && (
              <Card>
                <CardHeader><p className="text-sm font-medium">Tissue Info</p></CardHeader>
                <CardContent>
                  <dl className="grid gap-4 md:grid-cols-2">
                    <Field label="Tissue Type" value={donor.tissue_type} />
                    <Field label="Tissue Condition" value={donor.tissue_condition} />
                  </dl>
                </CardContent>
              </Card>
            )}

            <ShipmentTracking donorId={donor.id} canAdd={true} />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-5 mt-5">
            {donor.intake_method === 'phone' && <CallTranscript donorId={donor.id} />}
            <DocumentUpload donorId={donor.id} canUpload={true} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DonorDetail;
