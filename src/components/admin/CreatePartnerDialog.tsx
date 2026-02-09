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
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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
    email: '',
    password: '',
    organizationName: '',
    fullName: '',
    phone: '',
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
          email: formData.email,
          password: formData.password,
          organizationName: formData.organizationName,
          fullName: formData.fullName,
          phone: formData.phone || undefined,
          slug,
        },
      });

      if (response.error) throw new Error(response.error.message || 'Failed to create partner');
      if (response.data?.error) throw new Error(response.data.error);

      const loginUrl = `${window.location.origin}/login/${slug}`;

      setCreatedPartner({
        organizationName: formData.organizationName,
        email: formData.email,
        password: formData.password,
        loginUrl,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error creating partner:', error);
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

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setDialogOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Partner
        </Button>
      </DialogTrigger>
      <DialogContent>
        {createdPartner ? (
          <>
            <DialogHeader>
              <DialogTitle>Partner Created Successfully!</DialogTitle>
              <DialogDescription>
                Share the login details below with {createdPartner.organizationName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Login URL</Label>
                <div className="flex items-center gap-2">
                  <Input value={createdPartner.loginUrl} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Email</Label>
                <Input value={createdPartner.email} readOnly />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Password</Label>
                <Input value={createdPartner.password} readOnly />
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Save these credentials now. The password cannot be retrieved later.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create Partner Account</DialogTitle>
              <DialogDescription>Create a new recovery partner account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input id="organizationName" value={formData.organizationName} onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })} />
                {errors.organizationName && <p className="text-sm text-destructive">{errors.organizationName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Contact Name</Label>
                <Input id="fullName" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Partner'}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreatePartnerDialog;
