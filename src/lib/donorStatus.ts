import type { Database } from '@/integrations/supabase/types';

type DonorStatus = Database['public']['Enums']['donor_status'];

export const statusStyles: Record<DonorStatus, string> = {
  draft: 'bg-gray-50 text-gray-500 border border-gray-200',
  submitted: 'bg-blue-50 text-blue-600 border border-blue-100',
  under_review: 'bg-amber-50 text-amber-600 border border-amber-100',
  approved: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  rejected: 'bg-red-50 text-red-500 border border-red-100',
};

export const statusLabels: Record<DonorStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
};
