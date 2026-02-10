import DashboardLayout from '@/components/layouts/DashboardLayout';
import RetellSetup from '@/components/admin/RetellSetup';
import { LayoutDashboard, Users, FileText, ScrollText, Shield, Settings } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Partners', href: '/admin/partners', icon: <Users className="h-4 w-4" /> },
  { label: 'Donors', href: '/admin/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Screening', href: '/admin/screening-settings', icon: <Shield className="h-4 w-4" /> },
  { label: 'Audit Log', href: '/admin/audit-log', icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-4 w-4" /> },
];

const AdminSettings = () => {
  return (
    <DashboardLayout navItems={navItems} title="Atlas">
      <div className="space-y-5 max-w-4xl">
        <RetellSetup />
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
