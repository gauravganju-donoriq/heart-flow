import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Phone, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface CallTranscriptData {
  id: string;
  transcript: string;
  call_duration_seconds: number | null;
  caller_phone: string | null;
  created_at: string;
  retell_call_id: string;
}

interface CallTranscriptProps {
  donorId: string;
}

const CallTranscript = ({ donorId }: CallTranscriptProps) => {
  const [transcript, setTranscript] = useState<CallTranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('call_transcripts')
        .select('id, transcript, call_duration_seconds, caller_phone, created_at, retell_call_id')
        .eq('donor_id', donorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setTranscript(data);
      setLoading(false);
    };
    fetch();
  }, [donorId]);

  if (loading || !transcript) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-4 w-4" />
                Call Transcript
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Call metadata */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(transcript.created_at).toLocaleString()}
              </div>
              {transcript.call_duration_seconds && (
                <div>Duration: {formatDuration(transcript.call_duration_seconds)}</div>
              )}
              {transcript.caller_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {transcript.caller_phone}
                </div>
              )}
            </div>

            {/* Transcript text */}
            <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                {transcript.transcript}
              </pre>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default CallTranscript;
