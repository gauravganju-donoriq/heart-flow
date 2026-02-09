import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Copy, Check } from 'lucide-react';
import { z } from 'zod';

const partnerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationName: z.string().min(1, 'Organization name is required'),
  fullName: z.string().min(1, 'Contact name is required'),
  phone: z.string().optional(),
});

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

interface CreatePartnerDialogProps {
  onSuccess: () => void;
}

interface CreatedPartnerInfo {
  organizationName: string;
  email: string;
  password: string;
  loginUrl: string;
}

const CreatePartnerDialog = ({ onSuccess }: CreatePartnerDialogProps) => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdPartner, setCreatedPartner] = useState<CreatedPartnerInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    email: '', password: '', organizationName: '', fullName: '', phone: '',
  });

  const handleCreate = async () => {
    setErrors({});
    const result = partnerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setCreating(true);
    const slug = generateSlug(formData.organizationName);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Error', description: 'You must be logged in to create partners', variant: 'destructive' });
        return;
      }

      const response = await supabase.functions.invoke('create-partner', {
        body: {
          email: formData.email, password: formData.password,
          organizationName: formData.organizationName, fullName: formData.fullName,
          phone: formData.phone || undefined, slug,
        },
      });

      if (response.error) throw new Error(response.error.message || 'Failed to create partner');
      if (response.data?.error) throw new Error(response.data.error);

      setCreatedPartner({
        organizationName: formData.organizationName,
        email: formData.email,
        password: formData.password,
        loginUrl: `${window.location.origin}/login/${slug}`,
      });
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create partner account', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!createdPartner) return;
    await navigator.clipboard.writeText(createdPartner.loginUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setCreatedPartner(null);
    setCopied(false);
    setFormData({ email: '', password: '', organizationName: '', fullName: '', phone: '' });
    setErrors({});
  };

  const FieldError = ({ field }: { field: string }) => (
    errors[field] ? <p className="text-[12px] text-destructive">{errors[field]}</p> : null
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleClose(); else setDialogOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 text-[13px]">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Partner
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {createdPartner ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">Partner Created</DialogTitle>
              <DialogDescription className="text-[13px]">
                Share the login details below with {createdPartner.organizationName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-[13px] text-muted-foreground">Login URL</Label>
                <div className="flex items-center gap-2">
                  <Input value={createdPartner.loginUrl} readOnly className="font-mono text-[13px] h-9" />
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={handleCopyUrl}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[13px] text-muted-foreground">Email</Label>
                <Input value={createdPartner.email} readOnly className="text-[13px] h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[13px] text-muted-foreground">Password</Label>
                <Input value={createdPartner.password} readOnly className="text-[13px] h-9" />
              </div>
              <p className="text-[12px] text-muted-foreground">
                Save these credentials now — the password cannot be retrieved later.
              </p>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={handleClose} className="h-9 text-[13px]">Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">Create Partner Account</DialogTitle>
              <DialogDescription className="text-[13px]">Create a new recovery partner with login credentials.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="organizationName" className="text-[13px]">Organization Name</Label>
                <Input id="organizationName" value={formData.organizationName} onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })} className="h-9 text-[13px]" />
                <FieldError field="organizationName" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-[13px]">Contact Name</Label>
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
                <Label htmlFor="phone" className="text-[13px]">Phone <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-9 text-[13px]" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={handleClose} className="h-9 text-[13px]">Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={creating} className="h-9 text-[13px]">{creating ? 'Creating…' : 'Create Partner'}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreatePartnerDialog;
