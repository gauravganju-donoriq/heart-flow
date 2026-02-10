import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** 
   * 'admin' = admin only
   * 'partner' = partner only
   * 'internal' = admin OR user (internal staff)
   */
  requiredRole?: AppRole | 'internal';
}

const INTERNAL_ROLES: AppRole[] = ['admin', 'user'];

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Pending</h1>
          <p className="text-muted-foreground">
            Your account is awaiting role assignment. Please contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  if (requiredRole) {
    if (requiredRole === 'internal') {
      // Allow admin or user roles
      if (!INTERNAL_ROLES.includes(role)) {
        return <Navigate to="/partner" replace />;
      }
    } else if (role !== requiredRole) {
      // For admin-only routes, user role should go to /admin (limited nav)
      if (requiredRole === 'admin' && role === 'user') {
        return <Navigate to="/admin" replace />;
      }
      // Redirect to appropriate dashboard
      return <Navigate to={INTERNAL_ROLES.includes(role) ? '/admin' : '/partner'} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
