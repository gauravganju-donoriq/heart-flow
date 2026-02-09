import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { triggerAutoScreening } from '@/lib/autoScreen';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import DocumentUpload from '@/components/DocumentUpload';
import ShipmentTracking from '@/components/ShipmentTracking';
import CallTranscript from '@/components/CallTranscript';
import TissueRecoveryForm from '@/components/TissueRecoveryForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, FileText, Bell, ArrowLeft, Edit, Send, Phone } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Donor = Database['public']['Tables']['donors']['Row'];
type DonorStatus = Database['public']['Enums']['donor_status'];

const statusColors: Record<DonorStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
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
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="font-medium">{value || '—'}</dd>
  </div>
);

const BoolField = ({ label, value }: { label: string; value: boolean | null | undefined }) => (
  <Field label={label} value={value === true ? 'Yes' : value === false ? 'No' : '—'} />
);

const DonorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [donor, setDonor] = useState<Donor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDonor(); }, [id]);

  const fetchDonor = async () => {
    const { data, error } = await supabase.from('donors').select('*').eq('id', id).single();
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load donor' });
      navigate('/partner/donors');
      return;
    }
    setDonor(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    const { error } = await supabase.from('donors').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }
    toast({ title: 'Submitted', description: 'Donor has been submitted for review' });
    if (id) triggerAutoScreening(id);
    fetchDonor();
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Partner Portal">
        <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>
      </DashboardLayout>
    );
  }

  if (!donor) return null;

  const d = donor as any;
  const isDraft = donor.status === 'draft';

  return (
    <DashboardLayout navItems={navItems} title="Partner Portal">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/partner/donors')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono">{donor.donor_code}</h1>
                <Badge className={statusColors[donor.status]}>{statusLabels[donor.status]}</Badge>
                {donor.intake_method === 'phone' && (
                  <Badge variant="outline" className="gap-1"><Phone className="h-3 w-3" />Phone Intake</Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {donor.first_name && donor.last_name ? `${donor.first_name} ${donor.last_name}` : 'Unnamed donor'}
              </p>
            </div>
          </div>
          {isDraft && (
            <div className="flex items-center gap-2">
              <Link to={`/partner/donors/${id}/edit`}>
                <Button variant="outline"><Edit className="h-4 w-4 mr-2" />Edit</Button>
              </Link>
              <Button onClick={handleSubmit}><Send className="h-4 w-4 mr-2" />Submit</Button>
            </div>
          )}
        </div>

        {/* Review Notes */}
        {donor.review_notes && (
          <Card className={donor.status === 'rejected' ? 'border-red-200 bg-red-50' : ''}>
            <CardHeader><CardTitle>Review Notes</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm">{donor.review_notes}</p>
              {donor.reviewed_at && <p className="text-xs text-muted-foreground mt-2">Reviewed on {new Date(donor.reviewed_at).toLocaleString()}</p>}
            </CardContent>
          </Card>
        )}

        {/* Call Information */}
        <Card>
          <CardHeader><CardTitle>Call Information</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-3">
              <Field label="Type of Call" value={d.call_type} />
              <Field label="Caller's Name" value={d.caller_name} />
              <BoolField label="Prescreen/Update" value={d.is_prescreen_update} />
            </dl>
          </CardContent>
        </Card>

        {/* Demographics */}
        <Card>
          <CardHeader><CardTitle>Demographics</CardTitle></CardHeader>
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

        {/* Death Details */}
        <Card>
          <CardHeader><CardTitle>Death Details</CardTitle></CardHeader>
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

        {/* Clinical */}
        <Card>
          <CardHeader><CardTitle>Clinical Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm text-muted-foreground">Clinical Course</dt>
              <dd className="font-medium whitespace-pre-wrap">{d.clinical_course || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Medical History</dt>
              <dd className="font-medium whitespace-pre-wrap">{d.medical_history || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">High Risk / Additional Notes</dt>
              <dd className="font-medium whitespace-pre-wrap">{d.high_risk_notes || '—'}</dd>
            </div>
          </CardContent>
        </Card>

        {/* Tissue Recovery */}
        <Card>
          <CardHeader><CardTitle>Tissue Recovery</CardTitle></CardHeader>
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

        {/* 7033F Tissue Recovery Form — only for accepted donors */}
        {donor.status === 'approved' && (
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
              partner_name: null,
            }}
          />
        )}

        {/* Logistics */}
        <Card>
          <CardHeader><CardTitle>Logistics</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-2">
              <Field label="External Donor ID" value={d.external_donor_id} />
              <Field label="Courier Update" value={d.courier_update} />
            </dl>
          </CardContent>
        </Card>

        {/* Legacy Tissue */}
        <Card>
          <CardHeader><CardTitle>Tissue Info</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-2">
              <Field label="Tissue Type" value={donor.tissue_type} />
              <Field label="Tissue Condition" value={donor.tissue_condition} />
            </dl>
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card>
          <CardHeader><CardTitle>Compliance</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-2">
              <BoolField label="Consent Obtained" value={donor.consent_obtained} />
              <BoolField label="Medical History Reviewed" value={donor.medical_history_reviewed} />
            </dl>
          </CardContent>
        </Card>

        {/* Call Transcript */}
        {donor.intake_method === 'phone' && <CallTranscript donorId={donor.id} />}

        <ShipmentTracking donorId={donor.id} canAdd={isDraft} />
        <DocumentUpload donorId={donor.id} canUpload={true} />

        {/* Timeline */}
        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-3">
              <Field label="Created" value={new Date(donor.created_at).toLocaleString()} />
              {donor.submitted_at && <Field label="Submitted" value={new Date(donor.submitted_at).toLocaleString()} />}
              {donor.reviewed_at && <Field label="Reviewed" value={new Date(donor.reviewed_at).toLocaleString()} />}
            </dl>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DonorDetail;
