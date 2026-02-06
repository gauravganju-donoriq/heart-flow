import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const editPartnerSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  fullName: z.string().min(1, 'Contact name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

interface Partner {
  id: string;
  organization_name: string;
  contact_phone: string | null;
  address: string | null;
  profiles: {
    email: string | null;
    full_name: string | null;
    user_id?: string;
  } | null;
}

interface EditPartnerDialogProps {
  partner: Partner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditPartnerDialog = ({ partner, open, onOpenChange, onSuccess }: EditPartnerDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    organizationName: '',
    fullName: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (partner) {
      setFormData({
        organizationName: partner.organization_name || '',
        fullName: partner.profiles?.full_name || '',
        phone: partner.contact_phone || '',
        address: partner.address || '',
      });
    }
  }, [partner]);

  const handleSave = async () => {
    if (!partner) return;
    
    setErrors({});

    const result = editPartnerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);

    try {
      // Update partner record
      const { error: partnerError } = await supabase
        .from('partners')
        .update({
          organization_name: formData.organizationName,
          contact_phone: formData.phone || null,
          address: formData.address || null,
        })
        .eq('id', partner.id);

      if (partnerError) throw partnerError;

      // Update profile if we have the user_id
      if (partner.profiles?.user_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName,
          })
          .eq('user_id', partner.profiles.user_id);

        if (profileError) throw profileError;
      }

      toast({
        title: 'Partner Updated',
        description: `Successfully updated ${formData.organizationName}`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating partner:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update partner',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Partner</DialogTitle>
          <DialogDescription>
            Update partner account details
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-organizationName">Organization Name</Label>
            <Input
              id="edit-organizationName"
              value={formData.organizationName}
              onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
            />
            {errors.organizationName && (
              <p className="text-sm text-destructive">{errors.organizationName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-fullName">Contact Name</Label>
            <Input
              id="edit-fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-address">Address</Label>
            <Input
              id="edit-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPartnerDialog;
