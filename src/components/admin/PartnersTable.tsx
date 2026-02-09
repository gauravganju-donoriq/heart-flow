import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  slug: string;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLoginUrl = async (e: React.MouseEvent, partner: Partner) => {
    e.stopPropagation();
    const url = `${window.location.origin}/login/${partner.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(partner.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
      toast({
        title: 'Error',
        description: error.message || 'Failed to update partner status',
        variant: 'destructive',
      });
    }
  };

  const handleSwitchChange = (e: React.MouseEvent, partner: Partner) => {
    e.stopPropagation();
    if (partner.is_active) {
      setPartnerToDeactivate(partner);
      setConfirmDialogOpen(true);
    } else {
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
    return <div className="text-center py-12 text-[13px] text-muted-foreground">Loading…</div>;
  }

  if (partners.length === 0) {
    return <div className="text-center py-12 text-[13px] text-muted-foreground">No partners yet</div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Organization</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Login URL</TableHead>
            <TableHead>Donors</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {partners.map((partner) => (
            <TableRow
              key={partner.id}
              className={`cursor-pointer hover:bg-muted/30 ${!partner.is_active ? 'opacity-50' : ''}`}
              onClick={() => onEdit(partner)}
            >
              <TableCell className="text-[13px] font-medium py-3.5">
                {partner.organization_name}
              </TableCell>
              <TableCell className="text-[13px] py-3.5">
                {partner.profiles?.full_name || '—'}
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground py-3.5">
                {partner.profiles?.email || '—'}
              </TableCell>
              <TableCell className="py-3.5">
                <div className="flex items-center gap-1">
                  <code className="text-xs text-muted-foreground truncate max-w-[140px]">/login/{partner.slug}</code>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => copyLoginUrl(e, partner)}>
                          {copiedId === partner.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy login URL</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableCell>
              <TableCell className="text-[13px] py-3.5">
                {partner._count?.donors || 0}
              </TableCell>
              <TableCell className="py-3.5">
                <div className="flex items-center gap-2" onClick={(e) => handleSwitchChange(e, partner)}>
                  <Switch
                    checked={partner.is_active}
                    aria-label={`Toggle ${partner.organization_name} active status`}
                  />
                  <span className="text-[13px] text-muted-foreground">
                    {partner.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground py-3.5">
                {new Date(partner.created_at).toLocaleDateString()}
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
            <AlertDialogCancel onClick={() => setPartnerToDeactivate(null)}>Cancel</AlertDialogCancel>
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
