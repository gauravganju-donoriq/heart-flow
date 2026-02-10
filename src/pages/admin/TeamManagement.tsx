import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import InviteUserDialog from '@/components/admin/InviteUserDialog';
import AdminActivityLog from '@/components/admin/AdminActivityLog';
import TableSkeleton from '@/components/TableSkeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getAdminNavItems } from '@/lib/navItems';

interface TeamMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  is_banned: boolean;
}

const TeamManagement = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleChangeDialog, setRoleChangeDialog] = useState<{ userId: string; name: string; currentRole: string } | null>(null);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTeam(); }, []);

  const fetchTeam = async () => {
    // Get internal user roles (admin + user)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role, created_at')
      .in('role', ['admin', 'user']);

    if (!roles || roles.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);

    const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
    profiles?.forEach((p) => profileMap.set(p.user_id, { full_name: p.full_name, email: p.email }));

    setMembers(
      roles.map((r) => ({
        user_id: r.user_id,
        full_name: profileMap.get(r.user_id)?.full_name || null,
        email: profileMap.get(r.user_id)?.email || null,
        role: r.role,
        created_at: r.created_at,
        is_banned: false, // We'll show based on deactivation actions
      }))
    );
    setLoading(false);
  };

  const handleRoleChange = async () => {
    if (!roleChangeDialog || !newRole) return;
    setSaving(true);
    try {
      const response = await supabase.functions.invoke('manage-user', {
        body: { action: 'update_role', targetUserId: roleChangeDialog.userId, newRole },
      });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: 'Role Updated', description: `${roleChangeDialog.name}'s role changed to ${newRole}.` });
      setRoleChangeDialog(null);
      fetchTeam();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userId: string, name: string, deactivate: boolean) => {
    if (userId === user?.id) {
      toast({ title: 'Error', description: 'You cannot deactivate yourself.', variant: 'destructive' });
      return;
    }
    try {
      const response = await supabase.functions.invoke('manage-user', {
        body: { action: deactivate ? 'deactivate' : 'reactivate', targetUserId: userId },
      });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: deactivate ? 'User Deactivated' : 'User Reactivated', description: `${name} has been ${deactivate ? 'deactivated' : 'reactivated'}.` });
      fetchTeam();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout navItems={getAdminNavItems(role)} title="Atlas">
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Team</h1>
            <p className="text-[13px] text-muted-foreground">Manage internal users and their roles.</p>
          </div>
          <InviteUserDialog onSuccess={fetchTeam} />
        </div>

        {/* Team Members Table */}
        <Card>
          <CardHeader><p className="text-sm font-medium">Internal Users</p></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : members.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-[13px]">No team members found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.user_id}>
                      <TableCell className="text-[13px] py-3.5 font-medium">
                        {m.full_name || '—'}
                        {m.user_id === user?.id && <span className="text-muted-foreground ml-1">(you)</span>}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground py-3.5">{m.email || '—'}</TableCell>
                      <TableCell className="py-3.5">
                        <Badge variant="outline" className="rounded-md text-[12px]">
                          {m.role === 'admin' ? 'Admin' : 'Staff'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground py-3.5">
                        {new Date(m.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        {m.user_id !== user?.id && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-[12px]"
                              onClick={() => {
                                setRoleChangeDialog({ userId: m.user_id, name: m.full_name || m.email || '', currentRole: m.role });
                                setNewRole(m.role === 'admin' ? 'user' : 'admin');
                              }}
                            >
                              Change Role
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader><p className="text-sm font-medium">Activity Log</p></CardHeader>
          <CardContent className="p-0">
            <AdminActivityLog />
          </CardContent>
        </Card>
      </div>

      {/* Role Change Dialog */}
      <Dialog open={!!roleChangeDialog} onOpenChange={(o) => { if (!o) setRoleChangeDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Change Role</DialogTitle>
            <DialogDescription className="text-[13px]">
              Update the role for {roleChangeDialog?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user" className="text-[13px]">Staff</SelectItem>
                <SelectItem value="admin" className="text-[13px]">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRoleChangeDialog(null)} className="h-9 text-[13px]">Cancel</Button>
            <Button size="sm" onClick={handleRoleChange} disabled={saving || newRole === roleChangeDialog?.currentRole} className="h-9 text-[13px]">
              {saving ? 'Saving…' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TeamManagement;
