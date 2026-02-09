import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Phone, CheckCircle, Loader2 } from 'lucide-react';

const RetellSetup = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<{
    configured: boolean;
    agent_id?: string;
    phone_number?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [setting, setSetting] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('setup-retell', {
        body: { action: 'status' },
      });

      if (error) throw error;
      setStatus(data);
    } catch (err) {
      console.error('Failed to check Retell status:', err);
      setStatus({ configured: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setSetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-retell', {
        body: { action: 'setup' },
      });

      if (error) throw error;

      toast({
        title: 'Retell AI Configured',
        description: `Phone number: ${data.phone_number}`,
      });

      setStatus({
        configured: true,
        agent_id: data.agent_id,
        phone_number: data.phone_number,
      });
    } catch (err) {
      console.error('Setup failed:', err);
      toast({
        variant: 'destructive',
        title: 'Setup Failed',
        description: err instanceof Error ? err.message : 'Failed to configure Retell AI',
      });
    } finally {
      setSetting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Phone Intake (Retell AI)
            </CardTitle>
            <CardDescription>
              Allow partners to submit donor information via phone call
            </CardDescription>
          </div>
          {status?.configured && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {status?.configured ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Phone Number</p>
              <p className="text-lg font-mono font-semibold">{status.phone_number}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Partners can call this number to submit donor information. The AI agent will collect
              details and create a draft donor record automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set up an AI-powered phone line that partners can call to submit donor information
              conversationally. The system will automatically create draft donor records from call
              transcripts.
            </p>
            <Button onClick={handleSetup} disabled={setting}>
              {setting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting Up...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Setup Retell AI Agent
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RetellSetup;
