import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import DocumentChecklistSettings from '@/components/admin/DocumentChecklistSettings';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { LayoutDashboard, Users, FileText, ScrollText, Shield, Plus, Pencil, Trash2 } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Partners', href: '/admin/partners', icon: <Users className="h-4 w-4" /> },
  { label: 'Donors', href: '/admin/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Screening', href: '/admin/screening-settings', icon: <Shield className="h-4 w-4" /> },
  { label: 'Audit Log', href: '/admin/audit-log', icon: <ScrollText className="h-4 w-4" /> },
];

const categories = ['eligibility', 'medical', 'logistics', 'general'] as const;
type Category = typeof categories[number];

const categoryLabels: Record<Category, string> = {
  eligibility: 'Eligibility', medical: 'Medical', logistics: 'Logistics', general: 'General',
};

interface Guideline {
  id: string; title: string; content: string; category: string;
  is_active: boolean; sort_order: number; created_by: string;
  created_at: string; updated_at: string;
}

const starterTemplates: Partial<Guideline>[] = [
  { title: 'Age Limits', content: 'Reject donors under age 2. Donors over 80 need extra scrutiny — only accept if cause of death and medical history are clearly low-risk.', category: 'eligibility' },
  { title: 'Consent Required', content: 'Donor consent must be obtained before acceptance. If consent is missing, mark as needs review.', category: 'eligibility' },
  { title: 'Infectious Disease Exclusions', content: 'Reject donors with active HIV, Hepatitis B/C, CJD/prion disease, or any active systemic infection. Flag any history of these conditions as high severity.', category: 'medical' },
  { title: 'Cancer & Metastasis', content: 'Reject donors with active cancer that has metastasized. Localized, treated cancers in remission may be acceptable — flag for review.', category: 'medical' },
  { title: 'Cause of Death Red Flags', content: 'Flag donors whose cause of death is unknown or involves poisoning, suspected infectious disease, or unexplained sudden death. These require careful human review.', category: 'medical' },
  { title: 'High-Risk Behaviors', content: 'Flag donors with history of IV drug use, recent tattoos or piercings (within 12 months), incarceration, or other FDA-defined high-risk behaviors. These do not auto-reject but must be noted.', category: 'medical' },
  { title: 'Tissue Viability & Timing', content: 'If more than 24 hours have passed since death without refrigeration, flag tissue viability as a concern. Excessive ischemia time reduces tissue quality.', category: 'logistics' },
  { title: 'Missing Critical Data', content: 'If more than 2 of these fields are missing — age, cause of death, date/time of death, medical history — the donor cannot be accepted. Mark as needs review.', category: 'general' },
  { title: 'When In Doubt, Flag It', content: 'Always recommend needs_review rather than accept when uncertain. It is better to have a human review a borderline case. This evaluation is advisory only.', category: 'general' },
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
    const { data, error } = await supabase.from('screening_guidelines').select('*').order('sort_order', { ascending: true });
    if (!error && data) setGuidelines(data as Guideline[]);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Title and content are required' });
      return;
    }
    setSaving(true);
    if (editingGuideline) {
      const { error } = await supabase.from('screening_guidelines').update({ title: form.title, content: form.content, category: form.category }).eq('id', editingGuideline.id);
      if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
      else toast({ title: 'Updated', description: 'Guideline updated' });
    } else {
      const maxOrder = guidelines.length > 0 ? Math.max(...guidelines.map(g => g.sort_order)) + 1 : 0;
      const { error } = await supabase.from('screening_guidelines').insert({ title: form.title, content: form.content, category: form.category, sort_order: maxOrder, created_by: user!.id });
      if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
      else toast({ title: 'Created', description: 'Guideline added' });
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
    if (!error) { toast({ title: 'Deleted', description: 'Guideline removed' }); fetchGuidelines(); }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from('screening_guidelines').update({ is_active: active }).eq('id', id);
    fetchGuidelines();
  };

  const handleAddStarters = async () => {
    const inserts = starterTemplates.map((t, i) => ({
      title: t.title!, content: t.content!, category: t.category!, sort_order: i, created_by: user!.id,
    }));
    const { error } = await supabase.from('screening_guidelines').insert(inserts);
    if (!error) { toast({ title: 'Templates Added', description: 'Starter guidelines have been added' }); fetchGuidelines(); }
  };

  const filtered = activeTab === 'all' ? guidelines : guidelines.filter(g => g.category === activeTab);

  return (
    <DashboardLayout navItems={navItems} title="Atlas">
      <div className="space-y-5 max-w-4xl">
        <Tabs defaultValue="guidelines" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-0 mb-5">
            <TabsTrigger value="guidelines" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px] px-4 py-2.5">Screening Guidelines</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px] px-4 py-2.5">Document Checklist</TabsTrigger>
          </TabsList>

          <TabsContent value="guidelines">
            <div className="space-y-5">
              {/* Toolbar */}
              <div className="flex items-center justify-end">
                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingGuideline(null); setForm({ title: '', content: '', category: 'general' }); } }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-9 text-[13px]"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Guideline</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-base">{editingGuideline ? 'Edit Guideline' : 'Add Guideline'}</DialogTitle>
                      <DialogDescription className="text-[13px]">Write a screening guideline in natural language. The AI agent will interpret and apply it.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1">
                        <Label className="text-[13px]">Title</Label>
                        <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Age Criteria" className="h-9 text-[13px]" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[13px]">Category</Label>
                        <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                          <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {categories.map(c => <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[13px]">Content</Label>
                        <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write your screening guideline in plain English..." rows={5} className="text-[13px]" />
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="h-9 text-[13px]">Cancel</Button>
                      <Button size="sm" onClick={handleSave} disabled={saving} className="h-9 text-[13px]">{saving ? 'Saving…' : editingGuideline ? 'Update' : 'Add'}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Empty state */}
              {guidelines.length === 0 && !loading && (
                <div className="border border-dashed border-border rounded-lg py-12 text-center">
                  <p className="text-[13px] text-muted-foreground mb-3">No screening guidelines configured yet</p>
                  <Button variant="outline" size="sm" onClick={handleAddStarters} className="h-9 text-[13px]">Load Starter Templates</Button>
                </div>
              )}

              {/* Category filter tabs */}
              {guidelines.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-md text-[13px] transition-colors ${activeTab === 'all' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    All ({guidelines.length})
                  </button>
                  {categories.map(c => {
                    const count = guidelines.filter(g => g.category === c).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={c}
                        onClick={() => setActiveTab(c)}
                        className={`px-3 py-1.5 rounded-md text-[13px] transition-colors ${activeTab === c ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-muted'}`}
                      >
                        {categoryLabels[c]} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Guidelines list */}
              {guidelines.length > 0 && (
                <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                  {filtered.map(g => (
                    <div key={g.id} className={`px-5 py-4 ${!g.is_active ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-[13px] font-medium">{g.title}</p>
                            <Badge variant="outline" className="text-[11px] font-normal">{categoryLabels[g.category as Category] || g.category}</Badge>
                            {!g.is_active && <Badge variant="secondary" className="text-[11px] font-normal">Inactive</Badge>}
                          </div>
                          <p className="text-[13px] text-muted-foreground whitespace-pre-wrap">{g.content}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch checked={g.is_active} onCheckedChange={v => handleToggleActive(g.id, v)} />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(g)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(g.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <DocumentChecklistSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ScreeningSettings;
