import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import RetellSetup from '@/components/admin/RetellSetup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutDashboard, Users, FileText, Bell, Eye } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type DonorStatus = Database['public']['Enums']['donor_status'];

interface DonorWithPartner {
  id: string;
  donor_code: string | null;
  first_name: string | null;
  last_name: string | null;
  status: DonorStatus;
  submitted_at: string | null;
  created_at: string;
  partners: {
    organization_name: string;
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

const AdminDashboard = () => {
  const [pendingDonors, setPendingDonors] = useState<DonorWithPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPartners: 0,
    pendingReview: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch pending donors
    const { data: donors } = await supabase
      .from('donors')
      .select(`
        id,
        donor_code,
        first_name,
        last_name,
        status,
        submitted_at,
        created_at,
        partners (
          organization_name
        )
      `)
      .in('status', ['submitted', 'under_review'])
      .order('submitted_at', { ascending: true })
      .limit(10);

    if (donors) {
      setPendingDonors(donors as DonorWithPartner[]);
    }

    // Fetch stats
    const { count: partnersCount } = await supabase
      .from('partners')
      .select('*', { count: 'exact', head: true });

    const { count: pendingCount } = await supabase
      .from('donors')
      .select('*', { count: 'exact', head: true })
      .in('status', ['submitted', 'under_review']);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: approvedCount } = await supabase
      .from('donors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('reviewed_at', startOfMonth.toISOString());

    const { count: rejectedCount } = await supabase
      .from('donors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected')
      .gte('reviewed_at', startOfMonth.toISOString());

    setStats({
      totalPartners: partnersCount || 0,
      pendingReview: pendingCount || 0,
      approvedThisMonth: approvedCount || 0,
      rejectedThisMonth: rejectedCount || 0,
    });

    setLoading(false);
  };

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of partner submissions</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Partners</CardDescription>
              <CardTitle className="text-3xl">{stats.totalPartners}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">{stats.pendingReview}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approved This Month</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.approvedThisMonth}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rejected This Month</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.rejectedThisMonth}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Pending Donors */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Review</CardTitle>
                <CardDescription>Donors awaiting your review</CardDescription>
              </div>
              <Link to="/admin/donors">
                <Button variant="outline">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : pendingDonors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No donors pending review
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingDonors.map((donor) => (
                    <TableRow key={donor.id}>
                      <TableCell className="font-mono">{donor.donor_code}</TableCell>
                      <TableCell>
                        {donor.first_name && donor.last_name
                          ? `${donor.first_name} ${donor.last_name}`
                          : '—'}
                      </TableCell>
                      <TableCell>{donor.partners?.organization_name || '—'}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[donor.status]}>
                          {statusLabels[donor.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {donor.submitted_at
                          ? new Date(donor.submitted_at).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Link to={`/admin/donors/${donor.id}`}>
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
        {/* Retell AI Phone Intake */}
        <RetellSetup />
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
