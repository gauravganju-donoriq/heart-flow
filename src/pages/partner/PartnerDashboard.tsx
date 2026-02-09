import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutDashboard, FileText, Bell, Plus, Phone } from 'lucide-react';
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

const PartnerDashboard = () => {
  const { partnerId } = useAuth();
  const navigate = useNavigate();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [intakePhone, setIntakePhone] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, draft: 0, submitted: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    if (partnerId) { fetchDonors(); }
    fetchIntakePhone();
  }, [partnerId]);

  const fetchIntakePhone = async () => {
    try {
      const { data } = await supabase.functions.invoke('get-intake-phone');
      if (data?.phone_number) setIntakePhone(data.phone_number);
    } catch { }
  };

  const fetchDonors = async () => {
    if (!partnerId) return;
    const { data, error } = await supabase.from('donors').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false }).limit(5);
    if (!error && data) {
      setDonors(data);
      const { count: total } = await supabase.from('donors').select('*', { count: 'exact', head: true }).eq('partner_id', partnerId);
      const { count: draft } = await supabase.from('donors').select('*', { count: 'exact', head: true }).eq('partner_id', partnerId).eq('status', 'draft');
      const { count: submitted } = await supabase.from('donors').select('*', { count: 'exact', head: true }).eq('partner_id', partnerId).in('status', ['submitted', 'under_review']);
      const { count: approved } = await supabase.from('donors').select('*', { count: 'exact', head: true }).eq('partner_id', partnerId).eq('status', 'approved');
      const { count: rejected } = await supabase.from('donors').select('*', { count: 'exact', head: true }).eq('partner_id', partnerId).eq('status', 'rejected');
      setStats({ total: total || 0, draft: draft || 0, submitted: submitted || 0, approved: approved || 0, rejected: rejected || 0 });
    }
    setLoading(false);
  };

  const phoneWidget = intakePhone ? (
    <div className="border border-border rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Phone className="h-3 w-3 text-muted-foreground" />
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Intake Line</p>
      </div>
      <p className="text-[13px] font-mono font-semibold tracking-wide">{intakePhone}</p>
    </div>
  ) : null;

  return (
    <DashboardLayout navItems={navItems} title="Atlas" sidebarFooterExtra={phoneWidget}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-end">
          <Link to="/partner/donors/new">
            <Button size="sm" className="h-9 text-[13px]"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Donor</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader className="pb-2"><p className="text-[13px] text-muted-foreground">Total Donors</p><p className="text-2xl font-semibold">{stats.total}</p></CardHeader></Card>
          <Card><CardHeader className="pb-2"><p className="text-[13px] text-muted-foreground">Drafts</p><p className="text-2xl font-semibold">{stats.draft}</p></CardHeader></Card>
          <Card><CardHeader className="pb-2"><p className="text-[13px] text-muted-foreground">Pending Review</p><p className="text-2xl font-semibold">{stats.submitted}</p></CardHeader></Card>
          <Card><CardHeader className="pb-2"><p className="text-[13px] text-muted-foreground">Approved</p><p className="text-2xl font-semibold text-emerald-600">{stats.approved}</p></CardHeader></Card>
        </div>

        {/* Recent Donors */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Recent Donors</p>
          <div className="border border-border rounded-lg">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-[13px]">Loading...</div>
            ) : donors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-[13px] mb-4">No donors yet</p>
                <Link to="/partner/donors/new"><Button variant="outline">Add Your First Donor</Button></Link>
              </div>
            ) : (
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                <TableBody>
                  {donors.map((donor) => (
                    <TableRow key={donor.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/partner/donors/${donor.id}`)}>
                      <TableCell className="font-mono text-[13px] py-3.5">{donor.donor_code}</TableCell>
                      <TableCell className="text-[13px] py-3.5">{donor.first_name && donor.last_name ? `${donor.first_name} ${donor.last_name}` : '—'}</TableCell>
                      <TableCell className="py-3.5"><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusStyles[donor.status]}`}>{statusLabels[donor.status]}</span></TableCell>
                      <TableCell className="text-[13px] text-muted-foreground py-3.5">{new Date(donor.created_at).toLocaleDateString()}</TableCell>
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

export default PartnerDashboard;
