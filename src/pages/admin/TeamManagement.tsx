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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { getAdminNavItems } from '@/lib/navItems';
import { MoreHorizontal, ShieldAlert, KeyRound, UserCog, Copy, Check } from 'lucide-react';

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

  // Reset password state
  const [resetDialog, setResetDialog] = useState<{ userId: string; name: string; email: string } | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchTeam(); }, []);

  const fetchTeam = async () => {
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

    // Fetch ban status from edge function
    let banMap: Record<string, { is_banned: boolean }> = {};
    try {
      const res = await supabase.functions.invoke('manage-user', {
        body: { action: 'list_users', userIds },
      });
      if (res.data?.users) banMap = res.data.users;
    } catch { /* ignore */ }

    setMembers(
      roles.map((r) => ({
        user_id: r.user_id,
        full_name: profileMap.get(r.user_id)?.full_name || null,
        email: profileMap.get(r.user_id)?.email || null,
        role: r.role,
        created_at: r.created_at,
        is_banned: banMap[r.user_id]?.is_banned ?? false,
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
      toast({ title: 'Role Updated', description: `${roleChangeDialog.name}'s role changed to ${newRole === 'admin' ? 'Admin' : 'Staff'}.` });
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

  const handleResetPassword = async () => {
    if (!resetDialog || !resetPassword) return;
    if (resetPassword.length < 8) {
      toast({ title: 'Error', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    setResetting(true);
    try {
      const response = await supabase.functions.invoke('manage-user', {
        body: { action: 'reset_password', targetUserId: resetDialog.userId, newPassword: resetPassword },
      });
      if (response.data?.error) throw new Error(response.data.error);
      setResetDone(true);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

  const closeResetDialog = () => {
    setResetDialog(null);
    setResetPassword('');
    setResetDone(false);
    setCopied(false);
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/auth`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout navItems={getAdminNavItems(role)} title="Atlas">
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center justify-end">
          <InviteUserDialog onSuccess={fetchTeam} />
        </div>

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
                    <TableRow key={m.user_id} className={m.is_banned ? 'opacity-50' : ''}>
                      <TableCell className="text-[13px] py-3.5 font-medium">
                        <div className="flex items-center gap-2">
                          {m.full_name || '—'}
                          {m.user_id === user?.id && <span className="text-muted-foreground">(you)</span>}
                          {m.is_banned && <Badge variant="destructive" className="rounded-md text-[11px] px-1.5 py-0">Deactivated</Badge>}
                        </div>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => {
                                  setRoleChangeDialog({ userId: m.user_id, name: m.full_name || m.email || '', currentRole: m.role });
                                  setNewRole(m.role === 'admin' ? 'user' : 'admin');
                                }}
                                className="text-[13px]"
                              >
                                <UserCog className="h-3.5 w-3.5 mr-2" />Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setResetDialog({ userId: m.user_id, name: m.full_name || '', email: m.email || '' })}
                                className="text-[13px]"
                              >
                                <KeyRound className="h-3.5 w-3.5 mr-2" />Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(m.user_id, m.full_name || m.email || '', !m.is_banned)}
                                className="text-[13px]"
                              >
                                <ShieldAlert className="h-3.5 w-3.5 mr-2" />
                                {m.is_banned ? 'Reactivate' : 'Revoke Access'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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

      {/* Reset Password Dialog */}
      <Dialog open={!!resetDialog} onOpenChange={(o) => { if (!o) closeResetDialog(); }}>
        <DialogContent className="max-w-md">
          {resetDone ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">Password Reset</DialogTitle>
                <DialogDescription className="text-[13px]">
                  New credentials for {resetDialog?.name || resetDialog?.email}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label className="text-[13px] text-muted-foreground">Login URL</Label>
                  <div className="flex items-center gap-2">
                    <Input value={`${window.location.origin}/auth`} readOnly className="font-mono text-[13px] h-9" />
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={handleCopyUrl}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[13px] text-muted-foreground">Email</Label>
                  <Input value={resetDialog?.email || ''} readOnly className="text-[13px] h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[13px] text-muted-foreground">New Password</Label>
                  <Input value={resetPassword} readOnly className="text-[13px] h-9" />
                </div>
                <p className="text-[12px] text-muted-foreground">
                  Save these credentials now — the password cannot be retrieved later.
                </p>
              </div>
              <DialogFooter>
                <Button size="sm" onClick={closeResetDialog} className="h-9 text-[13px]">Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">Reset Password</DialogTitle>
                <DialogDescription className="text-[13px]">
                  Set a new temporary password for {resetDialog?.name || resetDialog?.email}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label htmlFor="newPassword" className="text-[13px]">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="h-9 text-[13px]"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={closeResetDialog} className="h-9 text-[13px]">Cancel</Button>
                <Button size="sm" onClick={handleResetPassword} disabled={resetting || resetPassword.length < 8} className="h-9 text-[13px]">
                  {resetting ? 'Resetting…' : 'Reset Password'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TeamManagement;
