import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LayoutDashboard, Users, FileText, ScrollText, Plus, Phone, Shield, CheckCircle, XCircle, AlertTriangle, Minus } from 'lucide-react';
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

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Partners', href: '/admin/partners', icon: <Users className="h-4 w-4" /> },
  { label: 'Donors', href: '/admin/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Screening', href: '/admin/screening-settings', icon: <Shield className="h-4 w-4" /> },
  { label: 'Audit Log', href: '/admin/audit-log', icon: <ScrollText className="h-4 w-4" /> },
];

const ScreeningBadge = ({ results }: { results: DonorWithPartner['screening_results'] }) => {
  const latest = results && results.length > 0 ? results[results.length - 1] : null;

  if (!latest) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        —
      </span>
    );
  }

  const config = {
    accept: { icon: CheckCircle, label: 'Accept', className: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    reject: { icon: XCircle, label: 'Reject', className: 'text-red-500 bg-red-50 border-red-100' },
    needs_review: { icon: AlertTriangle, label: 'Review', className: 'text-amber-600 bg-amber-50 border-amber-100' },
  }[latest.verdict] || { icon: AlertTriangle, label: latest.verdict, className: 'text-muted-foreground bg-muted' };

  const Icon = config.icon;
  const confidence = Math.round(latest.confidence * 100);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border ${config.className}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>AI Verdict: {config.label} ({confidence}% confidence)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const AdminDonorsList = () => {
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
    <DashboardLayout navItems={navItems} title="Atlas">
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
            <div className="text-center py-12 text-[13px] text-muted-foreground">Loading…</div>
          ) : donors.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-muted-foreground">
              No donors found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Code</TableHead>
                  <TableHead>DIN</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AI</TableHead>
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
                      {donor.donor_code || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-[13px] py-3.5 text-muted-foreground">
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
                    <TableCell className="py-3.5">
                      <ScreeningBadge results={donor.screening_results} />
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
