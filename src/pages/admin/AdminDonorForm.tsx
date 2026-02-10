import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { triggerAutoScreening } from '@/lib/autoScreen';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import DocumentUpload from '@/components/DocumentUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Send, FileText } from 'lucide-react';
import { adminNavItems } from '@/lib/navItems';

interface Partner {
  id: string;
  organization_name: string;
}

const AdminDonorForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');

  const [formData, setFormData] = useState({
    // Call info (Q1, Q2, Q24)
    call_type: '',
    caller_name: '',
    is_prescreen_update: false,
    // Demographics (Q4, Q5, legacy)
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    blood_type: '',
    donor_age: '',
    height_inches: '',
    weight_kgs: '',
    // Death details (Q6-Q10)
    cause_of_death: '',
    death_date: '',
    time_of_death: '',
    death_type: '',
    death_timezone: '',
    // Clinical (Q11, Q14, Q15)
    clinical_course: '',
    medical_history: '',
    high_risk_notes: '',
    // Tissue recovery (Q16-Q22)
    donor_accepted: '',
    hv_heart_valves: false,
    hv_pathology_request: '',
    ai_aorto_iliac: false,
    fm_femoral: false,
    sv_saphenous_vein: false,
    has_autopsy: false,
    // Legacy tissue fields
    tissue_type: '',
    tissue_condition: '',
    // Logistics (Q23, Q25)
    external_donor_id: '',
    courier_update: '',
    // Compliance
    consent_obtained: false,
    medical_history_reviewed: false,
  });

  const isEdit = !!id;

  useEffect(() => {
    fetchPartners();
    if (id) fetchDonor();
  }, [id]);

  const fetchPartners = async () => {
    const { data } = await supabase
      .from('partners')
      .select('id, organization_name')
      .eq('is_active', true)
      .order('organization_name');
    if (data) setPartners(data);
  };

  const fetchDonor = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('donors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load donor data' });
      navigate('/admin/donors');
      return;
    }

    setSelectedPartnerId(data.partner_id || '');
    setFormData({
      call_type: (data as any).call_type || '',
      caller_name: (data as any).caller_name || '',
      is_prescreen_update: (data as any).is_prescreen_update || false,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      date_of_birth: data.date_of_birth || '',
      gender: data.gender || '',
      blood_type: data.blood_type || '',
      donor_age: (data as any).donor_age?.toString() || '',
      height_inches: (data as any).height_inches?.toString() || '',
      weight_kgs: (data as any).weight_kgs?.toString() || '',
      cause_of_death: data.cause_of_death || '',
      death_date: data.death_date ? data.death_date.split('T')[0] : '',
      time_of_death: (data as any).time_of_death || '',
      death_type: (data as any).death_type || '',
      death_timezone: (data as any).death_timezone || '',
      clinical_course: (data as any).clinical_course || '',
      medical_history: (data as any).medical_history || '',
      high_risk_notes: (data as any).high_risk_notes || '',
      donor_accepted: (data as any).donor_accepted || '',
      hv_heart_valves: (data as any).hv_heart_valves || false,
      hv_pathology_request: (data as any).hv_pathology_request || '',
      ai_aorto_iliac: (data as any).ai_aorto_iliac || false,
      fm_femoral: (data as any).fm_femoral || false,
      sv_saphenous_vein: (data as any).sv_saphenous_vein || false,
      has_autopsy: (data as any).has_autopsy || false,
      tissue_type: data.tissue_type || '',
      tissue_condition: data.tissue_condition || '',
      external_donor_id: (data as any).external_donor_id || '',
      courier_update: (data as any).courier_update || '',
      consent_obtained: data.consent_obtained || false,
      medical_history_reviewed: data.medical_history_reviewed || false,
    });
    setLoading(false);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field when user changes it
    if (validationErrors[field]) {
      setValidationErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForSubmission = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.donor_age) errors.donor_age = 'Age is required';
    if (!formData.gender) errors.gender = 'Sex at birth is required';
    if (!formData.death_date) errors.death_date = 'Date of death is required';
    if (!formData.cause_of_death.trim()) errors.cause_of_death = 'Cause of death is required';
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill in all required fields before submitting.' });
      return false;
    }
    return true;
  };

  const handleSave = async (submit = false) => {
    if (submit && !validateForSubmission()) return;
    const partnerId = selectedPartnerId && selectedPartnerId !== 'none' ? selectedPartnerId : null;
    setSaving(true);

    const donorData: Record<string, any> = {
      partner_id: partnerId,
      status: submit ? 'submitted' : 'draft',
      submitted_at: submit ? new Date().toISOString() : null,
      // Call info
      call_type: formData.call_type || null,
      caller_name: formData.caller_name || null,
      is_prescreen_update: formData.is_prescreen_update,
      // Demographics
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || null,
      blood_type: formData.blood_type || null,
      donor_age: formData.donor_age ? parseInt(formData.donor_age) : null,
      height_inches: formData.height_inches ? parseFloat(formData.height_inches) : null,
      weight_kgs: formData.weight_kgs ? parseFloat(formData.weight_kgs) : null,
      // Death details
      cause_of_death: formData.cause_of_death || null,
      death_date: formData.death_date ? new Date(formData.death_date).toISOString() : null,
      time_of_death: formData.time_of_death || null,
      death_type: formData.death_type || null,
      death_timezone: formData.death_timezone || null,
      // Clinical
      clinical_course: formData.clinical_course || null,
      medical_history: formData.medical_history || null,
      high_risk_notes: formData.high_risk_notes || null,
      // Tissue recovery
      donor_accepted: formData.donor_accepted || null,
      hv_heart_valves: formData.hv_heart_valves,
      hv_pathology_request: formData.hv_pathology_request || null,
      ai_aorto_iliac: formData.ai_aorto_iliac,
      fm_femoral: formData.fm_femoral,
      sv_saphenous_vein: formData.sv_saphenous_vein,
      has_autopsy: formData.has_autopsy,
      tissue_type: formData.tissue_type || null,
      tissue_condition: formData.tissue_condition || null,
      // Logistics
      external_donor_id: formData.external_donor_id || null,
      courier_update: formData.courier_update || null,
      // Compliance
      consent_obtained: formData.consent_obtained,
      medical_history_reviewed: formData.medical_history_reviewed,
    };

    let result;
    if (isEdit) {
      result = await supabase.from('donors').update(donorData).eq('id', id).select().single();
    } else {
      result = await supabase.from('donors').insert(donorData).select().single();
    }

    if (result.error) {
      setSaving(false);
      toast({ variant: 'destructive', title: 'Error', description: result.error.message });
      return;
    }

    // Audit logging
    if (user) {
      if (isEdit) {
        await (supabase.from as any)('audit_logs').insert({
          donor_id: id!,
          action: submit ? 'status_change' : 'edit_direct',
          changed_by: user.id,
          changed_fields: null,
          metadata: { source: 'admin_manual' },
        });
      } else if (result.data) {
        await (supabase.from as any)('audit_logs').insert({
          donor_id: result.data.id,
          action: 'created',
          changed_by: user.id,
          changed_fields: null,
          metadata: { source: 'admin_manual' },
        });
      }
    }

    setSaving(false);

    toast({
      title: submit ? 'Donor Submitted' : 'Donor Saved',
      description: submit ? 'Donor has been submitted for review' : 'Donor has been saved as a draft',
    });

    if (submit && result.data?.id) {
      triggerAutoScreening(result.data.id);
    }

    if (!isEdit) {
      navigate(`/admin/donors/${result.data.id}/edit`, { replace: true });
    }
  };

  if (loading) {
    return (
      <DashboardLayout navItems={adminNavItems} title="Atlas">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={adminNavItems} title="Atlas">
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/donors')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-lg font-semibold">{isEdit ? 'Edit Donor' : 'New Donor'}</p>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-0 mb-5">
            <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px] px-4 py-2.5">Donor Information</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px] px-4 py-2.5">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            {/* Partner Selector */}
            <Card>
              <CardHeader>
                <p className="text-sm font-medium">Partner Assignment</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-w-sm">
                  <Label htmlFor="partner">Partner Organization (Q3)</Label>
                  <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId} disabled={isEdit}>
                    <SelectTrigger><SelectValue placeholder="Select a partner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Direct Admin Entry)</SelectItem>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.organization_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Call Information (Q1, Q2, Q24) */}
            <Card>
              <CardHeader>
                <p className="text-sm font-medium">Call Information</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="call_type">Type of Call (Q1)</Label>
                    <Select value={formData.call_type} onValueChange={(v) => handleChange('call_type', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="initial_screening">Initial Screening</SelectItem>
                        <SelectItem value="prescreen_update">Prescreen Update</SelectItem>
                        <SelectItem value="courier_update">Courier Update</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caller_name">Caller's Name (Q2)</Label>
                    <Input id="caller_name" value={formData.caller_name} onChange={(e) => handleChange('caller_name', e.target.value)} placeholder="Name of person calling" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="is_prescreen_update" checked={formData.is_prescreen_update} onCheckedChange={(checked) => handleChange('is_prescreen_update', checked)} />
                  <Label htmlFor="is_prescreen_update">Prescreen / Update on pre-existing donor (Q24)</Label>
                </div>
              </CardContent>
            </Card>

            {/* Demographics (Q4, Q5, Q12, Q13 + legacy) */}
            <Card>
              <CardHeader>
                <p className="text-sm font-medium">Demographics</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="donor_age" className={validationErrors.donor_age ? 'text-destructive' : ''}>Age (Q4) *</Label>
                    <Input id="donor_age" type="number" value={formData.donor_age} onChange={(e) => handleChange('donor_age', e.target.value)} className={validationErrors.donor_age ? 'border-destructive' : ''} />
                    {validationErrors.donor_age && <p className="text-sm text-destructive">{validationErrors.donor_age}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className={validationErrors.gender ? 'text-destructive' : ''}>Sex at Birth (Q5) *</Label>
                    <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                      <SelectTrigger className={validationErrors.gender ? 'border-destructive' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    {validationErrors.gender && <p className="text-sm text-destructive">{validationErrors.gender}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height_inches">Height — Inches (Q12)</Label>
                    <Input id="height_inches" type="number" step="0.1" value={formData.height_inches} onChange={(e) => handleChange('height_inches', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight_kgs">Weight — Kgs (Q13)</Label>
                    <Input id="weight_kgs" type="number" step="0.1" value={formData.weight_kgs} onChange={(e) => handleChange('weight_kgs', e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blood_type">Blood Type</Label>
                    <Select value={formData.blood_type} onValueChange={(v) => handleChange('blood_type', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Death Details (Q6-Q10) */}
            <Card>
              <CardHeader>
                <p className="text-sm font-medium">Death Details</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="death_date" className={validationErrors.death_date ? 'text-destructive' : ''}>Date of Death (Q6) *</Label>
                    <Input id="death_date" type="date" value={formData.death_date} onChange={(e) => handleChange('death_date', e.target.value)} className={validationErrors.death_date ? 'border-destructive' : ''} />
                    {validationErrors.death_date && <p className="text-sm text-destructive">{validationErrors.death_date}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time_of_death">Time of Death (Q7)</Label>
                    <Input id="time_of_death" type="time" value={formData.time_of_death} onChange={(e) => handleChange('time_of_death', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="death_timezone">Time Zone (Q9)</Label>
                    <Select value={formData.death_timezone} onValueChange={(v) => handleChange('death_timezone', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EST">EST</SelectItem>
                        <SelectItem value="CST">CST</SelectItem>
                        <SelectItem value="MST">MST</SelectItem>
                        <SelectItem value="PST">PST</SelectItem>
                        <SelectItem value="AKST">AKST</SelectItem>
                        <SelectItem value="HST">HST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="death_type">Type of Death (Q8)</Label>
                    <Select value={formData.death_type} onValueChange={(v) => handleChange('death_type', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cardiac">Cardiac Death</SelectItem>
                        <SelectItem value="brain_death">Brain Death</SelectItem>
                        <SelectItem value="dcd">DCD</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cause_of_death" className={validationErrors.cause_of_death ? 'text-destructive' : ''}>Cause of Death (Q10) *</Label>
                    <Input id="cause_of_death" value={formData.cause_of_death} onChange={(e) => handleChange('cause_of_death', e.target.value)} className={validationErrors.cause_of_death ? 'border-destructive' : ''} />
                    {validationErrors.cause_of_death && <p className="text-sm text-destructive">{validationErrors.cause_of_death}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clinical (Q11, Q14, Q15) */}
            <Card>
              <CardHeader>
                <p className="text-sm font-medium">Clinical Information</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clinical_course">Clinical Course (Q11)</Label>
                  <Textarea id="clinical_course" rows={3} value={formData.clinical_course} onChange={(e) => handleChange('clinical_course', e.target.value)} placeholder="Describe the clinical course..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medical_history">Medical History (Q14)</Label>
                  <Textarea id="medical_history" rows={3} value={formData.medical_history} onChange={(e) => handleChange('medical_history', e.target.value)} placeholder="Relevant medical history..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="high_risk_notes">High Risk / Additional Notes (Q15)</Label>
                  <Textarea id="high_risk_notes" rows={3} value={formData.high_risk_notes} onChange={(e) => handleChange('high_risk_notes', e.target.value)} placeholder="High-risk factors or additional notes..." />
                </div>
              </CardContent>
            </Card>

            {/* Tissue Recovery (Q16-Q22) */}
            <Card>
              <CardHeader>
                <p className="text-sm font-medium">Tissue Recovery</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-sm">
                  <Label htmlFor="donor_accepted">Donor Accepted / Deferred (Q16)</Label>
                  <Select value={formData.donor_accepted} onValueChange={(v) => handleChange('donor_accepted', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="deferred">Deferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.donor_accepted === 'accepted' && (
                  <div className="space-y-4 border-l-2 border-primary/20 pl-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="hv_heart_valves" checked={formData.hv_heart_valves} onCheckedChange={(c) => handleChange('hv_heart_valves', c)} />
                      <Label htmlFor="hv_heart_valves">HV — Heart Valves (Q17)</Label>
                    </div>
                    {formData.hv_heart_valves && (
                      <div className="space-y-2 ml-6">
                        <Label htmlFor="hv_pathology_request">Heart Valve Pathology Request (Q18)</Label>
                        <Input id="hv_pathology_request" value={formData.hv_pathology_request} onChange={(e) => handleChange('hv_pathology_request', e.target.value)} placeholder="Pathology request details..." />
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Switch id="ai_aorto_iliac" checked={formData.ai_aorto_iliac} onCheckedChange={(c) => handleChange('ai_aorto_iliac', c)} />
                      <Label htmlFor="ai_aorto_iliac">AI — Aorto Iliac (Q19)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="fm_femoral" checked={formData.fm_femoral} onCheckedChange={(c) => handleChange('fm_femoral', c)} />
                      <Label htmlFor="fm_femoral">FM — Femoral En Bloc (Q20)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="sv_saphenous_vein" checked={formData.sv_saphenous_vein} onCheckedChange={(c) => handleChange('sv_saphenous_vein', c)} />
                      <Label htmlFor="sv_saphenous_vein">SV — Saphenous Vein (Q21)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="has_autopsy" checked={formData.has_autopsy} onCheckedChange={(c) => handleChange('has_autopsy', c)} />
                      <Label htmlFor="has_autopsy">Autopsy? (Q22)</Label>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tissue_type">Tissue Type (legacy)</Label>
                    <Select value={formData.tissue_type} onValueChange={(v) => handleChange('tissue_type', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vascular">Vascular</SelectItem>
                        <SelectItem value="cardiac">Cardiac</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tissue_condition">Tissue Condition (legacy)</Label>
                    <Select value={formData.tissue_condition} onValueChange={(v) => handleChange('tissue_condition', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logistics (Q23, Q25) */}
            <Card>
              <CardHeader>
                <p className="text-sm font-medium">Logistics</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="external_donor_id">Donor ID / Number (Q23)</Label>
                    <Input id="external_donor_id" value={formData.external_donor_id} onChange={(e) => handleChange('external_donor_id', e.target.value)} placeholder="Partner's donor ID" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courier_update">Courier Update (Q25)</Label>
                  <Textarea id="courier_update" rows={2} value={formData.courier_update} onChange={(e) => handleChange('courier_update', e.target.value)} placeholder="Courier/logistics notes..." />
                </div>
              </CardContent>
            </Card>

            {/* Compliance */}
            <Card>
              <CardHeader>
                <p className="text-sm font-medium">Compliance</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="consent_obtained" checked={formData.consent_obtained} onCheckedChange={(checked) => handleChange('consent_obtained', !!checked)} />
                  <Label htmlFor="consent_obtained">Consent obtained from next of kin</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="medical_history_reviewed" checked={formData.medical_history_reviewed} onCheckedChange={(checked) => handleChange('medical_history_reviewed', !!checked)} />
                  <Label htmlFor="medical_history_reviewed">Medical history reviewed</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            {isEdit && id ? (
              <DocumentUpload donorId={id} canUpload={true} />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Save the donor first</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Please save the donor record before uploading documents.
                  </p>
                  <Button onClick={() => handleSave(false)} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Save as Draft
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            <Send className="h-4 w-4 mr-2" />
            Submit for Review
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDonorForm;
