import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

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
    // User is logged in but has no role assigned
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

  if (requiredRole && role !== requiredRole) {
    // Redirect to appropriate dashboard based on role
    return <Navigate to={role === 'admin' ? '/admin' : '/partner'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
