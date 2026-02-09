import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import DocumentUpload from '@/components/DocumentUpload';
import ShipmentTracking from '@/components/ShipmentTracking';
import CallTranscript from '@/components/CallTranscript';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, Users, FileText, Bell, ArrowLeft, Check, X, Clock, Phone } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Donor = Database['public']['Tables']['donors']['Row'];
type DonorStatus = Database['public']['Enums']['donor_status'];

interface DonorWithPartner extends Donor {
  partners: {
    organization_name: string;
    user_id: string;
  } | null;
}

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
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Partners', href: '/admin/partners', icon: <Users className="h-4 w-4" /> },
  { label: 'Donors', href: '/admin/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Notifications', href: '/admin/notifications', icon: <Bell className="h-4 w-4" /> },
];

const AdminDonorReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [donor, setDonor] = useState<DonorWithPartner | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDonor();
  }, [id]);

  const fetchDonor = async () => {
    const { data, error } = await supabase
      .from('donors')
      .select(`
        *,
        partners (
          organization_name,
          user_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load donor',
      });
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
      .update({
        status: newStatus,
        review_notes: reviewNotes || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      setSaving(false);
      return;
    }

    // Create notification for partner
    if (donor.partners?.user_id) {
      const notificationTitle = newStatus === 'approved' 
        ? 'Donor Approved' 
        : newStatus === 'rejected'
        ? 'Donor Rejected'
        : 'Donor Under Review';
      
      const notificationMessage = newStatus === 'approved'
        ? `Your donor ${donor.donor_code} has been approved.`
        : newStatus === 'rejected'
        ? `Your donor ${donor.donor_code} has been rejected. Please review the notes.`
        : `Your donor ${donor.donor_code} is now under review.`;

      await supabase.from('notifications').insert({
        user_id: donor.partners.user_id,
        title: notificationTitle,
        message: notificationMessage,
        donor_id: donor.id,
      });
    }

    toast({
      title: 'Status Updated',
      description: `Donor has been marked as ${statusLabels[newStatus].toLowerCase()}`,
    });

    fetchDonor();
    setSaving(false);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Admin Panel">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!donor) return null;

  const canReview = donor.status === 'submitted' || donor.status === 'under_review';

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/donors')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono">{donor.donor_code}</h1>
                <Badge className={statusColors[donor.status]}>
                  {statusLabels[donor.status]}
                </Badge>
                {(donor as any).intake_method === 'phone' && (
                  <Badge variant="outline" className="gap-1">
                    <Phone className="h-3 w-3" />
                    Phone Intake
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                From: {donor.partners?.organization_name || 'Direct Admin Entry'}
              </p>
            </div>
          </div>
        </div>

        {/* Review Actions */}
        {canReview && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Review Actions</CardTitle>
              <CardDescription>Approve or reject this donor submission</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reviewNotes">Review Notes</Label>
                <Textarea
                  id="reviewNotes"
                  placeholder="Add notes about your decision (visible to partner)"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-3">
                {donor.status === 'submitted' && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange('under_review')}
                    disabled={saving}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Mark Under Review
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => handleStatusChange('rejected')}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleStatusChange('approved')}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Previous Review Notes */}
        {!canReview && donor.review_notes && (
          <Card className={donor.status === 'rejected' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
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
        {/* Call Transcript (for phone intake) */}
        {(donor as any).intake_method === 'phone' && (
          <CallTranscript donorId={donor.id} />
        )}

        <ShipmentTracking donorId={donor.id} canAdd={false} />

        {/* Documents */}
        <DocumentUpload donorId={donor.id} canUpload={true} />

        {/* Timeline */}
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

export default AdminDonorReview;
