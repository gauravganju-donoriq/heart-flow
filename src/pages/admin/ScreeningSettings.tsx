import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, Users, FileText, Bell, Shield, Plus, Pencil, Trash2 } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Partners', href: '/admin/partners', icon: <Users className="h-4 w-4" /> },
  { label: 'Donors', href: '/admin/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Screening', href: '/admin/screening-settings', icon: <Shield className="h-4 w-4" /> },
  { label: 'Notifications', href: '/admin/notifications', icon: <Bell className="h-4 w-4" /> },
];

const categories = ['eligibility', 'medical', 'logistics', 'general'] as const;
type Category = typeof categories[number];

const categoryLabels: Record<Category, string> = {
  eligibility: 'Eligibility',
  medical: 'Medical',
  logistics: 'Logistics',
  general: 'General',
};

interface Guideline {
  id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const starterTemplates: Partial<Guideline>[] = [
  // Eligibility
  { title: 'Age Criteria (Q4)', content: 'Evaluate the donor age (Q4). Donors under age 2 should be rejected. Donors over age 80 require careful review — consider cause of death and overall clinical picture before recommending acceptance. Age between 2-80 is generally acceptable if other factors are favorable.', category: 'eligibility' },
  { title: 'Consent Requirements', content: 'Consent must be obtained before tissue recovery can proceed. If consent_obtained is false or missing, the donor cannot be accepted — mark as needs_review and flag missing consent as a critical concern.', category: 'eligibility' },
  { title: 'Sex at Birth (Q5)', content: 'Sex at birth (Q5) must be documented (male or female). If missing, flag as missing data but do not reject solely on this basis.', category: 'eligibility' },

  // Medical
  { title: 'Cause of Death Evaluation (Q10)', content: 'Carefully evaluate the cause of death (Q10). Deaths involving unknown etiology should be flagged for review. Deaths from poisoning, drug overdose, or suspected infectious disease require careful evaluation of tissue viability. Deaths from trauma, cardiac arrest, or stroke are generally acceptable if other factors are favorable.', category: 'medical' },
  { title: 'Type of Death (Q8)', content: 'Evaluate the type of death (Q8) — cardiac death vs brain death. Brain death donors may have better tissue viability due to maintained circulation. Consider type of death in conjunction with time of death (Q7) and clinical course (Q11).', category: 'medical' },
  { title: 'Clinical Course (Q11)', content: 'Review the clinical course (Q11) for any signs of prolonged infection, sepsis, multi-organ failure, or conditions that could compromise tissue quality. Extended ICU stays with vasopressors or multiple antibiotics should be flagged as concerns.', category: 'medical' },
  { title: 'Medical History (Q14)', content: 'Review the medical history (Q14) for exclusionary conditions: active systemic infection, HIV, Hepatitis B/C, CJD/prion disease, active cancer with metastasis, or autoimmune conditions affecting vascular tissue. History of IV drug use, incarceration, or high-risk sexual behavior should be flagged per FDA guidelines.', category: 'medical' },
  { title: 'High Risk Notes (Q15)', content: 'High risk / additional notes (Q15) should be carefully evaluated. Any mention of communicable diseases, recent tattoos/piercings (within 12 months), recent travel to endemic areas, or other risk factors should be flagged with appropriate severity.', category: 'medical' },
  { title: 'Height & Weight (Q12, Q13)', content: 'Height in inches (Q12) and weight in kgs (Q13) should be documented. Extreme values may indicate data entry errors — flag for review. BMI extremes (very low or morbidly obese) may affect tissue quality and should be noted as concerns.', category: 'medical' },

  // Logistics
  { title: 'Death Timing (Q6, Q7, Q9)', content: 'Date of death (Q6), time of death (Q7), and timezone (Q9) must all be documented for ischemia time calculations. If any are missing, flag as missing data. Excessive time since death (generally >24 hours without refrigeration) should be flagged as a concern for tissue viability.', category: 'logistics' },
  { title: 'Tissue Recovery Decisions (Q16-Q21)', content: 'If the donor is marked as deferred in Q16, the screening should reflect that. For accepted donors, note which tissues are requested: Heart Valves (Q17), Aorto Iliac (Q19), Femoral (Q20), Saphenous Vein (Q21). If HV pathology request (Q18) is specified, note it in the evaluation.', category: 'logistics' },
  { title: 'Autopsy Status (Q22)', content: 'If an autopsy (Q22) is scheduled or has been performed, note this in the evaluation. Autopsy findings may affect tissue acceptability. If autopsy is pending, recommend needs_review until results are available.', category: 'logistics' },
  { title: 'Prescreen vs Update (Q24)', content: 'If this is a prescreen or update on a pre-existing donor (Q24 = true), evaluate whether the new information changes any previous screening assessment. Focus on what has changed rather than re-evaluating everything from scratch.', category: 'logistics' },

  // General
  { title: 'Data Completeness', content: 'A complete donor profile should include at minimum: age (Q4), sex (Q5), cause of death (Q10), date/time of death (Q6/Q7), and medical history (Q14). If more than 2 critical fields are missing, the donor cannot be accepted — mark as needs_review.', category: 'general' },
  { title: 'Conservative Approach', content: 'When in doubt, always recommend needs_review rather than accept. It is better to have a human review a borderline case than to accept a donor that should have been flagged. The AI evaluation is advisory only — a human admin makes the final decision.', category: 'general' },
];

const ScreeningSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuideline, setEditingGuideline] = useState<Guideline | null>(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'general' as string });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => { fetchGuidelines(); }, []);

  const fetchGuidelines = async () => {
    const { data, error } = await supabase
      .from('screening_guidelines')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setGuidelines(data as Guideline[]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Title and content are required' });
      return;
    }
    setSaving(true);

    if (editingGuideline) {
      const { error } = await supabase
        .from('screening_guidelines')
        .update({ title: form.title, content: form.content, category: form.category })
        .eq('id', editingGuideline.id);
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Updated', description: 'Guideline updated successfully' });
      }
    } else {
      const maxOrder = guidelines.length > 0 ? Math.max(...guidelines.map(g => g.sort_order)) + 1 : 0;
      const { error } = await supabase
        .from('screening_guidelines')
        .insert({ title: form.title, content: form.content, category: form.category, sort_order: maxOrder, created_by: user!.id });
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Created', description: 'Guideline added successfully' });
      }
    }

    setSaving(false);
    setDialogOpen(false);
    setEditingGuideline(null);
    setForm({ title: '', content: '', category: 'general' });
    fetchGuidelines();
  };

  const handleEdit = (g: Guideline) => {
    setEditingGuideline(g);
    setForm({ title: g.title, content: g.content, category: g.category });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('screening_guidelines').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Deleted', description: 'Guideline removed' });
      fetchGuidelines();
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from('screening_guidelines').update({ is_active: active }).eq('id', id);
    fetchGuidelines();
  };

  const handleAddStarters = async () => {
    const inserts = starterTemplates.map((t, i) => ({
      title: t.title!,
      content: t.content!,
      category: t.category!,
      sort_order: i,
      created_by: user!.id,
    }));
    const { error } = await supabase.from('screening_guidelines').insert(inserts);
    if (!error) {
      toast({ title: 'Templates Added', description: 'Starter guidelines have been added' });
      fetchGuidelines();
    }
  };

  const filtered = activeTab === 'all' ? guidelines : guidelines.filter(g => g.category === activeTab);

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Screening Guidelines</h1>
            <p className="text-muted-foreground">Define the policy document the AI agent uses to evaluate donors</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingGuideline(null); setForm({ title: '', content: '', category: 'general' }); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Guideline</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingGuideline ? 'Edit Guideline' : 'Add Guideline'}</DialogTitle>
                <DialogDescription>Write a screening guideline in natural language. The AI agent will interpret and apply it holistically.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Age Criteria" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write your screening guideline in plain English..." rows={6} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingGuideline ? 'Update' : 'Add'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {guidelines.length === 0 && !loading && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center space-y-4">
              <p className="text-muted-foreground">No screening guidelines configured yet.</p>
              <Button variant="outline" onClick={handleAddStarters}>Load Starter Templates</Button>
            </CardContent>
          </Card>
        )}

        {guidelines.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({guidelines.length})</TabsTrigger>
              {categories.map(c => {
                const count = guidelines.filter(g => g.category === c).length;
                return count > 0 ? <TabsTrigger key={c} value={c}>{categoryLabels[c]} ({count})</TabsTrigger> : null;
              })}
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-4">
              {filtered.map(g => (
                <Card key={g.id} className={!g.is_active ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{g.title}</CardTitle>
                        <Badge variant="outline">{categoryLabels[g.category as Category] || g.category}</Badge>
                        {!g.is_active && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={g.is_active} onCheckedChange={v => handleToggleActive(g.id, v)} />
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(g)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{g.content}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ScreeningSettings;
