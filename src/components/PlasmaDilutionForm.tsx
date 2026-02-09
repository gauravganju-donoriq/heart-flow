import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save, CheckCircle, XCircle } from 'lucide-react';

interface FluidRow {
  name: string;
  amount: number | '';
}

interface WorksheetData {
  id?: string;
  sample_type: string;
  sample_datetime: string;
  death_type: string;
  blood_products: FluidRow[];
  colloids: FluidRow[];
  crystalloids: FluidRow[];
  bsa_value: number | '';
  reviewed_by: string;
  reviewed_at: string;
}

interface DonorInfo {
  din?: string | null;
  external_donor_id?: string | null;
  weight_kgs?: number | null;
  gender?: string | null;
  death_date?: string | null;
  time_of_death?: string | null;
  death_type?: string | null;
}

interface Props {
  donorId: string;
  donorInfo?: DonorInfo;
}

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <dt className="text-[13px] text-muted-foreground">{label}</dt>
    <dd className="text-[13px]">{value || '—'}</dd>
  </div>
);

const emptyWorksheet: WorksheetData = {
  sample_type: '',
  sample_datetime: '',
  death_type: '',
  blood_products: [],
  colloids: [],
  crystalloids: [],
  bsa_value: '',
  reviewed_by: '',
  reviewed_at: '',
};

const sumAmounts = (rows: FluidRow[]): number =>
  rows.reduce((sum, r) => sum + (typeof r.amount === 'number' ? r.amount : 0), 0);

const PlasmaDilutionForm = ({ donorId, donorInfo }: Props) => {
  const { toast } = useToast();
  const [ws, setWs] = useState<WorksheetData>(emptyWorksheet);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  const weight = donorInfo?.weight_kgs ?? null;
  const gender = donorInfo?.gender?.toLowerCase() ?? '';
  const needsBsa = weight !== null && (weight < 45 || weight > 100);

  useEffect(() => { fetchData(); }, [donorId]);

  const fetchData = async () => {
    const { data } = await supabase
      .from('plasma_dilution_worksheets' as any)
      .select('*')
      .eq('donor_id', donorId)
      .maybeSingle();

    if (data) {
      const d = data as any;
      setWs({
        id: d.id,
        sample_type: d.sample_type || '',
        sample_datetime: d.sample_datetime ? new Date(d.sample_datetime).toISOString().slice(0, 16) : '',
        death_type: d.death_type || '',
        blood_products: Array.isArray(d.blood_products) ? d.blood_products : [],
        colloids: Array.isArray(d.colloids) ? d.colloids : [],
        crystalloids: Array.isArray(d.crystalloids) ? d.crystalloids : [],
        bsa_value: d.bsa_value ?? '',
        reviewed_by: d.reviewed_by || '',
        reviewed_at: d.reviewed_at ? new Date(d.reviewed_at).toISOString().slice(0, 10) : '',
      });
      setExists(true);
    }
    setLoading(false);
  };

  // Auto-calculations
  const calcs = useMemo(() => {
    if (weight === null) return null;

    let bv: number, pv: number;
    if (weight >= 45 && weight <= 100) {
      bv = weight / 0.015;
      pv = weight / 0.025;
    } else {
      const bsa = typeof ws.bsa_value === 'number' ? ws.bsa_value : 0;
      if (!bsa) return null;
      if (gender.startsWith('m')) {
        bv = bsa * 2740;
        pv = bsa * 1560;
      } else {
        bv = bsa * 2370;
        pv = bsa * 1410;
      }
    }

    const bloodTotal = sumAmounts(ws.blood_products);
    const colloidTotal = sumAmounts(ws.colloids);
    const crystTotal = sumAmounts(ws.crystalloids);

    const check1 = (colloidTotal + crystTotal) > pv;
    const check2 = (bloodTotal + colloidTotal + crystTotal) > bv;
    const acceptable = !check1 && !check2;

    return { bv: Math.round(bv), pv: Math.round(pv), bloodTotal, colloidTotal, crystTotal, check1, check2, acceptable };
  }, [weight, gender, ws.bsa_value, ws.blood_products, ws.colloids, ws.crystalloids]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        donor_id: donorId,
        sample_type: ws.sample_type || null,
        sample_datetime: ws.sample_datetime ? new Date(ws.sample_datetime).toISOString() : null,
        death_type: ws.death_type || null,
        blood_products: ws.blood_products,
        colloids: ws.colloids,
        crystalloids: ws.crystalloids,
        bsa_value: typeof ws.bsa_value === 'number' ? ws.bsa_value : null,
        blood_volume: calcs?.bv ?? null,
        plasma_volume: calcs?.pv ?? null,
        is_sample_acceptable: calcs?.acceptable ?? null,
        reviewed_by: ws.reviewed_by || null,
        reviewed_at: ws.reviewed_at ? new Date(ws.reviewed_at).toISOString() : null,
      };

      if (exists && ws.id) {
        const { error } = await supabase
          .from('plasma_dilution_worksheets' as any)
          .update(payload)
          .eq('id', ws.id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase
          .from('plasma_dilution_worksheets' as any)
          .insert(payload)
          .select('id')
          .single() as any);
        if (error) throw error;
        setWs(prev => ({ ...prev, id: data.id }));
        setExists(true);
      }
      toast({ title: 'Saved', description: 'Plasma dilution worksheet saved successfully' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const addRow = (field: 'blood_products' | 'colloids' | 'crystalloids') => {
    setWs(prev => ({ ...prev, [field]: [...prev[field], { name: '', amount: '' }] }));
  };

  const removeRow = (field: 'blood_products' | 'colloids' | 'crystalloids', index: number) => {
    setWs(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const updateRow = (field: 'blood_products' | 'colloids' | 'crystalloids', index: number, key: 'name' | 'amount', value: string) => {
    setWs(prev => ({
      ...prev,
      [field]: prev[field].map((row, i) =>
        i === index ? { ...row, [key]: key === 'amount' ? (value === '' ? '' : Number(value)) : value } : row
      ),
    }));
  };

  if (loading) return null;

  const FluidSection = ({
    title,
    subtitle,
    field,
    rows,
    total,
  }: {
    title: string;
    subtitle: string;
    field: 'blood_products' | 'colloids' | 'crystalloids';
    rows: FluidRow[];
    total: number;
  }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => addRow(field)} className="h-8 text-[13px]">
            <Plus className="h-3 w-3 mr-1" />Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end border border-border rounded-lg p-3 bg-muted/30">
            <div className="col-span-7">
              <Label className="text-xs text-muted-foreground">Product/Fluid Name</Label>
              <Input className="h-9 text-[13px]" value={row.name} onChange={e => updateRow(field, i, 'name', e.target.value)} placeholder="e.g. Packed RBCs" />
            </div>
            <div className="col-span-4">
              <Label className="text-xs text-muted-foreground">Amount (mL)</Label>
              <Input type="number" className="h-9 text-[13px]" value={row.amount} onChange={e => updateRow(field, i, 'amount', e.target.value)} placeholder="0" />
            </div>
            <div className="col-span-1 flex justify-center">
              <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(field, i)} className="text-destructive h-9 w-9">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-[13px] text-muted-foreground">None recorded.</p>}
        {rows.length > 0 && (
          <div className="text-right text-[13px] font-medium pt-1">Total: {total.toLocaleString()} mL</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">7059F — Plasma Dilution of Donor Worksheet</p>
            <div className="flex items-center gap-2">
              {exists && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">Saved</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="LeMaitre Donor # (DIN)" value={donorInfo?.din} />
            <Field label="Recovery Agency Donor #" value={donorInfo?.external_donor_id} />
            <Field label="Donor Weight (kg)" value={weight} />
            <Field label="Sex at Birth" value={donorInfo?.gender} />
          </dl>
        </CardContent>
      </Card>

      {/* Sample & Death Info */}
      <Card>
        <CardHeader><p className="text-sm font-medium">Sample Information</p></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">Sample Type</Label>
              <Select value={ws.sample_type} onValueChange={v => setWs(p => ({ ...p, sample_type: v }))}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="post_mortem">Post Mortem</SelectItem>
                  <SelectItem value="pre_mortem">Pre Mortem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{ws.sample_type === 'pre_mortem' ? 'Date/Time of Collection' : 'Date/Time of Death'}</Label>
              <Input type="datetime-local" className="h-9 text-[13px]" value={ws.sample_datetime} onChange={e => setWs(p => ({ ...p, sample_datetime: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Death Type</Label>
              <Select value={ws.death_type} onValueChange={v => setWs(p => ({ ...p, death_type: v }))}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asystole">Asystole</SelectItem>
                  <SelectItem value="ltka">LTKA</SelectItem>
                  <SelectItem value="cct">CCT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fluid Sections */}
      <FluidSection title="A. Blood Products" subtitle="Transfused in the 48 hours before death" field="blood_products" rows={ws.blood_products} total={calcs?.bloodTotal ?? sumAmounts(ws.blood_products)} />
      <FluidSection title="B. Colloids" subtitle="Infused in the 48 hours before death" field="colloids" rows={ws.colloids} total={calcs?.colloidTotal ?? sumAmounts(ws.colloids)} />
      <FluidSection title="C. Crystalloids" subtitle="Infused in the 1 hour before death" field="crystalloids" rows={ws.crystalloids} total={calcs?.crystTotal ?? sumAmounts(ws.crystalloids)} />

      {/* BSA (if needed) */}
      {needsBsa && (
        <Card>
          <CardHeader><p className="text-sm font-medium">Body Surface Area (BSA)</p></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Donor weight is outside 45–100 kg range. BSA is required for volume calculations.</p>
            <div className="max-w-xs">
              <Label className="text-xs text-muted-foreground">BSA Value (m²)</Label>
              <Input type="number" step="0.01" className="h-9 text-[13px]" value={ws.bsa_value} onChange={e => setWs(p => ({ ...p, bsa_value: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="e.g. 1.73" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculations & Result */}
      <Card>
        <CardHeader><p className="text-sm font-medium">Volume Calculations & Dilution Check</p></CardHeader>
        <CardContent>
          {!calcs ? (
            <p className="text-[13px] text-muted-foreground">
              {weight === null ? 'Donor weight is required for calculations.' : 'Enter BSA value to calculate volumes.'}
            </p>
          ) : (
            <div className="space-y-4">
              <dl className="grid gap-4 md:grid-cols-2">
                <Field label="Blood Volume (BV)" value={`${calcs.bv.toLocaleString()} mL`} />
                <Field label="Plasma Volume (PV)" value={`${calcs.pv.toLocaleString()} mL`} />
              </dl>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs uppercase tracking-wider text-muted-foreground/70 px-4 py-2.5">Check</th>
                      <th className="text-left text-xs uppercase tracking-wider text-muted-foreground/70 px-4 py-2.5">Calculation</th>
                      <th className="text-left text-xs uppercase tracking-wider text-muted-foreground/70 px-4 py-2.5">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="text-[13px] px-4 py-3">B + C &gt; PV?</td>
                      <td className="text-[13px] px-4 py-3">{(calcs.colloidTotal + calcs.crystTotal).toLocaleString()} vs {calcs.pv.toLocaleString()}</td>
                      <td className="text-[13px] px-4 py-3 font-medium">{calcs.check1 ? <span className="text-destructive">YES</span> : <span className="text-emerald-600">NO</span>}</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="text-[13px] px-4 py-3">A + B + C &gt; BV?</td>
                      <td className="text-[13px] px-4 py-3">{(calcs.bloodTotal + calcs.colloidTotal + calcs.crystTotal).toLocaleString()} vs {calcs.bv.toLocaleString()}</td>
                      <td className="text-[13px] px-4 py-3 font-medium">{calcs.check2 ? <span className="text-destructive">YES</span> : <span className="text-emerald-600">NO</span>}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className={`flex items-center gap-3 p-4 rounded-lg border ${calcs.acceptable ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                {calcs.acceptable ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-destructive" />}
                <div>
                  <p className={`text-sm font-semibold ${calcs.acceptable ? 'text-emerald-700' : 'text-red-700'}`}>
                    {calcs.acceptable ? 'Sample Acceptable' : 'Sample Not Acceptable'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {calcs.acceptable ? 'Fluid volumes do not exceed calculated thresholds.' : 'One or more fluid checks exceeded the threshold.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review */}
      <Card>
        <CardHeader><p className="text-sm font-medium">Review</p></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 max-w-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Reviewed By</Label>
              <Input className="h-9 text-[13px]" value={ws.reviewed_by} onChange={e => setWs(p => ({ ...p, reviewed_by: e.target.value }))} placeholder="Name" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Date Reviewed</Label>
              <Input type="date" className="h-9 text-[13px]" value={ws.reviewed_at} onChange={e => setWs(p => ({ ...p, reviewed_at: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="h-9 text-[13px]">
          <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Worksheet'}
        </Button>
      </div>
    </div>
  );
};

export default PlasmaDilutionForm;
