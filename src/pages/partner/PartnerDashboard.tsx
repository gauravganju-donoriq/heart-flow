import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutDashboard, FileText, Bell, Plus, Eye, Phone } from 'lucide-react';
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

const PartnerDashboard = () => {
  const { partnerId } = useAuth();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [intakePhone, setIntakePhone] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    if (partnerId) {
      fetchDonors();
    }
    fetchIntakePhone();
  }, [partnerId]);

  const fetchIntakePhone = async () => {
    try {
      const { data } = await supabase.functions.invoke('get-intake-phone');
      if (data?.phone_number) setIntakePhone(data.phone_number);
    } catch {
      // Phone intake may not be configured — that's fine
    }
  };

  const fetchDonors = async () => {
    if (!partnerId) return;

    const { data, error } = await supabase
      .from('donors')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setDonors(data);
      
      // Fetch stats
      const { count: total } = await supabase
        .from('donors')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId);
      
      const { count: draft } = await supabase
        .from('donors')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .eq('status', 'draft');

      const { count: submitted } = await supabase
        .from('donors')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .in('status', ['submitted', 'under_review']);

      const { count: approved } = await supabase
        .from('donors')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .eq('status', 'approved');

      const { count: rejected } = await supabase
        .from('donors')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .eq('status', 'rejected');

      setStats({
        total: total || 0,
        draft: draft || 0,
        submitted: submitted || 0,
        approved: approved || 0,
        rejected: rejected || 0,
      });
    }

    setLoading(false);
  };

  return (
    <DashboardLayout navItems={navItems} title="Partner Portal">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your donor submissions</p>
          </div>
          <Link to="/partner/donors/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Donor
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Donors</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Drafts</CardDescription>
              <CardTitle className="text-3xl">{stats.draft}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-3xl">{stats.submitted}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Phone Intake */}
        {intakePhone && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <CardTitle>Phone Intake Line</CardTitle>
              </div>
              <CardDescription>
                Call to submit or update donor information by phone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono font-bold tracking-wide">{intakePhone}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Our AI agent will walk you through the screening questions and automatically create or update a donor record.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Donors */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Donors</CardTitle>
            <CardDescription>Your latest donor submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : donors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No donors yet</p>
                <Link to="/partner/donors/new">
                  <Button variant="outline">Add Your First Donor</Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donors.map((donor) => (
                    <TableRow key={donor.id}>
                      <TableCell className="font-mono">{donor.donor_code}</TableCell>
                      <TableCell>
                        {donor.first_name && donor.last_name
                          ? `${donor.first_name} ${donor.last_name}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[donor.status]}>
                          {statusLabels[donor.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(donor.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link to={`/partner/donors/${donor.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PartnerDashboard;
