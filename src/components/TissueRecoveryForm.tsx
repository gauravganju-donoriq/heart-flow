import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save, Download } from 'lucide-react';
import { generate7033fPdf } from '@/lib/generate7033fPdf';
import { logActivity } from '@/lib/activityLog';

const VASCULAR_TISSUE_OPTIONS = [
  'RIGHT Saphenous Vein',
  'LEFT Saphenous Vein',
  'RIGHT Femoral Vessels',
  'LEFT Femoral Vessels',
];

const CARDIAC_TISSUE_OPTIONS = [
  'Aortoiliac Artery',
  'Heart for Valves',
  'Other',
];

interface TissueRow {
  id?: string;
  tissue_category: string;
  tissue_type: string;
  timestamp_value: string;
  recovery_technician: string;
}

interface RecoveryData {
  id?: string;
  consent_delivery_method: string;
  packaging_deviation: boolean;
  packaging_notes: string;
  heart_request_needed: boolean;
  heart_request_form_completed: boolean;
  form_completed_by: string;
  lemaitre_donor_number: string;
}

const emptyRecovery: RecoveryData = {
  consent_delivery_method: '',
  packaging_deviation: false,
  packaging_notes: '',
  heart_request_needed: false,
  heart_request_form_completed: false,
  form_completed_by: '',
  lemaitre_donor_number: '',
};

interface DonorInfo {
  donor_code: string | null;
  donor_age: number | null;
  gender: string | null;
  death_date: string | null;
  time_of_death: string | null;
  death_type: string | null;
  death_timezone: string | null;
  external_donor_id: string | null;
  partner_name: string | null;
  din?: string | null;
  hv_heart_valves?: boolean | null;
  ai_aorto_iliac?: boolean | null;
  fm_femoral?: boolean | null;
  sv_saphenous_vein?: boolean | null;
}

interface Props {
  donorId: string;
  donorInfo?: DonorInfo;
  readOnly?: boolean;
}

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <dt className="text-[13px] text-muted-foreground">{label}</dt>
    <dd className="text-[13px]">{value || '—'}</dd>
  </div>
);

const TissueRecoveryForm = ({ donorId, donorInfo, readOnly = false }: Props) => {
  const { toast } = useToast();
  const [recovery, setRecovery] = useState<RecoveryData>(emptyRecovery);
  const [tissues, setTissues] = useState<TissueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => { fetchData(); }, [donorId]);

  const fetchData = async () => {
    const { data: rec } = await supabase
      .from('tissue_recoveries')
      .select('*')
      .eq('donor_id', donorId)
      .maybeSingle();

    if (rec) {
      setRecovery({
        id: rec.id,
        consent_delivery_method: rec.consent_delivery_method || '',
        packaging_deviation: rec.packaging_deviation || false,
        packaging_notes: rec.packaging_notes || '',
        heart_request_needed: rec.heart_request_needed || false,
        heart_request_form_completed: rec.heart_request_form_completed || false,
        form_completed_by: rec.form_completed_by || '',
        lemaitre_donor_number: rec.lemaitre_donor_number || '',
      });
      setExists(true);

      const { data: tissueData } = await supabase
        .from('recovered_tissues')
        .select('*')
        .eq('tissue_recovery_id', rec.id)
        .order('created_at');

      if (tissueData) {
        setTissues(tissueData.map(t => ({
          id: t.id,
          tissue_category: t.tissue_category,
          tissue_type: t.tissue_type,
          timestamp_value: t.timestamp_value ? new Date(t.timestamp_value).toISOString().slice(0, 16) : '',
          recovery_technician: t.recovery_technician || '',
        })));
      }
    } else {
      // Pre-populate tissue rows based on intake flags
      const autoRows: TissueRow[] = [];
      if (donorInfo?.hv_heart_valves) {
        autoRows.push({ tissue_category: 'cardiac', tissue_type: 'Heart for Valves', timestamp_value: '', recovery_technician: '' });
      }
      if (donorInfo?.ai_aorto_iliac) {
        autoRows.push({ tissue_category: 'cardiac', tissue_type: 'Aortoiliac Artery', timestamp_value: '', recovery_technician: '' });
      }
      if (donorInfo?.fm_femoral) {
        autoRows.push({ tissue_category: 'vascular', tissue_type: 'RIGHT Femoral Vessels', timestamp_value: '', recovery_technician: '' });
        autoRows.push({ tissue_category: 'vascular', tissue_type: 'LEFT Femoral Vessels', timestamp_value: '', recovery_technician: '' });
      }
      if (donorInfo?.sv_saphenous_vein) {
        autoRows.push({ tissue_category: 'vascular', tissue_type: 'RIGHT Saphenous Vein', timestamp_value: '', recovery_technician: '' });
        autoRows.push({ tissue_category: 'vascular', tissue_type: 'LEFT Saphenous Vein', timestamp_value: '', recovery_technician: '' });
      }
      if (autoRows.length > 0) setTissues(autoRows);
    }
    setLoading(false);
  };

  const addTissueRow = (category: 'vascular' | 'cardiac') => {
    setTissues(prev => [...prev, { tissue_category: category, tissue_type: '', timestamp_value: '', recovery_technician: '' }]);
  };

  const removeTissueRow = (index: number) => {
    setTissues(prev => prev.filter((_, i) => i !== index));
  };

  const updateTissueRow = (index: number, field: keyof TissueRow, value: string) => {
    setTissues(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let recoveryId = recovery.id;

      if (exists && recoveryId) {
        const { error } = await supabase
          .from('tissue_recoveries')
          .update({
            consent_delivery_method: recovery.consent_delivery_method || null,
            packaging_deviation: recovery.packaging_deviation,
            packaging_notes: recovery.packaging_notes || null,
            heart_request_needed: recovery.heart_request_needed,
            heart_request_form_completed: recovery.heart_request_form_completed,
            form_completed_by: recovery.form_completed_by || null,
            lemaitre_donor_number: recovery.lemaitre_donor_number || null,
          })
          .eq('id', recoveryId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('tissue_recoveries')
          .insert({
            donor_id: donorId,
            consent_delivery_method: recovery.consent_delivery_method || null,
            packaging_deviation: recovery.packaging_deviation,
            packaging_notes: recovery.packaging_notes || null,
            heart_request_needed: recovery.heart_request_needed,
            heart_request_form_completed: recovery.heart_request_form_completed,
            form_completed_by: recovery.form_completed_by || null,
            lemaitre_donor_number: recovery.lemaitre_donor_number || null,
          })
          .select('id')
          .single();
        if (error) throw error;
        recoveryId = data.id;
        setRecovery(prev => ({ ...prev, id: recoveryId }));
        setExists(true);
      }

      await supabase.from('recovered_tissues').delete().eq('tissue_recovery_id', recoveryId!);

      if (tissues.length > 0) {
        const tissueInserts = tissues
          .filter(t => t.tissue_type)
          .map(t => ({
            tissue_recovery_id: recoveryId!,
            tissue_category: t.tissue_category,
            tissue_type: t.tissue_type,
            timestamp_value: t.timestamp_value ? new Date(t.timestamp_value).toISOString() : null,
            recovery_technician: t.recovery_technician || null,
          }));

        if (tissueInserts.length > 0) {
          const { error } = await supabase.from('recovered_tissues').insert(tissueInserts);
          if (error) throw error;
        }
      }

      toast({ title: 'Saved', description: 'Tissue recovery form saved successfully' });
      fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    generate7033fPdf(
      donorInfo || {
        donor_code: null, donor_age: null, gender: null, death_date: null,
        time_of_death: null, death_type: null, death_timezone: null,
        external_donor_id: null, partner_name: null,
      },
      recovery,
      tissues
    );
    logActivity('data_export', { export_type: '7033F PDF', donor_id: donorInfo?.din || undefined });
  };

  if (loading) return null;

  const vascularTissues = tissues.filter(t => t.tissue_category === 'vascular');
  const cardiacTissues = tissues.filter(t => t.tissue_category === 'cardiac');

  const deathTypeLabel = donorInfo?.death_type === 'Cardiac' ? 'Asystole' : donorInfo?.death_type === 'Neurological' ? 'Cross Clamp' : donorInfo?.death_type || '—';

  /* ─── Donor Header (mirrors PDF top section) ─── */
  const DonorHeader = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">7033F — Tissue Recovery Form</p>
          <div className="flex items-center gap-2">
            {exists && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">Saved</span>
            )}
            {exists && (
              <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="h-8 text-[13px]">
                <Download className="h-3.5 w-3.5 mr-1.5" />PDF
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Recovery Agency" value={donorInfo?.partner_name} />
          <Field label="Recovery Agency Donor ID" value={donorInfo?.external_donor_id} />
          <Field label="Donor Age" value={donorInfo?.donor_age} />
          <Field label="Sex at Birth" value={donorInfo?.gender} />
          <Field label="Date of Death" value={donorInfo?.death_date ? new Date(donorInfo.death_date).toLocaleDateString() : null} />
          <Field label="Time of Death" value={donorInfo?.time_of_death} />
          <Field label="Death Type" value={deathTypeLabel} />
          <Field label="Time Zone" value={donorInfo?.death_timezone} />
          <Field label="DIN (Donor Identification Number)" value={donorInfo?.din || recovery.lemaitre_donor_number || '—'} />
        </dl>
        <p className="text-xs text-muted-foreground mt-4 italic">
          * Brain death is not acceptable. Utilize Cross Clamp or Asystolic Date/Time. Warm Ischemic Time shall not exceed accepted parameters.
        </p>
      </CardContent>
    </Card>
  );

  /* ─── Tissue Table (read-only) ─── */
  const TissueTable = ({ title, columnLabel, rows }: { title: string; columnLabel: string; rows: TissueRow[] }) => {
    if (rows.length === 0) return null;
    return (
      <Card>
        <CardHeader><p className="text-sm font-medium">{title}</p></CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground/70 px-4 py-2.5">Tissue Type</th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground/70 px-4 py-2.5">{columnLabel}</th>
                  <th className="text-left text-xs uppercase tracking-wider text-muted-foreground/70 px-4 py-2.5">Recovery Technician</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="text-[13px] px-4 py-3">{t.tissue_type}</td>
                    <td className="text-[13px] px-4 py-3">{t.timestamp_value ? new Date(t.timestamp_value).toLocaleString() : '—'}</td>
                    <td className="text-[13px] px-4 py-3">{t.recovery_technician || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  /* ─── READ-ONLY MODE ─── */
  if (readOnly) {
    return (
      <div className="space-y-5">
        <DonorHeader />

        {!exists ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-[13px] text-muted-foreground text-center">No tissue recovery form has been submitted yet.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <TissueTable title="Vascular Tissues — Wet Ice" columnLabel="Wet Ice Date & Time" rows={vascularTissues} />
            <TissueTable title="Cardiac Tissues — Cold Solution" columnLabel="Cold Solution Date & Time" rows={cardiacTissues} />

            <Card>
              <CardHeader><p className="text-sm font-medium">Consent & Logistics</p></CardHeader>
              <CardContent>
                <dl className="grid gap-4 md:grid-cols-2">
                  <Field label="Consent/Authorization Delivery" value={
                    recovery.consent_delivery_method === 'portal' ? 'Uploaded in LeMaitre Partner Portal'
                    : recovery.consent_delivery_method === 'in_shipper' ? 'In tissue shipper'
                    : recovery.consent_delivery_method === 'emailed' ? 'Emailed to TissueIn@lemaitre.com'
                    : recovery.consent_delivery_method
                  } />
                  <Field label="Packaging Deviation" value={recovery.packaging_deviation ? 'Yes' : 'No'} />
                  {recovery.packaging_deviation && (
                    <div className="md:col-span-2">
                      <dt className="text-[13px] text-muted-foreground">Packaging Notes</dt>
                      <dd className="text-[13px] whitespace-pre-wrap">{recovery.packaging_notes || '—'}</dd>
                    </div>
                  )}
                  <Field label="Heart Request Needed" value={recovery.heart_request_needed ? 'Yes — report, slides, and/or return tissue' : 'No requests, LeMaitre hold'} />
                  {recovery.heart_request_needed && (
                    <Field label="Heart Request Form 7117F" value={recovery.heart_request_form_completed ? 'Completed' : 'Not completed'} />
                  )}
                  <Field label="Form Completed By" value={recovery.form_completed_by} />
                  <Field label="DIN (Donor Identification Number)" value={donorInfo?.din || recovery.lemaitre_donor_number} />
                </dl>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  /* ─── EDITABLE MODE ─── */
  const TissueEditRow = ({ t, i, options, timestampLabel }: { t: TissueRow; i: number; options: string[]; timestampLabel: string }) => (
    <div className="grid grid-cols-12 gap-2 items-end border border-border rounded-lg p-3 bg-muted/30">
      <div className="col-span-4">
        <Label className="text-xs text-muted-foreground">Tissue Type</Label>
        <Select value={t.tissue_type} onValueChange={v => updateTissueRow(i, 'tissue_type', v)}>
          <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-4">
        <Label className="text-xs text-muted-foreground">{timestampLabel}</Label>
        <Input type="datetime-local" className="h-9 text-[13px]" value={t.timestamp_value} onChange={e => updateTissueRow(i, 'timestamp_value', e.target.value)} />
      </div>
      <div className="col-span-3">
        <Label className="text-xs text-muted-foreground">Recovery Technician</Label>
        <Input className="h-9 text-[13px]" value={t.recovery_technician} onChange={e => updateTissueRow(i, 'recovery_technician', e.target.value)} placeholder="Name" />
      </div>
      <div className="col-span-1 flex justify-center">
        <Button type="button" variant="ghost" size="icon" onClick={() => removeTissueRow(i)} className="text-destructive h-9 w-9">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <DonorHeader />

      {/* Vascular Tissues */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Vascular Tissues — Wet Ice</p>
            <Button type="button" variant="outline" size="sm" onClick={() => addTissueRow('vascular')} className="h-8 text-[13px]">
              <Plus className="h-3 w-3 mr-1" />Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {tissues.map((t, i) => t.tissue_category === 'vascular' && (
            <TissueEditRow key={i} t={t} i={i} options={VASCULAR_TISSUE_OPTIONS} timestampLabel="Wet Ice Date/Time" />
          ))}
          {vascularTissues.length === 0 && (
            <p className="text-[13px] text-muted-foreground">No vascular tissues added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Cardiac Tissues */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Cardiac Tissues — Cold Solution</p>
            <Button type="button" variant="outline" size="sm" onClick={() => addTissueRow('cardiac')} className="h-8 text-[13px]">
              <Plus className="h-3 w-3 mr-1" />Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {tissues.map((t, i) => t.tissue_category === 'cardiac' && (
            <TissueEditRow key={i} t={t} i={i} options={CARDIAC_TISSUE_OPTIONS} timestampLabel="Cold Solution Date/Time" />
          ))}
          {cardiacTissues.length === 0 && (
            <p className="text-[13px] text-muted-foreground">No cardiac tissues added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Consent Delivery */}
      <Card>
        <CardHeader><p className="text-sm font-medium">Donor Consent/Authorization</p></CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Label className="text-[13px] text-muted-foreground">Delivery Method</Label>
            <Select value={recovery.consent_delivery_method} onValueChange={v => setRecovery(p => ({ ...p, consent_delivery_method: v }))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="portal">Uploaded in LeMaitre Partner Portal</SelectItem>
                <SelectItem value="in_shipper">In tissue shipper</SelectItem>
                <SelectItem value="emailed">Emailed to TissueIn@lemaitre.com</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Packaging */}
      <Card>
        <CardHeader><p className="text-sm font-medium">Packaging & Shipping</p></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={recovery.packaging_deviation} onCheckedChange={v => setRecovery(p => ({ ...p, packaging_deviation: v }))} />
            <Label className="text-[13px]">Any notes or deviations about packaging or shipping?</Label>
          </div>
          {recovery.packaging_deviation && (
            <Textarea
              className="text-[13px]"
              placeholder="Explain deviations..."
              value={recovery.packaging_notes}
              onChange={e => setRecovery(p => ({ ...p, packaging_notes: e.target.value }))}
              rows={3}
            />
          )}
          <p className="text-xs text-muted-foreground italic">All blood tubes shall be shipped directly to testing lab — do not send to LeMaitre.</p>
        </CardContent>
      </Card>

      {/* Heart Request */}
      <Card>
        <CardHeader><p className="text-sm font-medium">Heart Valve Donors</p></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">All Heart for Valve Donors — Any heart requests on this donor? (report, slides, and/or return tissue)</p>
          <div className="flex items-center gap-3">
            <Switch checked={recovery.heart_request_needed} onCheckedChange={v => setRecovery(p => ({ ...p, heart_request_needed: v }))} />
            <Label className="text-[13px]">{recovery.heart_request_needed ? 'Yes, requests needed' : 'No requests, LeMaitre hold'}</Label>
          </div>
          {recovery.heart_request_needed && (
            <div className="flex items-center gap-3 pl-6">
              <Switch checked={recovery.heart_request_form_completed} onCheckedChange={v => setRecovery(p => ({ ...p, heart_request_form_completed: v }))} />
              <Label className="text-[13px]">MUST complete Heart Request Form 7117F</Label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Footer */}
      <Card>
        <CardHeader><p className="text-sm font-medium">Form Details</p></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-[13px] text-muted-foreground">Form Completed By</Label>
              <Input
                className="h-9 text-[13px]"
                value={recovery.form_completed_by}
                onChange={e => setRecovery(p => ({ ...p, form_completed_by: e.target.value }))}
                placeholder="Name of person completing form"
              />
            </div>
            <div>
              <Label className="text-[13px] text-muted-foreground">DIN (Donor Identification Number)</Label>
              <Input
                className="h-9 text-[13px] bg-muted"
                value={donorInfo?.din || recovery.lemaitre_donor_number}
                readOnly
                placeholder="Auto-generated on submission"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">FORM # 7033F_vs11</p>
            <Button onClick={handleSave} disabled={saving} className="h-9 text-[13px]">
              <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? 'Saving...' : 'Save Recovery Form'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TissueRecoveryForm;
