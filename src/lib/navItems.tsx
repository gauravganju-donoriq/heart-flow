import { LayoutDashboard, Users, UsersRound, FileText, ScrollText, Shield, Settings } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean; // Only shown to admin role, not 'user' role
}

const allAdminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Team', href: '/admin/team', icon: <UsersRound className="h-4 w-4" />, adminOnly: true },
  { label: 'Partners', href: '/admin/partners', icon: <Users className="h-4 w-4" />, adminOnly: true },
  { label: 'Donors', href: '/admin/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Screening', href: '/admin/screening-settings', icon: <Shield className="h-4 w-4" />, adminOnly: true },
  { label: 'Audit Log', href: '/admin/audit-log', icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-4 w-4" />, adminOnly: true },
];

/** Returns admin nav items filtered by role. Admin sees all; user sees non-adminOnly items. */
export function getAdminNavItems(role: AppRole | null): NavItem[] {
  if (role === 'admin') return allAdminNavItems;
  return allAdminNavItems.filter((item) => !item.adminOnly);
}

/** Unfiltered list for backward compat (admin-only pages that already guard themselves) */
export const adminNavItems = allAdminNavItems;

export const partnerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/partner', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Donors', href: '/partner/donors', icon: <FileText className="h-4 w-4" /> },
];
