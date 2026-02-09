import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ScreeningResult {
  id: string;
  donor_id: string;
  verdict: string;
  confidence: number;
  reasoning: string;
  concerns: { concern: string; severity: string; guideline_ref: string }[];
  missing_data: string[];
  model_used: string;
  guidelines_snapshot: any[];
  created_at: string;
}

interface AIScreeningPanelProps {
  donorId: string;
}

const verdictConfig: Record<string, { label: string; style: string; icon: React.ReactNode }> = {
  accept: { label: 'Accept', style: 'text-emerald-600', icon: <CheckCircle className="h-4 w-4" /> },
  reject: { label: 'Reject', style: 'text-red-500', icon: <XCircle className="h-4 w-4" /> },
  needs_review: { label: 'Needs Review', style: 'text-amber-600', icon: <Clock className="h-4 w-4" /> },
};

const severityDot: Record<string, string> = {
  low: 'bg-blue-400',
  medium: 'bg-amber-400',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const AIScreeningPanel = ({ donorId }: AIScreeningPanelProps) => {
  const { toast } = useToast();
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [screening, setScreening] = useState(false);
  

  useEffect(() => { fetchLatestResult(); }, [donorId]);

  const fetchLatestResult = async () => {
    const { data } = await supabase
      .from('screening_results')
      .select('*')
      .eq('donor_id', donorId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const r = data[0];
      setResult({
        ...r,
        concerns: Array.isArray(r.concerns) ? r.concerns as any : [],
        missing_data: Array.isArray(r.missing_data) ? r.missing_data as string[] : [],
        guidelines_snapshot: Array.isArray(r.guidelines_snapshot) ? r.guidelines_snapshot : [],
      });
    }
    setLoading(false);
  };

  const runScreening = async () => {
    setScreening(true);
    try {
      const { data, error } = await supabase.functions.invoke('screen-donor', {
        body: { donor_id: donorId },
      });

      if (error) {
        toast({ variant: 'destructive', title: 'Screening Failed', description: error.message || 'Unknown error' });
        setScreening(false);
        return;
      }

      if (data?.error) {
        toast({ variant: 'destructive', title: 'Screening Failed', description: data.error });
        setScreening(false);
        return;
      }

      setResult({
        ...data,
        concerns: Array.isArray(data.concerns) ? data.concerns : [],
        missing_data: Array.isArray(data.missing_data) ? data.missing_data : [],
        guidelines_snapshot: Array.isArray(data.guidelines_snapshot) ? data.guidelines_snapshot : [],
      });
      toast({ title: 'Screening Complete', description: 'AI evaluation has been saved' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to run screening' });
    }
    setScreening(false);
  };

  if (loading) return null;

  const vc = result ? verdictConfig[result.verdict] : null;

  return (
    <div className="space-y-5">
      {/* Verdict & Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">AI Recommendation</p>
            {result && (
              <Button variant="outline" size="sm" className="h-8 text-[13px]" onClick={runScreening} disabled={screening}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${screening ? 'animate-spin' : ''}`} />
                Re-run
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!result && !screening && (
            <div className="text-center py-8">
              <p className="text-[13px] text-muted-foreground mb-3">No screening has been run yet</p>
              <Button onClick={runScreening} size="sm" className="h-9 text-[13px]">Run AI Screening</Button>
            </div>
          )}

          {screening && (
            <div className="text-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground mb-2" />
              <p className="text-[13px] text-muted-foreground">Evaluating donor profile…</p>
            </div>
          )}

          {result && !screening && vc && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 ${vc.style}`}>
                  {vc.icon}
                  <span className="text-base font-semibold">{vc.label}</span>
                </div>
                <span className="text-[13px] text-muted-foreground">{Math.round(result.confidence * 100)}% confidence</span>
              </div>

              {/* Confidence bar */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    result.verdict === 'accept' ? 'bg-emerald-500' :
                    result.verdict === 'reject' ? 'bg-red-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${result.confidence * 100}%` }}
                />
              </div>

              {/* Reasoning summary inline */}
              {result.reasoning && (
                <p className="text-[13px] text-muted-foreground leading-relaxed">{result.reasoning}</p>
              )}

              <p className="text-xs text-muted-foreground pt-1">
                Advisory only — final decision is yours · {new Date(result.created_at).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Concerns */}
      {result && !screening && result.concerns.length > 0 && (
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Concerns ({result.concerns.length})</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-0 divide-y divide-border">
              {result.concerns.map((c, i) => (
                <div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${severityDot[c.severity] || 'bg-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px]">{c.concern}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground capitalize">{c.severity}</span>
                      {c.guideline_ref && (
                        <>
                          <span className="text-[11px] text-muted-foreground">·</span>
                          <span className="text-[11px] text-muted-foreground">{c.guideline_ref}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing Data */}
      {result && !screening && result.missing_data.length > 0 && (
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Missing Data</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {result.missing_data.map((field, i) => (
                <Badge key={i} variant="outline" className="text-[12px] font-normal">{field}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default AIScreeningPanel;
