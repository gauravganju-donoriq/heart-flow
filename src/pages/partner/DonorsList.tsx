import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutDashboard, FileText, Bell, Plus, Eye, Edit, Phone } from 'lucide-react';
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

const DonorsList = () => {
  const { partnerId } = useAuth();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (partnerId) {
      fetchDonors();
    }
  }, [partnerId, statusFilter]);

  const fetchDonors = async () => {
    if (!partnerId) return;

    let query = supabase
      .from('donors')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as DonorStatus);
    }

    const { data, error } = await query;

    if (!error && data) {
      setDonors(data);
    }

    setLoading(false);
  };

  return (
    <DashboardLayout navItems={navItems} title="Partner Portal">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Donors</h1>
            <p className="text-muted-foreground">Manage your donor submissions</p>
          </div>
          <Link to="/partner/donors/new">
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
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
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
            <CardTitle>All Donors</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : donors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No donors found</p>
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
                    <TableHead>Tissue Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Created</TableHead>
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
                      <TableCell>{donor.tissue_type || '—'}</TableCell>
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
                        {new Date(donor.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link to={`/partner/donors/${donor.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {donor.status === 'draft' && (
                            <Link to={`/partner/donors/${donor.id}/edit`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
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

export default DonorsList;
