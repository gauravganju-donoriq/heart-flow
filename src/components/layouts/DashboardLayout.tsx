import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogOut, Menu, X, Phone } from 'lucide-react';
import lemaitreIcon from '@/assets/lemaitre-icon.png';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  title: string;
  /** Content shown in sticky top bar only when the inline header scrolls out of view */
  scrollHeaderContent?: ReactNode;
}

const DashboardLayout = ({ children, navItems, title, scrollHeaderContent }: DashboardLayoutProps) => {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [intakePhone, setIntakePhone] = useState<string | null>(null);
  const [showScrollHeader, setShowScrollHeader] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Observe a sentinel element to toggle scroll header
  const sentinelCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (!scrollHeaderContent) return;
    if (sentinelRef.current) {
      // cleanup old observer — handled by disconnect below
    }
    sentinelRef.current = node;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollHeader(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [scrollHeaderContent]);

  const isPartner = role === 'partner' || navItems.some(item => !item.href.startsWith('/admin'));

  useEffect(() => {
    if (isPartner) {
      supabase.functions.invoke('get-intake-phone').then(({ data }) => {
        if (data?.phone_number) setIntakePhone(data.phone_number);
      }).catch(() => {});
    }
  }, [isPartner]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-48 bg-background border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo & Portal */}
          <div className="flex items-center justify-between h-14 px-5 border-b">
            <div className="flex items-center gap-2.5">
              <img src={lemaitreIcon} alt="LeMaitre" className="h-4.5 w-auto shrink-0" />
              <span className="text-lg font-bold uppercase tracking-[0.15em] text-foreground leading-none">Atlas</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          {(() => {
            const bottomLabels = ['Settings', 'Audit Log'];
            const mainItems = navItems.filter(item => !bottomLabels.includes(item.label));
            const bottomItems = navItems.filter(item => bottomLabels.includes(item.label));
            const renderLink = (item: NavItem) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            );
            return (
              <>
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                  {mainItems.map(renderLink)}
                </nav>
                {bottomItems.length > 0 && (
                  <div className="px-3 pb-2 space-y-0.5">
                    {bottomItems.map(renderLink)}
                  </div>
                )}
              </>
            );
          })()}

          {/* Phone intake */}
          {intakePhone && (
            <div className="px-3 pb-2">
              <div className="border border-border rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Intake Line</p>
                </div>
                <p className="text-[13px] font-mono font-semibold tracking-wide">{intakePhone}</p>
              </div>
            </div>
          )}

          {/* User section */}
          <div className="p-3 border-t">
            <div className="flex items-center gap-2.5 mb-2.5 px-1">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-foreground truncate">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[13px] text-muted-foreground hover:text-foreground h-8"
              onClick={signOut}
            >
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-48">
        {/* Top bar */}
        <header className="h-14 border-b bg-background flex items-center px-4 lg:px-8 sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-3 h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded shrink-0 mr-3">
            {navItems.some(item => item.href.startsWith('/admin')) ? 'Admin' : 'Partner'}
          </span>
          {scrollHeaderContent && showScrollHeader ? (
            <div className="flex-1 flex items-center min-w-0 animate-in fade-in slide-in-from-top-1 duration-200">
              {scrollHeaderContent}
            </div>
          ) : (
            <div className="flex-1" />
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {/* Sentinel for scroll header detection */}
          {scrollHeaderContent && <div ref={sentinelCallbackRef} className="h-0 w-0" />}
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
