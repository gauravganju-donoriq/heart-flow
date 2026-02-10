import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import CreatePartnerDialog from '@/components/admin/CreatePartnerDialog';
import EditPartnerDialog from '@/components/admin/EditPartnerDialog';
import PartnersTable from '@/components/admin/PartnersTable';
import { adminNavItems } from '@/lib/navItems';

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
        slug,
        created_at,
        is_active,
        user_id
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
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
    <DashboardLayout navItems={adminNavItems} title="Atlas">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-end">
          <CreatePartnerDialog onSuccess={fetchPartners} />
        </div>

        {/* Partners Table */}
        <div className="border border-border rounded-lg">
          <PartnersTable
            partners={partners}
            loading={loading}
            onEdit={handleEdit}
            onRefresh={fetchPartners}
          />
        </div>

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
