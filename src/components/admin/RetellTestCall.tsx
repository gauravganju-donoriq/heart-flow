import { useState, useRef, useCallback, useEffect } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, PhoneCall, PhoneOff, Loader2, Volume2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TranscriptEntry {
  role: 'agent' | 'user';
  content: string;
}

const RetellTestCall = () => {
  const { toast } = useToast();
  const clientRef = useRef<RetellWebClient | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const callStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clientRef.current?.stopCall();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const startCall = useCallback(async () => {
    setCallStatus('connecting');
    setTranscript([]);
    setCallDuration(0);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Microphone Required',
        description: 'Please allow microphone access to start a test call.',
      });
      setCallStatus('idle');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-web-call');
      if (error || !data?.access_token) {
        throw new Error(error?.message || 'Failed to create web call');
      }

      const client = new RetellWebClient();
      clientRef.current = client;

      client.on('call_started', () => {
        setCallStatus('connected');
        callStartRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
        }, 1000);
      });

      client.on('call_ended', () => {
        setCallStatus('ended');
        if (timerRef.current) clearInterval(timerRef.current);
      });

      client.on('agent_start_talking', () => setAgentSpeaking(true));
      client.on('agent_stop_talking', () => setAgentSpeaking(false));

      client.on('update', (update: any) => {
        if (update.transcript) {
          const entries: TranscriptEntry[] = update.transcript.map((t: any) => ({
            role: t.role === 'agent' ? 'agent' : 'user',
            content: t.content,
          }));
          setTranscript(entries);
        }
      });

      client.on('error', (error: any) => {
        console.error('Retell error:', error);
        toast({
          variant: 'destructive',
          title: 'Call Error',
          description: 'An error occurred during the call.',
        });
        setCallStatus('ended');
        if (timerRef.current) clearInterval(timerRef.current);
      });

      await client.startCall({ accessToken: data.access_token });
    } catch (err) {
      console.error('Start call failed:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to Start Call',
        description: err instanceof Error ? err.message : 'Could not start web call',
      });
      setCallStatus('idle');
    }
  }, [toast]);

  const endCall = useCallback(() => {
    clientRef.current?.stopCall();
    setCallStatus('ended');
    setAgentSpeaking(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5" />
            <p className="text-sm font-medium">Test Call (Browser)</p>
          </div>
          {callStatus === 'connected' && (
            <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md">
              {agentSpeaking ? (
                <><Volume2 className="h-3 w-3 mr-1" />Agent Speaking</>
              ) : (
                <><Mic className="h-3 w-3 mr-1" />Listening</>
              )}
            </Badge>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground">
          Talk to Sarah directly from your browser to test the intake flow
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {callStatus === 'idle' && (
          <div className="space-y-3">
            <p className="text-[13px] text-muted-foreground">
              Start a web call to test the full intake experience — same agent, same webhook, same transcript processing. Uses WebRTC so no phone number is needed.
            </p>
            <Button onClick={startCall}>
              <Mic className="h-4 w-4 mr-2" />
              Start Test Call
            </Button>
          </div>
        )}

        {callStatus === 'connecting' && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting to Sarah...
          </div>
        )}

        {(callStatus === 'connected' || callStatus === 'ended') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {callStatus === 'connected' && (
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm text-muted-foreground">{formatDuration(callDuration)}</span>
                  </div>
                )}
                {callStatus === 'ended' && (
                  <span className="text-sm text-muted-foreground">
                    Call ended · {formatDuration(callDuration)}
                  </span>
                )}
              </div>
              {callStatus === 'connected' && (
                <Button variant="destructive" size="sm" onClick={endCall}>
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              )}
            </div>

            {transcript.length > 0 && (
              <ScrollArea className="h-[280px] rounded-md border p-3" ref={scrollRef as any}>
                <div className="space-y-2">
                  {transcript.map((entry, i) => (
                    <div key={i} className={`text-[13px] ${entry.role === 'agent' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      <span className="font-medium">{entry.role === 'agent' ? 'Sarah' : 'You'}:</span>{' '}
                      {entry.content}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {callStatus === 'ended' && (
              <div className="space-y-2">
                <p className="text-[13px] text-muted-foreground">
                  The webhook will process this call like a real phone call — check the donors list for the new record.
                </p>
                <Button variant="outline" size="sm" onClick={() => { setCallStatus('idle'); setTranscript([]); }}>
                  <PhoneCall className="h-4 w-4 mr-2" />
                  New Test Call
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RetellTestCall;
