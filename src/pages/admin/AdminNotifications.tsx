import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Check, Eye } from 'lucide-react';
import { adminNavItems } from '@/lib/navItems';
import type { Database } from '@/integrations/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];

const AdminNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchNotifications(); }, [user]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) setNotifications(data);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user?.id).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout navItems={adminNavItems} title="Atlas">
      <div className="space-y-5 max-w-4xl">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="h-9 text-[13px]">
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Mark All Read
            </Button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-[13px] text-muted-foreground">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-[13px] text-muted-foreground">No notifications yet</div>
        ) : (
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start justify-between gap-4 px-5 py-4 ${!n.read ? 'bg-primary/[0.03]' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    <p className="text-[13px] font-medium truncate">{n.title}</p>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[12px] text-muted-foreground mt-1.5">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  {n.donor_id && (
                    <Link to={`/admin/donors/${n.donor_id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                  {!n.read && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markAsRead(n.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminNotifications;
