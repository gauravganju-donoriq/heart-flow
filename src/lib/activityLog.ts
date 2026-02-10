import { supabase } from '@/integrations/supabase/client';

type ActivityAction = 'login' | 'logout' | 'donor_view' | 'data_export';

interface ActivityDetails {
  donor_id?: string;
  donor_din?: string;
  export_type?: string;
  file_name?: string;
  [key: string]: unknown;
}

export async function logActivity(action: ActivityAction, details: ActivityDetails = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase.from as any)('user_activity_log').insert({
      user_id: user.id,
      action,
      details,
    });
  } catch {
    // Silent fail — logging should never block user actions
  }
}
