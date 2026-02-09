import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowRight, ChevronDown, User, Phone, Bot } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  changed_by: string;
  changed_fields: Record<string, { old: unknown; new: unknown }> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const fieldLabels: Record<string, string> = {
  call_type: 'Call Type', caller_name: 'Caller Name', donor_age: 'Age', gender: 'Sex at Birth',
  death_date: 'Date of Death', time_of_death: 'Time of Death', death_type: 'Type of Death',
  death_timezone: 'Time Zone', cause_of_death: 'Cause of Death', clinical_course: 'Clinical Course',
  height_inches: 'Height (inches)', weight_kgs: 'Weight (kgs)', medical_history: 'Medical History',
  high_risk_notes: 'High Risk Notes', donor_accepted: 'Accepted/Deferred', hv_heart_valves: 'Heart Valves',
  hv_pathology_request: 'HV Pathology Request', ai_aorto_iliac: 'Aorto Iliac', fm_femoral: 'Femoral En Bloc',
  sv_saphenous_vein: 'Saphenous Vein', has_autopsy: 'Autopsy', external_donor_id: 'External Donor ID',
  is_prescreen_update: 'Prescreen/Update', courier_update: 'Courier Update', first_name: 'First Name',
  last_name: 'Last Name', date_of_birth: 'Date of Birth', blood_type: 'Blood Type',
  tissue_type: 'Tissue Type', tissue_condition: 'Tissue Condition', status: 'Status',
  consent_obtained: 'Consent Obtained', medical_history_reviewed: 'Medical History Reviewed',
  submitted_at: 'Submitted At',
};

const actionConfig: Record<string, { label: string; className: string }> = {
  created: { label: 'Created', className: 'bg-blue-50 text-blue-600 border-blue-200' },
  edit_direct: { label: 'Edited', className: 'bg-muted text-foreground border-border' },
  edit_pending: { label: 'Edit Proposed', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  edit_approved: { label: 'Edit Approved', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  edit_rejected: { label: 'Edit Rejected', className: 'bg-red-50 text-red-500 border-red-200' },
  status_change: { label: 'Status Changed', className: 'bg-violet-50 text-violet-600 border-violet-200' },
};

const formatValue = (val: unknown): string => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
};

const AuditLog = ({ donorId }: { donorId: string }) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    (supabase.from as any)('audit_logs')
      .select('*')
      .eq('donor_id', donorId)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: AuditEntry[] | null }) => {
        if (data) {
          setEntries(data);
          // Fetch user emails for display
          const userIds = [...new Set(data.map(e => e.changed_by))];
          if (userIds.length > 0) {
            supabase
              .from('profiles')
              .select('user_id, email, full_name')
              .in('user_id', userIds)
              .then(({ data: profileData }) => {
                if (profileData) {
                  const map: Record<string, string> = {};
                  for (const p of profileData) {
                    map[p.user_id] = p.full_name || p.email || p.user_id;
                  }
                  setProfiles(map);
                }
              });
          }
        }
        setLoading(false);
      });
  }, [donorId]);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-[13px]">Loading audit log...</div>;
  }

  if (entries.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-[13px]">No audit entries yet</div>;
  }

  return (
    <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
      {entries.map((entry) => {
        const config = actionConfig[entry.action] || actionConfig.edit_direct;
        const fields = entry.changed_fields ? Object.keys(entry.changed_fields) : [];
        const source = (entry.metadata as any)?.source;
        const hasDetails = fields.length > 0;
        const userName = profiles[entry.changed_by] || entry.changed_by.slice(0, 8);

        const summary = (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Badge variant="outline" className={`rounded-md text-[11px] shrink-0 ${config.className}`}>
              {config.label}
            </Badge>
            <span className="text-[13px] text-muted-foreground truncate">
              {fields.length > 0 && `${fields.length} field${fields.length !== 1 ? 's' : ''} · `}
              {userName}
            </span>
            {source && (
              <span className="text-muted-foreground shrink-0">
                {source === 'phone' ? <Phone className="h-3 w-3" /> : source === 'manual' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
              </span>
            )}
          </div>
        );

        const timestamp = (
          <span className="text-[12px] text-muted-foreground shrink-0">
            {new Date(entry.created_at).toLocaleString()}
          </span>
        );

        if (!hasDetails) {
          return (
            <div key={entry.id} className="flex items-center justify-between px-5 py-3.5">
              {summary}
              {timestamp}
            </div>
          );
        }

        return (
          <Collapsible key={entry.id}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-muted/30 transition-colors text-left group">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {summary}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {timestamp}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-5 pb-4">
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="grid grid-cols-3 bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    <div>Field</div>
                    <div>Before</div>
                    <div>After</div>
                  </div>
                  <div className="divide-y divide-border">
                    {fields.map((key) => {
                      const change = entry.changed_fields![key];
                      return (
                        <div key={key} className="grid grid-cols-3 px-4 py-2 text-[13px]">
                          <div className="font-medium text-muted-foreground">{fieldLabels[key] || key}</div>
                          <div className="text-muted-foreground">{formatValue(change?.old)}</div>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-medium">{formatValue(change?.new)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {(entry.metadata as any)?.review_notes && (
                  <p className="text-[13px] text-muted-foreground mt-3">
                    <span className="font-medium">Notes:</span> {(entry.metadata as any).review_notes}
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default AuditLog;
