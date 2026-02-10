import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import TableSkeleton from '@/components/TableSkeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { getAdminNavItems } from '@/lib/navItems';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnifiedLogEntry {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  category: 'donor' | 'user_management' | 'activity';
  details: string;
  target: string;
  created_at: string;
}

const actionConfig: Record<string, { label: string; className: string; category: string }> = {
  // audit_logs actions (donor)
  created: { label: 'Donor Created', className: 'bg-blue-50 text-blue-600 border-blue-200', category: 'Donor' },
  edit_direct: { label: 'Donor Edited', className: 'bg-muted text-foreground border-border', category: 'Donor' },
  edit_pending: { label: 'Edit Proposed', className: 'bg-amber-50 text-amber-600 border-amber-200', category: 'Donor' },
  edit_approved: { label: 'Edit Approved', className: 'bg-emerald-50 text-emerald-600 border-emerald-200', category: 'Donor' },
  edit_rejected: { label: 'Edit Rejected', className: 'bg-red-50 text-red-500 border-red-200', category: 'Donor' },
  status_change: { label: 'Status Changed', className: 'bg-violet-50 text-violet-600 border-violet-200', category: 'Donor' },
  // admin_activity_log actions (user management)
  user_created: { label: 'User Created', className: 'bg-emerald-50 text-emerald-600 border-emerald-100', category: 'User Mgmt' },
  role_changed: { label: 'Role Changed', className: 'bg-blue-50 text-blue-600 border-blue-100', category: 'User Mgmt' },
  user_deactivated: { label: 'User Deactivated', className: 'bg-red-50 text-red-500 border-red-100', category: 'User Mgmt' },
  user_reactivated: { label: 'User Reactivated', className: 'bg-amber-50 text-amber-600 border-amber-100', category: 'User Mgmt' },
  password_reset: { label: 'Password Reset', className: 'bg-orange-50 text-orange-600 border-orange-100', category: 'User Mgmt' },
  // user_activity_log actions
  login: { label: 'Login', className: 'bg-sky-50 text-sky-600 border-sky-200', category: 'Access' },
  logout: { label: 'Logout', className: 'bg-gray-50 text-gray-500 border-gray-200', category: 'Access' },
  donor_view: { label: 'Donor Viewed', className: 'bg-indigo-50 text-indigo-600 border-indigo-200', category: 'Access' },
  data_export: { label: 'Data Export', className: 'bg-teal-50 text-teal-600 border-teal-200', category: 'Access' },
};

function getActionInfo(action: string) {
  return actionConfig[action] || { label: action, className: 'bg-muted text-foreground border-border', category: 'Other' };
}

const AuditLogPage = () => {
  const { role } = useAuth();
  const [entries, setEntries] = useState<UnifiedLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileMap, setProfileMap] = useState<Map<string, string>>(new Map());

  // Filters
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(undefined);
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => { fetchAllLogs(); }, []);

  const fetchAllLogs = async () => {
    // Fetch all three log tables in parallel
    const [auditRes, adminRes, activityRes] = await Promise.all([
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(500),
      (supabase.from as any)('user_activity_log').select('*').order('created_at', { ascending: false }).limit(500),
    ]);

    // Collect all user IDs
    const userIds = new Set<string>();
    auditRes.data?.forEach((e: any) => userIds.add(e.changed_by));
    adminRes.data?.forEach((e: any) => { userIds.add(e.actor_id); if (e.target_id) userIds.add(e.target_id); });
    activityRes.data?.forEach((e: any) => userIds.add(e.user_id));

    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', Array.from(userIds));

    const pMap = new Map<string, string>();
    profiles?.forEach((p) => pMap.set(p.user_id, p.full_name || p.email || p.user_id.slice(0, 8)));
    setProfileMap(pMap);

    const getName = (id: string) => pMap.get(id) || id.slice(0, 8);

    // Normalize entries
    const unified: UnifiedLogEntry[] = [];

    // audit_logs → donor changes
    auditRes.data?.forEach((e: any) => {
      const fields = e.changed_fields ? Object.keys(e.changed_fields) : [];
      unified.push({
        id: `audit-${e.id}`,
        user_id: e.changed_by,
        user_name: getName(e.changed_by),
        action: e.action,
        category: 'donor',
        details: fields.length > 0 ? `${fields.length} field${fields.length !== 1 ? 's' : ''} changed` : '',
        target: e.donor_id?.slice(0, 8) || '—',
        created_at: e.created_at,
      });
    });

    // admin_activity_log → user management
    adminRes.data?.forEach((e: any) => {
      let details = '';
      if (e.action === 'role_changed' && e.details) details = `${e.details.old_role} → ${e.details.new_role}`;
      else if (e.action === 'user_created' && e.details) details = `Role: ${e.details.role}`;

      unified.push({
        id: `admin-${e.id}`,
        user_id: e.actor_id,
        user_name: getName(e.actor_id),
        action: e.action,
        category: 'user_management',
        details,
        target: e.target_id ? (e.details?.email || getName(e.target_id)) : '—',
        created_at: e.created_at,
      });
    });

    // user_activity_log → login/logout/views/exports
    activityRes.data?.forEach((e: any) => {
      let details = '';
      if (e.action === 'donor_view' && e.details?.donor_din) details = e.details.donor_din;
      else if (e.action === 'data_export') details = e.details?.export_type || e.details?.file_name || '';

      unified.push({
        id: `activity-${e.id}`,
        user_id: e.user_id,
        user_name: getName(e.user_id),
        action: e.action,
        category: 'activity',
        details,
        target: e.action === 'donor_view' ? (e.details?.donor_id?.slice(0, 8) || '—') : '—',
        created_at: e.created_at,
      });
    });

    // Sort by time descending
    unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setEntries(unified);
    setLoading(false);
  };

  // Get unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((e) => map.set(e.user_id, e.user_name));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [entries]);

  // Filtered entries
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterUser !== 'all' && e.user_id !== filterUser) return false;
      if (filterAction !== 'all' && e.action !== filterAction) return false;
      if (filterDateFrom) {
        const entryDate = new Date(e.created_at);
        const from = new Date(filterDateFrom);
        from.setHours(0, 0, 0, 0);
        if (entryDate < from) return false;
      }
      if (filterDateTo) {
        const entryDate = new Date(e.created_at);
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59, 999);
        if (entryDate > to) return false;
      }
      return true;
    });
  }, [entries, filterUser, filterAction, filterDateFrom, filterDateTo]);

  const hasActiveFilters = filterUser !== 'all' || filterAction !== 'all' || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setFilterUser('all');
    setFilterAction('all');
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
  };

  return (
    <DashboardLayout navItems={getAdminNavItems(role)} title="Atlas">
      <div className="space-y-4 max-w-5xl">
        {/* Filters */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* User filter */}
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="h-8 w-[180px] text-[13px]">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[13px]">All Users</SelectItem>
                  {uniqueUsers.map(([id, name]) => (
                    <SelectItem key={id} value={id} className="text-[13px]">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Action filter */}
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="h-8 w-[180px] text-[13px]">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[13px]">All Actions</SelectItem>
                  {Object.entries(actionConfig).map(([key, val]) => (
                    <SelectItem key={key} value={key} className="text-[13px]">{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date from */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-8 w-[140px] text-[13px] justify-start font-normal", !filterDateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    {filterDateFrom ? format(filterDateFrom, 'MMM d, yyyy') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filterDateFrom} onSelect={setFilterDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>

              {/* Date to */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-8 w-[140px] text-[13px] justify-start font-normal", !filterDateTo && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    {filterDateTo ? format(filterDateTo, 'MMM d, yyyy') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filterDateTo} onSelect={setFilterDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-[12px] text-muted-foreground">
                  <X className="h-3 w-3 mr-1" />Clear
                </Button>
              )}

              <span className="text-[12px] text-muted-foreground ml-auto">
                {filtered.length} of {entries.length} entries
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Log Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={10} cols={6} />
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-[13px]">No audit entries found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 200).map((entry) => {
                    const info = getActionInfo(entry.action);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={`rounded-md text-[11px] ${info.className}`}>
                            {info.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground py-3">{info.category}</TableCell>
                        <TableCell className="text-[13px] py-3">{entry.user_name}</TableCell>
                        <TableCell className="text-[13px] text-muted-foreground py-3 font-mono">{entry.target}</TableCell>
                        <TableCell className="text-[13px] text-muted-foreground py-3">{entry.details || '—'}</TableCell>
                        <TableCell className="text-[12px] text-muted-foreground py-3 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AuditLogPage;
