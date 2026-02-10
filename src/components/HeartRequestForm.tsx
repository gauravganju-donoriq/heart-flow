import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Save, Download } from 'lucide-react';
import { generate7117fPdf } from '@/lib/generate7117fPdf';
import { logActivity } from '@/lib/activityLog';

interface DonorInfo {
  first_name?: string | null;
  last_name?: string | null;
  gender?: string | null;
  donor_age?: number | null;
  height_inches?: number | null;
  weight_kgs?: number | null;
  cause_of_death?: string | null;
  external_donor_id?: string | null;
  din?: string | null;
  partner_name?: string | null;
}

interface FormData {
  id?: string;
  request_type: string;
  circumstances_of_death: string;
  me_coroner_name: string;
  me_institution: string;
  me_address: string;
  me_city_state_zip: string;
  me_telephone: string;
  height_method: string;
  weight_method: string;
  consented_for_research: boolean;
  return_heart: boolean;
  histologic_slides_requested: boolean;
  form_completed_by: string;
  form_completed_date: string;
}

const emptyForm: FormData = {
  request_type: 'pathology',
  circumstances_of_death: '',
  me_coroner_name: '',
  me_institution: '',
  me_address: '',
  me_city_state_zip: '',
  me_telephone: '',
  height_method: '',
  weight_method: '',
  consented_for_research: false,
  return_heart: false,
  histologic_slides_requested: false,
  form_completed_by: '',
  form_completed_date: '',
};

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

const HeartRequestForm = ({ donorId, donorInfo, readOnly = false }: Props) => {
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => { fetchData(); }, [donorId]);

  const fetchData = async () => {
    const { data } = await supabase
      .from('heart_request_forms')
      .select('*')
      .eq('donor_id', donorId)
      .maybeSingle();

    if (data) {
      setForm({
        id: data.id,
        request_type: (data as any).request_type || 'pathology',
        circumstances_of_death: (data as any).circumstances_of_death || '',
        me_coroner_name: (data as any).me_coroner_name || '',
        me_institution: (data as any).me_institution || '',
        me_address: (data as any).me_address || '',
        me_city_state_zip: (data as any).me_city_state_zip || '',
        me_telephone: (data as any).me_telephone || '',
        height_method: (data as any).height_method || '',
        weight_method: (data as any).weight_method || '',
        consented_for_research: (data as any).consented_for_research || false,
        return_heart: (data as any).return_heart || false,
        histologic_slides_requested: (data as any).histologic_slides_requested || false,
        form_completed_by: (data as any).form_completed_by || '',
        form_completed_date: (data as any).form_completed_date || '',
      });
      setExists(true);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        request_type: form.request_type,
        circumstances_of_death: form.circumstances_of_death || null,
        me_coroner_name: form.me_coroner_name || null,
        me_institution: form.me_institution || null,
        me_address: form.me_address || null,
        me_city_state_zip: form.me_city_state_zip || null,
        me_telephone: form.me_telephone || null,
        height_method: form.height_method || null,
        weight_method: form.weight_method || null,
        consented_for_research: form.consented_for_research,
        return_heart: form.return_heart,
        histologic_slides_requested: form.histologic_slides_requested,
        form_completed_by: form.form_completed_by || null,
        form_completed_date: form.form_completed_date || null,
      };

      if (exists && form.id) {
        const { error } = await supabase
          .from('heart_request_forms')
          .update(payload as any)
          .eq('id', form.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('heart_request_forms')
          .insert({ ...payload, donor_id: donorId } as any)
          .select('id')
          .single();
        if (error) throw error;
        setForm(prev => ({ ...prev, id: data.id }));
        setExists(true);
      }

      toast({ title: 'Saved', description: 'Heart Request Form saved successfully' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    generate7117fPdf(donorInfo || {}, form);
    logActivity('data_export', { export_type: '7117F PDF', donor_id: donorInfo?.din || undefined });
  };

  const update = (field: keyof FormData, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  if (loading) return null;

  const fullName = [donorInfo?.first_name, donorInfo?.last_name].filter(Boolean).join(' ') || '—';

  /* ─── READ-ONLY ─── */
  if (readOnly) {
    return (
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">7117F — Heart Request Form</p>
              {exists && (
                <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="h-8 text-[13px]">
                  <Download className="h-3.5 w-3.5 mr-1.5" />PDF
                </Button>
              )}
            </div>
          </CardHeader>
          {!exists ? (
            <CardContent>
              <p className="text-[13px] text-muted-foreground text-center py-4">No heart request form submitted yet.</p>
            </CardContent>
          ) : (
            <CardContent>
              <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Request Type" value={form.request_type === 'pathology' ? 'Pathology by LeMaitre' : 'Heart Return Only'} />
                <Field label="Decedent Name" value={fullName} />
                <Field label="Sex at Birth" value={donorInfo?.gender} />
                <Field label="Age" value={donorInfo?.donor_age} />
                <Field label="Height" value={donorInfo?.height_inches ? `${donorInfo.height_inches} in (${form.height_method})` : null} />
                <Field label="Weight" value={donorInfo?.weight_kgs ? `${donorInfo.weight_kgs} kg (${form.weight_method})` : null} />
                <Field label="Cause of Death" value={donorInfo?.cause_of_death} />
                <div className="md:col-span-2 lg:col-span-3">
                  <Field label="Circumstances of Death" value={form.circumstances_of_death} />
                </div>
                <Field label="ME/Coroner Name" value={form.me_coroner_name} />
                <Field label="Institution" value={form.me_institution} />
                <Field label="Telephone" value={form.me_telephone} />
                <div className="md:col-span-2 lg:col-span-3">
                  <Field label="Address" value={[form.me_address, form.me_city_state_zip].filter(Boolean).join(', ')} />
                </div>
                <Field label="Recovery Agency" value={donorInfo?.partner_name} />
                <Field label="Recovery Donor ID" value={donorInfo?.external_donor_id} />
                <Field label="Consented for Research" value={form.consented_for_research ? 'Yes' : 'No'} />
                <Field label="Return Heart" value={form.return_heart ? 'Yes' : 'No'} />
                <Field label="Histologic Slides" value={form.histologic_slides_requested ? 'Yes' : 'No'} />
                <Field label="Form Completed By" value={form.form_completed_by} />
                <Field label="Date" value={form.form_completed_date} />
                <Field label="LeMaitre DIN" value={donorInfo?.din} />
              </dl>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  /* ─── EDITABLE ─── */
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">7117F — Heart Request Form</p>
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
        <CardContent className="space-y-6">
          {/* Request Type */}
          <div className="space-y-2">
            <Label className="text-[13px] font-medium">Heart Request (indicate one)</Label>
            <RadioGroup value={form.request_type} onValueChange={v => update('request_type', v)} className="space-y-2">
              <div className="flex items-start gap-2">
                <RadioGroupItem value="pathology" id="pathology" className="mt-0.5" />
                <Label htmlFor="pathology" className="text-[13px] font-normal leading-tight">
                  Pathology Provided by LeMaitre — Report, with or without slides & tissue return
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="heart_return_only" id="heart_return_only" className="mt-0.5" />
                <Label htmlFor="heart_return_only" className="text-[13px] font-normal leading-tight">
                  NO Pathology, Heart Return Only
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Auto-populated donor fields (read-only display) */}
          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-3">Auto-populated from Donor Record</p>
              <dl className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Decedent Name" value={fullName} />
                <Field label="Sex at Birth" value={donorInfo?.gender} />
                <Field label="Age" value={donorInfo?.donor_age} />
                <Field label="Height" value={donorInfo?.height_inches ? `${donorInfo.height_inches} in` : null} />
                <Field label="Weight" value={donorInfo?.weight_kgs ? `${donorInfo.weight_kgs} kg` : null} />
                <Field label="Cause of Death" value={donorInfo?.cause_of_death} />
                <Field label="Recovery Agency" value={donorInfo?.partner_name} />
                <Field label="Recovery Donor ID" value={donorInfo?.external_donor_id} />
                <Field label="LeMaitre DIN" value={donorInfo?.din} />
              </dl>
            </CardContent>
          </Card>

          {/* Measurement methods */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[13px]">Height Measurement Method</Label>
              <Select value={form.height_method} onValueChange={v => update('height_method', v)}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="estimated">Estimated</SelectItem>
                  <SelectItem value="measured">Measured</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Weight Measurement Method</Label>
              <Select value={form.weight_method} onValueChange={v => update('weight_method', v)}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="estimated">Estimated</SelectItem>
                  <SelectItem value="measured">Measured</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Circumstances of death */}
          <div className="space-y-2">
            <Label className="text-[13px]">Circumstances of Death</Label>
            <Textarea
              value={form.circumstances_of_death}
              onChange={e => update('circumstances_of_death', e.target.value)}
              placeholder="Describe circumstances of death..."
              rows={3}
              className="text-[13px]"
            />
          </div>

          {/* ME/Coroner Section */}
          <div className="space-y-4">
            <p className="text-[13px] font-medium">Medical Examiner / Coroner</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[13px]">Name</Label>
                <Input className="h-9 text-[13px]" value={form.me_coroner_name} onChange={e => update('me_coroner_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Institution</Label>
                <Input className="h-9 text-[13px]" value={form.me_institution} onChange={e => update('me_institution', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Address</Label>
                <Input className="h-9 text-[13px]" value={form.me_address} onChange={e => update('me_address', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">City, State, ZIP</Label>
                <Input className="h-9 text-[13px]" value={form.me_city_state_zip} onChange={e => update('me_city_state_zip', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Telephone</Label>
                <Input className="h-9 text-[13px]" value={form.me_telephone} onChange={e => update('me_telephone', e.target.value)} placeholder="e.g. (847) 462-2191" />
              </div>
            </div>
          </div>

          {/* Consent & Requests */}
          <div className="space-y-4">
            <p className="text-[13px] font-medium">Consent & Requests</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <Label className="text-[13px]">Donor Consented for Research</Label>
                <Switch checked={form.consented_for_research} onCheckedChange={v => update('consented_for_research', v)} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <Label className="text-[13px]">Return Heart</Label>
                <Switch checked={form.return_heart} onCheckedChange={v => update('return_heart', v)} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <Label className="text-[13px]">Histologic Slides Requested</Label>
                <Switch checked={form.histologic_slides_requested} onCheckedChange={v => update('histologic_slides_requested', v)} />
              </div>
            </div>
          </div>

          {/* Form metadata */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[13px]">Form Completed By</Label>
              <Input className="h-9 text-[13px]" value={form.form_completed_by} onChange={e => update('form_completed_by', e.target.value)} placeholder="Name" />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Date</Label>
              <Input type="date" className="h-9 text-[13px]" value={form.form_completed_date} onChange={e => update('form_completed_date', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="h-9 text-[13px]">
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? 'Saving...' : 'Save Heart Request Form'}
        </Button>
      </div>
    </div>
  );
};

export default HeartRequestForm;
