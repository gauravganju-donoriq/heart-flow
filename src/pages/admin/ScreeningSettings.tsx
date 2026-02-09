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
  { title: 'Age Criteria', content: 'Donors under age 2 should be rejected. Donors over age 80 should be flagged for review.', category: 'eligibility' },
  { title: 'High-Risk Exclusions', content: 'Donors with active systemic infection, HIV, Hepatitis B/C, or CJD should be rejected.', category: 'medical' },
  { title: 'Cause of Death Considerations', content: 'Donors whose cause of death involves unknown etiology should be flagged for review. Deaths from poisoning or drug overdose require careful evaluation of tissue viability.', category: 'medical' },
  { title: 'Consent Requirements', content: 'Consent must be obtained before tissue recovery can proceed. If consent is not documented, mark as needs_review.', category: 'eligibility' },
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
