import { LayoutDashboard, Users, FileText, ScrollText, Shield, Settings } from 'lucide-react';

export const adminNavItems = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Partners', href: '/admin/partners', icon: <Users className="h-4 w-4" /> },
  { label: 'Donors', href: '/admin/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Screening', href: '/admin/screening-settings', icon: <Shield className="h-4 w-4" /> },
  { label: 'Audit Log', href: '/admin/audit-log', icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-4 w-4" /> },
];

export const partnerNavItems = [
  { label: 'Dashboard', href: '/partner', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Donors', href: '/partner/donors', icon: <FileText className="h-4 w-4" /> },
];
