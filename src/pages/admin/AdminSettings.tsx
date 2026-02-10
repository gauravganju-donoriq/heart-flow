import DashboardLayout from '@/components/layouts/DashboardLayout';
import RetellSetup from '@/components/admin/RetellSetup';
import RetellTestCall from '@/components/admin/RetellTestCall';
import { adminNavItems } from '@/lib/navItems';

const AdminSettings = () => {
  return (
    <DashboardLayout navItems={adminNavItems} title="Atlas">
      <div className="space-y-5 max-w-4xl">
        <RetellSetup />
        <RetellTestCall />
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
