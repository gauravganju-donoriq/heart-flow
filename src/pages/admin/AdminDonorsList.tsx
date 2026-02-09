import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LayoutDashboard, Users, FileText, Bell, Eye, Plus, Phone, Shield, CheckCircle, XCircle, AlertTriangle, Minus } from 'lucide-react';
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
  { label: 'Screening', href: '/admin/screening-settings', icon: <Shield className="h-4 w-4" /> },
  { label: 'Notifications', href: '/admin/notifications', icon: <Bell className="h-4 w-4" /> },
];

const ScreeningBadge = ({ results }: { results: DonorWithPartner['screening_results'] }) => {
  const latest = results && results.length > 0 ? results[results.length - 1] : null;

  if (!latest) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3.5 w-3.5" />
        Not screened
      </span>
    );
  }

  const config = {
    accept: { icon: CheckCircle, label: 'Accept', className: 'text-green-600 bg-green-50 border-green-200' },
    reject: { icon: XCircle, label: 'Reject', className: 'text-red-600 bg-red-50 border-red-200' },
    needs_review: { icon: AlertTriangle, label: 'Review', className: 'text-amber-600 bg-amber-50 border-amber-200' },
  }[latest.verdict] || { icon: AlertTriangle, label: latest.verdict, className: 'text-muted-foreground bg-muted' };

  const Icon = config.icon;
  const confidence = Math.round(latest.confidence * 100);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${config.className}`}>
            <Icon className="h-3.5 w-3.5" />
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
  const [statusFilter, setStatusFilter] = useState<string>('pending');

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
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">All Donors</h1>
            <p className="text-muted-foreground">Review and manage donor submissions</p>
          </div>
          <Link to="/admin/donors/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Donor
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
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
            </div>
          </CardContent>
        </Card>

        {/* Donors Table */}
        <Card>
          <CardHeader>
            <CardTitle>Donors</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : donors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No donors found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Tissue Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>AI Screening</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donors.map((donor) => (
                    <TableRow key={donor.id}>
                      <TableCell className="font-mono">
                        <span className="flex items-center gap-1.5">
                          {donor.donor_code}
                          {donor.intake_method === 'phone' && (
                            <span title="Phone intake">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        {donor.first_name && donor.last_name
                          ? `${donor.first_name} ${donor.last_name}`
                          : '—'}
                      </TableCell>
                      <TableCell>{donor.partners?.organization_name || '—'}</TableCell>
                      <TableCell className="capitalize">{donor.tissue_type || '—'}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[donor.status]}>
                          {statusLabels[donor.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ScreeningBadge results={donor.screening_results} />
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
      </div>
    </DashboardLayout>
  );
};

export default AdminDonorsList;
