import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import DocumentUpload from '@/components/DocumentUpload';
import ShipmentTracking from '@/components/ShipmentTracking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, FileText, Bell, ArrowLeft, Edit, Send } from 'lucide-react';
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
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const navItems = [
  { label: 'Dashboard', href: '/partner', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Donors', href: '/partner/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Notifications', href: '/partner/notifications', icon: <Bell className="h-4 w-4" /> },
];

const DonorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [donor, setDonor] = useState<Donor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonor();
  }, [id]);

  const fetchDonor = async () => {
    const { data, error } = await supabase
      .from('donors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load donor',
      });
      navigate('/partner/donors');
      return;
    }

    setDonor(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    const { error } = await supabase
      .from('donors')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Submitted',
      description: 'Donor has been submitted for review',
    });

    fetchDonor();
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Partner Portal">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!donor) return null;

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
                <Badge className={statusColors[donor.status]}>
                  {statusLabels[donor.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {donor.first_name && donor.last_name
                  ? `${donor.first_name} ${donor.last_name}`
                  : 'Unnamed donor'}
              </p>
            </div>
          </div>
          {isDraft && (
            <div className="flex items-center gap-2">
              <Link to={`/partner/donors/${id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button onClick={handleSubmit}>
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </div>
          )}
        </div>

        {/* Review Notes (if rejected or has notes) */}
        {donor.review_notes && (
          <Card className={donor.status === 'rejected' ? 'border-red-200 bg-red-50' : ''}>
            <CardHeader>
              <CardTitle>Review Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{donor.review_notes}</p>
              {donor.reviewed_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Reviewed on {new Date(donor.reviewed_at).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Demographics */}
        <Card>
          <CardHeader>
            <CardTitle>Demographics</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-sm text-muted-foreground">First Name</dt>
                <dd className="font-medium">{donor.first_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Last Name</dt>
                <dd className="font-medium">{donor.last_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Date of Birth</dt>
                <dd className="font-medium">
                  {donor.date_of_birth
                    ? new Date(donor.date_of_birth).toLocaleDateString()
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Gender</dt>
                <dd className="font-medium capitalize">{donor.gender || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Blood Type</dt>
                <dd className="font-medium">{donor.blood_type || '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Tissue Condition */}
        <Card>
          <CardHeader>
            <CardTitle>Tissue Condition</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Cause of Death</dt>
                <dd className="font-medium">{donor.cause_of_death || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Date of Death</dt>
                <dd className="font-medium">
                  {donor.death_date
                    ? new Date(donor.death_date).toLocaleDateString()
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Tissue Type</dt>
                <dd className="font-medium capitalize">{donor.tissue_type || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Tissue Condition</dt>
                <dd className="font-medium capitalize">{donor.tissue_condition || '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Consent Obtained</dt>
                <dd className="font-medium">{donor.consent_obtained ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Medical History Reviewed</dt>
                <dd className="font-medium">{donor.medical_history_reviewed ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Shipments */}
        <ShipmentTracking donorId={donor.id} canAdd={isDraft} />

        {/* Documents */}
        <DocumentUpload donorId={donor.id} canUpload={isDraft} />

        {/* Timestamps */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-3">
              <div>
                <dt className="text-sm text-muted-foreground">Created</dt>
                <dd className="font-medium">{new Date(donor.created_at).toLocaleString()}</dd>
              </div>
              {donor.submitted_at && (
                <div>
                  <dt className="text-sm text-muted-foreground">Submitted</dt>
                  <dd className="font-medium">{new Date(donor.submitted_at).toLocaleString()}</dd>
                </div>
              )}
              {donor.reviewed_at && (
                <div>
                  <dt className="text-sm text-muted-foreground">Reviewed</dt>
                  <dd className="font-medium">{new Date(donor.reviewed_at).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DonorDetail;
