import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Partner {
  id: string;
  organization_name: string;
  contact_phone: string | null;
  address: string | null;
  created_at: string;
  is_active: boolean;
  user_id: string;
  profiles: {
    email: string | null;
    full_name: string | null;
    user_id?: string;
  } | null;
  _count?: {
    donors: number;
  };
}

interface PartnersTableProps {
  partners: Partner[];
  loading: boolean;
  onEdit: (partner: Partner) => void;
  onRefresh: () => void;
}

const PartnersTable = ({ partners, loading, onEdit, onRefresh }: PartnersTableProps) => {
  const { toast } = useToast();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [partnerToDeactivate, setPartnerToDeactivate] = useState<Partner | null>(null);

  const handleToggleActive = async (partner: Partner, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('partners')
        .update({ is_active: newStatus })
        .eq('id', partner.id);

      if (error) throw error;

      toast({
        title: newStatus ? 'Partner Activated' : 'Partner Deactivated',
        description: `${partner.organization_name} has been ${newStatus ? 'activated' : 'deactivated'}`,
      });

      onRefresh();
    } catch (error: any) {
      console.error('Error toggling partner status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update partner status',
        variant: 'destructive',
      });
    }
  };

  const handleSwitchChange = (partner: Partner) => {
    if (partner.is_active) {
      // Show confirmation before deactivating
      setPartnerToDeactivate(partner);
      setConfirmDialogOpen(true);
    } else {
      // Activate immediately without confirmation
      handleToggleActive(partner, true);
    }
  };

  const confirmDeactivation = () => {
    if (partnerToDeactivate) {
      handleToggleActive(partnerToDeactivate, false);
    }
    setConfirmDialogOpen(false);
    setPartnerToDeactivate(null);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (partners.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No partners yet</div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Donors</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {partners.map((partner) => (
            <TableRow key={partner.id} className={!partner.is_active ? 'opacity-60' : ''}>
              <TableCell className="font-medium">
                {partner.organization_name}
                {!partner.is_active && (
                  <Badge variant="secondary" className="ml-2">Inactive</Badge>
                )}
              </TableCell>
              <TableCell>{partner.profiles?.full_name || '—'}</TableCell>
              <TableCell>{partner.profiles?.email || '—'}</TableCell>
              <TableCell>{partner.contact_phone || '—'}</TableCell>
              <TableCell>{partner._count?.donors || 0}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={partner.is_active}
                    onCheckedChange={() => handleSwitchChange(partner)}
                    aria-label={`Toggle ${partner.organization_name} active status`}
                  />
                  <span className="text-sm text-muted-foreground">
                    {partner.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </TableCell>
              <TableCell>{new Date(partner.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(partner)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Partner Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{' '}
              <strong>{partnerToDeactivate?.organization_name}</strong>? 
              They will no longer be able to access their account or submit new donors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPartnerToDeactivate(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PartnersTable;
