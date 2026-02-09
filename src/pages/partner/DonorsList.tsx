import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutDashboard, FileText, Bell, Plus, Edit, Phone } from 'lucide-react';
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

const DonorsList = () => {
  const { partnerId } = useAuth();
  const navigate = useNavigate();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (partnerId) { fetchDonors(); }
  }, [partnerId, statusFilter]);

  const fetchDonors = async () => {
    if (!partnerId) return;
    let query = supabase.from('donors').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false });
    if (statusFilter !== 'all') { query = query.eq('status', statusFilter as DonorStatus); }
    const { data, error } = await query;
    if (!error && data) { setDonors(data); }
    setLoading(false);
  };

  return (
    <DashboardLayout navItems={navItems} title="DonorIQ">
      <div className="space-y-5">
        {/* Filter + Add */}
        <div className="flex items-center justify-between">
          <div className="w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Link to="/partner/donors/new">
            <Button className="h-9 text-[13px]"><Plus className="h-4 w-4 mr-2" />Add Donor</Button>
          </Link>
        </div>

        {/* Donors Table */}
        <div className="border border-border rounded-lg">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-[13px]">Loading...</div>
          ) : donors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-[13px] mb-4">No donors found</p>
              <Link to="/partner/donors/new"><Button variant="outline">Add Your First Donor</Button></Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donor Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Tissue Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donors.map((donor) => (
                  <TableRow key={donor.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/partner/donors/${donor.id}`)}>
                    <TableCell className="font-mono text-[13px] py-3.5">
                      <span className="flex items-center gap-1.5">
                        {donor.donor_code}
                        {donor.intake_method === 'phone' && <Phone className="h-3.5 w-3.5 text-muted-foreground" />}
                      </span>
                    </TableCell>
                    <TableCell className="text-[13px] py-3.5">{donor.first_name && donor.last_name ? `${donor.first_name} ${donor.last_name}` : '—'}</TableCell>
                    <TableCell className="text-[13px] text-muted-foreground py-3.5">{donor.tissue_type || '—'}</TableCell>
                    <TableCell className="py-3.5"><Badge className={`rounded-md ${statusStyles[donor.status]}`}>{statusLabels[donor.status]}</Badge></TableCell>
                    <TableCell className="text-[13px] py-3.5">{donor.submitted_at ? new Date(donor.submitted_at).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className="text-[13px] py-3.5">{new Date(donor.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="py-3.5">
                      {donor.status === 'draft' && (
                        <Link to={`/partner/donors/${donor.id}/edit`} onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DonorsList;
