import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import lemaitreIcon from '@/assets/lemaitre-icon.png';
import LoginBackground from '@/components/LoginBackground';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const PartnerLogin = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, role, loading: authLoading, signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [orgName, setOrgName] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPartner = async () => {
      if (!slug) return;
      const { data, error } = await supabase
        .from('partners')
        .select('organization_name, is_active')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else if (!data.is_active) {
        setNotFound(true);
      } else {
        setOrgName(data.organization_name);
      }
      setPageLoading(false);
    };
    fetchPartner();
  }, [slug]);

  if (!authLoading && user && role) {
    return <Navigate to={role === 'admin' ? '/admin' : '/partner'} replace />;
  }

  if (pageLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
        <LoginBackground />
        <div className="relative z-10 w-full max-w-sm animate-fade-in">
          <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-xl p-8 text-center">
            <h2 className="text-lg font-semibold text-foreground mb-2">Page Not Found</h2>
            <p className="text-[13px] text-muted-foreground">
              This partner login page does not exist or has been deactivated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: error.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please try again.'
          : error.message,
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <LoginBackground />

      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        {/* Logo & partner name */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <img src={lemaitreIcon} alt="LeMaitre" className="h-4 w-auto" />
            <span className="text-lg font-bold uppercase tracking-[0.25em] text-foreground leading-none">Atlas</span>
          </div>
          <p className="text-[13px] text-muted-foreground">
            {orgName} — Partner Portal
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-10"
              />
              {errors.email && <p className="text-[12px] text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px]">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-10"
              />
              {errors.password && <p className="text-[12px] text-destructive">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full h-10" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PartnerLogin;
