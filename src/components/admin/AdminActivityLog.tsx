import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import TableSkeleton from '@/components/TableSkeleton';

interface ActivityEntry {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: any;
  created_at: string;
  actor_name?: string;
  target_name?: string;
}

const actionLabels: Record<string, { label: string; variant: string }> = {
  user_created: { label: 'Created', variant: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
  role_changed: { label: 'Role Changed', variant: 'bg-blue-50 text-blue-600 border border-blue-100' },
  user_deactivated: { label: 'Deactivated', variant: 'bg-red-50 text-red-500 border border-red-100' },
  user_reactivated: { label: 'Reactivated', variant: 'bg-amber-50 text-amber-600 border border-amber-100' },
};

const AdminActivityLog = () => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLog();
  }, []);

  const fetchLog = async () => {
    const { data } = await supabase
      .from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!data || data.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    // Resolve actor and target names from profiles
    const userIds = new Set<string>();
    data.forEach((e: any) => {
      userIds.add(e.actor_id);
      if (e.target_id) userIds.add(e.target_id);
    });

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', Array.from(userIds));

    const profileMap = new Map<string, string>();
    profiles?.forEach((p) => {
      profileMap.set(p.user_id, p.full_name || p.email || p.user_id);
    });

    setEntries(
      data.map((e: any) => ({
        ...e,
        actor_name: profileMap.get(e.actor_id) || e.actor_id,
        target_name: e.target_id ? (e.details?.email || profileMap.get(e.target_id) || e.target_id) : '—',
      }))
    );
    setLoading(false);
  };

  if (loading) return <TableSkeleton rows={5} cols={5} />;

  if (entries.length === 0) {
    return <p className="text-center py-8 text-muted-foreground text-[13px]">No activity yet</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Action</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>By</TableHead>
          <TableHead>Details</TableHead>
          <TableHead>When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const info = actionLabels[entry.action] || { label: entry.action, variant: 'bg-muted text-foreground' };
          return (
            <TableRow key={entry.id}>
              <TableCell className="py-3">
                <Badge className={`rounded-md ${info.variant}`}>{info.label}</Badge>
              </TableCell>
              <TableCell className="text-[13px] py-3">{entry.target_name}</TableCell>
              <TableCell className="text-[13px] text-muted-foreground py-3">{entry.actor_name}</TableCell>
              <TableCell className="text-[13px] text-muted-foreground py-3">
                {entry.action === 'role_changed' && entry.details
                  ? `${entry.details.old_role} → ${entry.details.new_role}`
                  : entry.action === 'user_created' && entry.details
                  ? `Role: ${entry.details.role}`
                  : '—'}
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground py-3">
                {new Date(entry.created_at).toLocaleString()}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default AdminActivityLog;
