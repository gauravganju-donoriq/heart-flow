import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Brain, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Info } from 'lucide-react';

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

const verdictConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  accept: { label: 'Accept', color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="h-5 w-5 text-green-600" /> },
  reject: { label: 'Reject', color: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="h-5 w-5 text-red-600" /> },
  needs_review: { label: 'Needs Review', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock className="h-5 w-5 text-yellow-600" /> },
};

const severityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const AIScreeningPanel = ({ donorId }: AIScreeningPanelProps) => {
  const { toast } = useToast();
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [screening, setScreening] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);

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

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>AI Screening</CardTitle>
          </div>
          {result ? (
            <Button variant="outline" size="sm" onClick={runScreening} disabled={screening}>
              <RefreshCw className={`h-4 w-4 mr-2 ${screening ? 'animate-spin' : ''}`} />
              Re-run
            </Button>
          ) : null}
        </div>
        <CardDescription className="flex items-center gap-1">
          <Info className="h-3 w-3" /> AI Recommendation — Final decision is yours
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!result && !screening && (
          <div className="text-center py-6 space-y-3">
            <p className="text-muted-foreground text-sm">No screening has been run for this donor yet.</p>
            <Button onClick={runScreening}><Brain className="h-4 w-4 mr-2" />Run AI Screening</Button>
          </div>
        )}

        {screening && (
          <div className="text-center py-8 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Agent is evaluating donor profile...</p>
          </div>
        )}

        {result && !screening && (
          <div className="space-y-4">
            {/* Verdict + Confidence */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${verdictConfig[result.verdict]?.color || 'bg-muted'}`}>
                {verdictConfig[result.verdict]?.icon}
                <span className="font-semibold text-lg">{verdictConfig[result.verdict]?.label || result.verdict}</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium">{Math.round(result.confidence * 100)}%</span>
                </div>
                <Progress value={result.confidence * 100} className="h-2" />
              </div>
            </div>

            {/* Concerns */}
            {result.concerns.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Concerns ({result.concerns.length})</h4>
                <div className="space-y-2">
                  {result.concerns.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded border bg-muted/30">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 text-sm">
                        <p>{c.concern}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs ${severityColors[c.severity] || 'bg-muted'}`}>{c.severity}</Badge>
                          <span className="text-xs text-muted-foreground">Ref: {c.guideline_ref}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Data */}
            {result.missing_data.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-yellow-700">Missing Data</h4>
                <div className="flex flex-wrap gap-1">
                  {result.missing_data.map((field, i) => (
                    <Badge key={i} variant="outline" className="text-yellow-700 border-yellow-300">{field}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning (collapsible) */}
            <Collapsible open={reasoningOpen} onOpenChange={setReasoningOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between" size="sm">
                  <span>Agent Reasoning</span>
                  {reasoningOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 rounded border bg-muted/20 text-sm whitespace-pre-wrap mt-2">
                  {result.reasoning}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>Model: {result.model_used}</span>
              <span>{new Date(result.created_at).toLocaleString()}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIScreeningPanel;
