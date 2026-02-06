import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Users, FileText, Bell } from 'lucide-react';
import CreatePartnerDialog from '@/components/admin/CreatePartnerDialog';
import EditPartnerDialog from '@/components/admin/EditPartnerDialog';
import PartnersTable from '@/components/admin/PartnersTable';

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

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Partners', href: '/admin/partners', icon: <Users className="h-4 w-4" /> },
  { label: 'Donors', href: '/admin/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Notifications', href: '/admin/notifications', icon: <Bell className="h-4 w-4" /> },
];

const PartnersList = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    const { data, error } = await supabase
      .from('partners')
      .select(`
        id,
        organization_name,
        contact_phone,
        address,
        created_at,
        is_active,
        user_id
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch profile and donor counts for each partner
      const partnersWithDetails = await Promise.all(
        data.map(async (partner) => {
          const { count } = await supabase
            .from('donors')
            .select('*', { count: 'exact', head: true })
            .eq('partner_id', partner.id);
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email, full_name, user_id')
            .eq('user_id', partner.user_id)
            .single();
          
          return {
            ...partner,
            profiles: profileData || null,
            _count: { donors: count || 0 },
          };
        })
      );
      setPartners(partnersWithDetails as Partner[]);
    }
    setLoading(false);
  };

  const handleEdit = (partner: Partner) => {
    setSelectedPartner(partner);
    setEditDialogOpen(true);
  };

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Partners</h1>
            <p className="text-muted-foreground">Manage recovery partner accounts</p>
          </div>
          <CreatePartnerDialog onSuccess={fetchPartners} />
        </div>

        {/* Partners Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <PartnersTable
              partners={partners}
              loading={loading}
              onEdit={handleEdit}
              onRefresh={fetchPartners}
            />
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <EditPartnerDialog
          partner={selectedPartner}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={fetchPartners}
        />
      </div>
    </DashboardLayout>
  );
};

export default PartnersList;
