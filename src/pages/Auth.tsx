import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import lemaitreIcon from '@/assets/lemaitre-icon.png';
import LoginBackground from '@/components/LoginBackground';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Auth = () => {
  const { user, role, loading, signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginType, setLoginType] = useState<'admin' | 'partner'>('admin');

  if (!loading && user && role) {
    return <Navigate to={role === 'admin' || role === 'user' ? '/admin' : '/partner'} replace />;
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <LoginBackground />

      {/* Subtle top-left grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        {/* Logo & heading */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <img src={lemaitreIcon} alt="LeMaitre" className="h-4 w-auto" />
            <span className="text-lg font-bold uppercase tracking-[0.25em] text-foreground leading-none">Atlas</span>
          </div>
        </div>

        {/* Role selector */}
        <div className="flex rounded-lg border border-border/60 bg-card/60 backdrop-blur-xl p-1 mb-5">
          <button
            type="button"
            onClick={() => setLoginType('admin')}
            className={`flex-1 text-[13px] font-medium py-2 rounded-md transition-all ${
              loginType === 'admin'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Admin / Staff
          </button>
          <button
            type="button"
            onClick={() => setLoginType('partner')}
            className={`flex-1 text-[13px] font-medium py-2 rounded-md transition-all ${
              loginType === 'partner'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Recovery Partner
          </button>
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-xl p-6 shadow-sm">
          <p className="text-[13px] text-muted-foreground mb-4">
            {loginType === 'admin'
              ? 'Sign in with your LeMaitre staff credentials.'
              : 'Sign in with the credentials provided by your LeMaitre contact.'}
          </p>
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
              {errors.email && (
                <p className="text-[12px] text-destructive">{errors.email}</p>
              )}
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
              {errors.password && (
                <p className="text-[12px] text-destructive">{errors.password}</p>
              )}
            </div>
            <Button type="submit" className="w-full h-10" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {loginType === 'partner' && (
            <p className="mt-4 text-center text-[12px] text-muted-foreground">
              Need an account? Contact your LeMaitre administrator.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
