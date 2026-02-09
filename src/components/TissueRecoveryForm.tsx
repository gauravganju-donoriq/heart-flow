import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, Plus, Trash2, Save, Download } from 'lucide-react';
import { generate7033fPdf } from '@/lib/generate7033fPdf';

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
}

interface Props {
  donorId: string;
  donorInfo?: DonorInfo;
  readOnly?: boolean;
}

const TissueRecoveryForm = ({ donorId, donorInfo, readOnly = false }: Props) => {
  const { toast } = useToast();
  const [recovery, setRecovery] = useState<RecoveryData>(emptyRecovery);
  const [tissues, setTissues] = useState<TissueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    fetchData();
  }, [donorId]);

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
    }
    setLoading(false);
  };

  const addTissueRow = (category: 'vascular' | 'cardiac') => {
    setTissues(prev => [...prev, {
      tissue_category: category,
      tissue_type: '',
      timestamp_value: '',
      recovery_technician: '',
    }]);
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

      // Delete existing tissues and re-insert
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
  };

  if (loading) return null;

  const vascularTissues = tissues.filter(t => t.tissue_category === 'vascular');
  const cardiacTissues = tissues.filter(t => t.tissue_category === 'cardiac');

  // Read-only display mode
  if (readOnly) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <CardTitle>7033F — Tissue Recovery Form</CardTitle>
              </div>
              <CardDescription>LeMaitre Cardiovascular recovery details</CardDescription>
            </div>
            {exists && (
              <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4 mr-1" />Download PDF
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!exists ? (
            <p className="text-sm text-muted-foreground">No tissue recovery form has been submitted yet.</p>
          ) : (
            <>
              {/* Vascular tissues */}
              {vascularTissues.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Vascular Tissues</h4>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">Tissue Type</th>
                          <th className="text-left p-2">Wet Ice Date/Time</th>
                          <th className="text-left p-2">Recovery Technician</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vascularTissues.map((t, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{t.tissue_type}</td>
                            <td className="p-2">{t.timestamp_value ? new Date(t.timestamp_value).toLocaleString() : '—'}</td>
                            <td className="p-2">{t.recovery_technician || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Cardiac tissues */}
              {cardiacTissues.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Cardiac Tissues</h4>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">Tissue Type</th>
                          <th className="text-left p-2">Cold Solution Date/Time</th>
                          <th className="text-left p-2">Recovery Technician</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cardiacTissues.map((t, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{t.tissue_type}</td>
                            <td className="p-2">{t.timestamp_value ? new Date(t.timestamp_value).toLocaleString() : '—'}</td>
                            <td className="p-2">{t.recovery_technician || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <dl className="grid gap-4 md:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Consent/Authorization Delivery</dt>
                  <dd className="font-medium">{recovery.consent_delivery_method || '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Packaging Deviation</dt>
                  <dd className="font-medium">{recovery.packaging_deviation ? 'Yes' : 'No'}</dd>
                </div>
                {recovery.packaging_deviation && (
                  <div className="md:col-span-2">
                    <dt className="text-sm text-muted-foreground">Packaging Notes</dt>
                    <dd className="font-medium whitespace-pre-wrap">{recovery.packaging_notes || '—'}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground">Heart Request Needed</dt>
                  <dd className="font-medium">{recovery.heart_request_needed ? 'Yes' : 'No'}</dd>
                </div>
                {recovery.heart_request_needed && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Heart Request Form 7117F Completed</dt>
                    <dd className="font-medium">{recovery.heart_request_form_completed ? 'Yes' : 'No'}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground">Form Completed By</dt>
                  <dd className="font-medium">{recovery.form_completed_by || '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">LeMaitre Donor #</dt>
                  <dd className="font-medium">{recovery.lemaitre_donor_number || '—'}</dd>
                </div>
              </dl>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Editable form mode
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>7033F — Tissue Recovery Form</CardTitle>
              <CardDescription>LeMaitre Cardiovascular — complete after tissue recovery</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {exists && (
              <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4 mr-1" />PDF
              </Button>
            )}
            {exists && <Badge variant="outline" className="text-green-700 border-green-300">Saved</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Vascular Tissue Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Vascular Tissues — Wet Ice</h4>
            <Button type="button" variant="outline" size="sm" onClick={() => addTissueRow('vascular')}>
              <Plus className="h-3 w-3 mr-1" />Add Row
            </Button>
          </div>
          {tissues.map((t, i) => t.tissue_category === 'vascular' && (
            <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3 bg-muted/30">
              <div className="col-span-4">
                <Label className="text-xs">Tissue Type</Label>
                <Select value={t.tissue_type} onValueChange={v => updateTissueRow(i, 'tissue_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {VASCULAR_TISSUE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4">
                <Label className="text-xs">Wet Ice Date/Time</Label>
                <Input type="datetime-local" value={t.timestamp_value} onChange={e => updateTissueRow(i, 'timestamp_value', e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Recovery Technician</Label>
                <Input value={t.recovery_technician} onChange={e => updateTissueRow(i, 'recovery_technician', e.target.value)} placeholder="Name" />
              </div>
              <div className="col-span-1 flex justify-center">
                <Button type="button" variant="ghost" size="icon" onClick={() => removeTissueRow(i)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {vascularTissues.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No vascular tissues added yet.</p>
          )}
        </div>

        {/* Cardiac Tissue Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Cardiac Tissues — Cold Solution</h4>
            <Button type="button" variant="outline" size="sm" onClick={() => addTissueRow('cardiac')}>
              <Plus className="h-3 w-3 mr-1" />Add Row
            </Button>
          </div>
          {tissues.map((t, i) => t.tissue_category === 'cardiac' && (
            <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3 bg-muted/30">
              <div className="col-span-4">
                <Label className="text-xs">Tissue Type</Label>
                <Select value={t.tissue_type} onValueChange={v => updateTissueRow(i, 'tissue_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {CARDIAC_TISSUE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4">
                <Label className="text-xs">Cold Solution Date/Time</Label>
                <Input type="datetime-local" value={t.timestamp_value} onChange={e => updateTissueRow(i, 'timestamp_value', e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Recovery Technician</Label>
                <Input value={t.recovery_technician} onChange={e => updateTissueRow(i, 'recovery_technician', e.target.value)} placeholder="Name" />
              </div>
              <div className="col-span-1 flex justify-center">
                <Button type="button" variant="ghost" size="icon" onClick={() => removeTissueRow(i)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {cardiacTissues.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No cardiac tissues added yet.</p>
          )}
        </div>

        {/* Consent Delivery */}
        <div className="space-y-3">
          <h4 className="font-semibold">Donor Consent/Authorization</h4>
          <div className="max-w-sm">
            <Label>Delivery Method</Label>
            <Select value={recovery.consent_delivery_method} onValueChange={v => setRecovery(p => ({ ...p, consent_delivery_method: v }))}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="portal">Uploaded in LeMaitre Partner Portal</SelectItem>
                <SelectItem value="in_shipper">In tissue shipper</SelectItem>
                <SelectItem value="emailed">Emailed to TissueIn@lemaitre.com</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Packaging */}
        <div className="space-y-3">
          <h4 className="font-semibold">Packaging & Shipping</h4>
          <div className="flex items-center gap-3">
            <Switch checked={recovery.packaging_deviation} onCheckedChange={v => setRecovery(p => ({ ...p, packaging_deviation: v }))} />
            <Label>Any notes or deviations about packaging or shipping?</Label>
          </div>
          {recovery.packaging_deviation && (
            <Textarea
              placeholder="Explain deviations..."
              value={recovery.packaging_notes}
              onChange={e => setRecovery(p => ({ ...p, packaging_notes: e.target.value }))}
              rows={3}
            />
          )}
        </div>

        {/* Heart Request */}
        <div className="space-y-3">
          <h4 className="font-semibold">Heart Valve Donors</h4>
          <div className="flex items-center gap-3">
            <Switch checked={recovery.heart_request_needed} onCheckedChange={v => setRecovery(p => ({ ...p, heart_request_needed: v }))} />
            <Label>Any heart requests on this donor? (report, slides, and/or return tissue)</Label>
          </div>
          {recovery.heart_request_needed && (
            <div className="flex items-center gap-3 pl-6">
              <Switch checked={recovery.heart_request_form_completed} onCheckedChange={v => setRecovery(p => ({ ...p, heart_request_form_completed: v }))} />
              <Label>Heart Request Form 7117F completed</Label>
            </div>
          )}
        </div>

        {/* Form Completed By & LeMaitre Donor # */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Form Completed By</Label>
            <Input
              value={recovery.form_completed_by}
              onChange={e => setRecovery(p => ({ ...p, form_completed_by: e.target.value }))}
              placeholder="Name of person completing form"
            />
          </div>
          <div>
            <Label>LeMaitre Donor #</Label>
            <Input
              value={recovery.lemaitre_donor_number}
              onChange={e => setRecovery(p => ({ ...p, lemaitre_donor_number: e.target.value }))}
              placeholder="Assigned by LeMaitre"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Recovery Form'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TissueRecoveryForm;
