import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, FileText, Bell, Check, Eye } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];

const navItems = [
  { label: 'Dashboard', href: '/partner', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Donors', href: '/partner/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Notifications', href: '/partner/notifications', icon: <Bell className="h-4 w-4" /> },
];

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user?.id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout navItems={navItems} title="DonorIQ">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</p>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead} className="h-9 text-[13px]"><Check className="h-4 w-4 mr-2" />Mark All as Read</Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-[13px]">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-[13px]">No notifications yet</div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className={`p-4 border rounded-lg ${!notification.read ? 'bg-primary/5 border-primary/20' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className={`text-[13px] font-medium ${!notification.read ? 'text-primary' : ''}`}>{notification.title}</p>
                    <p className="text-[13px] text-muted-foreground mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(notification.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {notification.donor_id && (<Link to={`/partner/donors/${notification.donor_id}`}><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></Link>)}
                    {!notification.read && (<Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}><Check className="h-4 w-4" /></Button>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
