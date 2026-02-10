import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import TableSkeleton from '@/components/TableSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminNavItems } from '@/lib/navItems';
import type { Database } from '@/integrations/supabase/types';

type DonorStatus = Database['public']['Enums']['donor_status'];

interface DonorWithPartner {
  id: string;
  donor_code: string | null;
  din: string | null;
  first_name: string | null;
  last_name: string | null;
  status: DonorStatus;
  submitted_at: string | null;
  created_at: string;
  partners: {
    organization_name: string;
  } | null;
}

const statusStyles: Record<DonorStatus, string> = {
  draft: 'bg-gray-50 text-gray-500 border border-gray-200',
  submitted: 'bg-blue-50 text-blue-600 border border-blue-100',
  under_review: 'bg-amber-50 text-amber-600 border border-amber-100',
  approved: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  rejected: 'bg-red-50 text-red-500 border border-red-100',
};

const statusLabels: Record<DonorStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
};


const AdminDashboard = () => {
  const navigate = useNavigate();
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
        din,
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
    <DashboardLayout navItems={adminNavItems} title="Atlas">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <p className="text-[13px] text-muted-foreground">Active Partners</p>
              <p className="text-2xl font-semibold">{stats.totalPartners}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-[13px] text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-semibold text-amber-600">{stats.pendingReview}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-[13px] text-muted-foreground">Approved This Month</p>
              <p className="text-2xl font-semibold text-emerald-600">{stats.approvedThisMonth}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-[13px] text-muted-foreground">Rejected This Month</p>
              <p className="text-2xl font-semibold text-red-500">{stats.rejectedThisMonth}</p>
            </CardHeader>
          </Card>
        </div>

        {/* Pending Donors */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Pending Review</p>
            <Link to="/admin/donors">
              <Button variant="outline" className="h-9 text-[13px]">View All</Button>
            </Link>
          </div>
          <div className="border border-border rounded-lg">
            {loading ? (
              <TableSkeleton rows={3} cols={5} />
            ) : pendingDonors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-[13px]">
                No donors pending review
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DIN</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingDonors.map((donor) => (
                    <TableRow
                      key={donor.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => navigate(`/admin/donors/${donor.id}`)}
                    >
                      <TableCell className="font-mono text-[13px] py-3.5">{(donor as any).din || donor.donor_code || '—'}</TableCell>
                      <TableCell className="text-[13px] py-3.5">
                        {donor.first_name && donor.last_name
                          ? `${donor.first_name} ${donor.last_name}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground py-3.5">{donor.partners?.organization_name || '—'}</TableCell>
                      <TableCell className="py-3.5">
                        <Badge className={`rounded-md ${statusStyles[donor.status]}`}>
                          {statusLabels[donor.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[13px] py-3.5">
                        {donor.submitted_at
                          ? new Date(donor.submitted_at).toLocaleDateString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>



      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
