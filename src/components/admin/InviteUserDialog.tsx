import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  role: z.enum(['admin', 'user']),
});

interface InviteUserDialogProps {
  onSuccess: () => void;
}

const InviteUserDialog = ({ onSuccess }: InviteUserDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '', role: 'user' as 'admin' | 'user' });

  const handleCreate = async () => {
    setErrors({});
    const result = userSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setCreating(true);
    try {
      const response = await supabase.functions.invoke('manage-user', {
        body: { action: 'create', ...formData },
      });

      if (response.error) throw new Error(response.error.message || 'Failed to create user');
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'User Created', description: `${formData.fullName} has been invited as ${formData.role}.` });
      setFormData({ email: '', password: '', fullName: '', role: 'user' });
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ email: '', password: '', fullName: '', role: 'user' });
    setErrors({});
  };

  const FieldError = ({ field }: { field: string }) => (
    errors[field] ? <p className="text-[12px] text-destructive">{errors[field]}</p> : null
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 text-[13px]">
          <Plus className="h-3.5 w-3.5 mr-1.5" />Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Invite Team Member</DialogTitle>
          <DialogDescription className="text-[13px]">Create a new internal user account with role assignment.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="fullName" className="text-[13px]">Full Name</Label>
            <Input id="fullName" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="h-9 text-[13px]" />
            <FieldError field="fullName" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email" className="text-[13px]">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-9 text-[13px]" />
            <FieldError field="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-[13px]">Password</Label>
            <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="h-9 text-[13px]" />
            <FieldError field="password" />
          </div>
          <div className="space-y-1">
            <Label className="text-[13px]">Role</Label>
            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as 'admin' | 'user' })}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user" className="text-[13px]">Staff — View & edit donors, run screening</SelectItem>
                <SelectItem value="admin" className="text-[13px]">Admin — Full access including user & partner management</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={handleClose} className="h-9 text-[13px]">Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={creating} className="h-9 text-[13px]">{creating ? 'Creating…' : 'Create User'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
