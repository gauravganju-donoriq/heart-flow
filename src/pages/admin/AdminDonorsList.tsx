import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import TableSkeleton from '@/components/TableSkeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Phone } from 'lucide-react';
import { getAdminNavItems } from '@/lib/navItems';
import { statusStyles, statusLabels } from '@/lib/donorStatus';
import type { Database } from '@/integrations/supabase/types';

type DonorStatus = Database['public']['Enums']['donor_status'];

interface DonorWithPartner {
  id: string;
  donor_code: string | null;
  first_name: string | null;
  last_name: string | null;
  tissue_type: string | null;
  status: DonorStatus;
  submitted_at: string | null;
  created_at: string;
  intake_method: string | null;
  partners: {
    organization_name: string;
  } | null;
  screening_results: {
    verdict: string;
    confidence: number;
  }[] | null;
}

const AdminDonorsList = () => {
  const { role } = useAuth();
  const [donors, setDonors] = useState<DonorWithPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDonors();
  }, [statusFilter]);

  const fetchDonors = async () => {
    setLoading(true);

    let query = supabase
      .from('donors')
      .select(`
        id,
        donor_code,
        din,
        first_name,
        last_name,
        tissue_type,
        status,
        submitted_at,
        created_at,
        intake_method,
        partners (
          organization_name
        ),
        screening_results (
          verdict,
          confidence
        )
      `)
      .order('submitted_at', { ascending: true, nullsFirst: false });

    if (statusFilter === 'pending') {
      query = query.in('status', ['submitted', 'under_review']);
    } else if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as DonorStatus);
    }

    const { data, error } = await query;

    if (!error && data) {
      setDonors(data as DonorWithPartner[]);
    }

    setLoading(false);
  };

  return (
    <DashboardLayout navItems={getAdminNavItems(role)} title="Atlas">
      <div className="space-y-5 max-w-6xl">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="w-44">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Link to="/admin/donors/new">
            <Button size="sm" className="h-9 text-[13px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Donor
            </Button>
          </Link>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : donors.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-muted-foreground">
              No donors found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>DIN</TableHead>
                   <TableHead>Name</TableHead>
                   <TableHead>Partner</TableHead>
                   <TableHead>Source</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donors.map((donor) => (
                  <TableRow
                    key={donor.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => navigate(`/admin/donors/${donor.id}`)}
                  >
                    <TableCell className="font-mono text-[13px] py-3.5">
                       {(donor as any).din || '—'}
                     </TableCell>
                    <TableCell className="text-[13px] py-3.5">
                      {donor.first_name && donor.last_name
                        ? `${donor.first_name} ${donor.last_name}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground py-3.5">
                      {donor.partners?.organization_name || '—'}
                    </TableCell>
                    <TableCell className="py-3.5">
                      {donor.intake_method === 'phone' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border bg-violet-50 text-violet-600 border-violet-100">
                          <Phone className="h-3 w-3" />Phone
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border bg-gray-50 text-gray-500 border-gray-200">
                          Manual
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusStyles[donor.status]}`}>
                        {statusLabels[donor.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground py-3.5">
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
    </DashboardLayout>
  );
};

export default AdminDonorsList;
