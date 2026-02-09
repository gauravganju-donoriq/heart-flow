import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface DocumentRequirement {
  id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  category: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'consent_authorization', label: 'Consent & Authorization' },
  { value: 'medical_clinical', label: 'Medical & Clinical' },
  { value: 'lab_serology', label: 'Lab & Serology' },
  { value: 'recovery_packaging', label: 'Recovery & Packaging' },
  { value: 'other', label: 'Other' },
] as const;

const categoryLabel = (val: string) => CATEGORIES.find(c => c.value === val)?.label ?? val;

const starterTemplates = [
  { name: 'Consent Form', description: 'Signed consent form from next of kin or legal authority', is_required: true, category: 'consent_authorization' },
  { name: 'Next of Kin Authorization', description: 'Written authorization from next of kin for tissue recovery', is_required: true, category: 'consent_authorization' },
  { name: 'Medical Examiner / Coroner Report', description: 'Official report from ME or coroner office', is_required: true, category: 'medical_clinical' },
  { name: 'Donor Risk Assessment Interview (DRAI)', description: 'Completed DRAI form with medical and social history', is_required: true, category: 'medical_clinical' },
  { name: 'Serology / Infectious Disease Results', description: 'Lab results for HIV, Hep B/C, syphilis, and other required tests', is_required: true, category: 'lab_serology' },
  { name: 'Blood Typing Report', description: 'ABO/Rh blood typing lab report', is_required: false, category: 'lab_serology' },
  { name: 'Tissue Recovery Report', description: 'Completed tissue recovery documentation', is_required: true, category: 'recovery_packaging' },
  { name: 'Hemodilution Worksheet', description: 'Completed plasma dilution / hemodilution assessment worksheet', is_required: false, category: 'recovery_packaging' },
  { name: 'Packaging & Shipping Checklist', description: 'Packaging and shipping verification checklist', is_required: false, category: 'recovery_packaging' },
];

const DocumentChecklistSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentRequirement | null>(null);
  const [form, setForm] = useState({ name: '', description: '', is_required: true, category: 'other' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchRequirements(); }, []);

  const fetchRequirements = async () => {
    const { data, error } = await supabase
      .from('document_requirements')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error && data) setRequirements(data as DocumentRequirement[]);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Name is required' });
      return;
    }
    setSaving(true);

    if (editing) {
      const { error } = await supabase
        .from('document_requirements')
        .update({ name: form.name, description: form.description || null, is_required: form.is_required, category: form.category } as any)
        .eq('id', editing.id);
      if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
      else toast({ title: 'Updated', description: 'Requirement updated' });
    } else {
      const maxOrder = requirements.length > 0 ? Math.max(...requirements.map(r => r.sort_order)) + 1 : 0;
      const { error } = await supabase
        .from('document_requirements')
        .insert({ name: form.name, description: form.description || null, is_required: form.is_required, sort_order: maxOrder, created_by: user!.id, category: form.category } as any);
      if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
      else toast({ title: 'Created', description: 'Requirement added' });
    }

    setSaving(false);
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: '', description: '', is_required: true, category: 'other' });
    fetchRequirements();
  };

  const handleEdit = (r: DocumentRequirement) => {
    setEditing(r);
    setForm({ name: r.name, description: r.description || '', is_required: r.is_required, category: r.category || 'other' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('document_requirements').delete().eq('id', id);
    if (!error) { toast({ title: 'Deleted', description: 'Requirement removed' }); fetchRequirements(); }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from('document_requirements').update({ is_active: active }).eq('id', id);
    fetchRequirements();
  };

  const handleAddStarters = async () => {
    const inserts = starterTemplates.map((t, i) => ({
      name: t.name,
      description: t.description,
      is_required: t.is_required,
      sort_order: i,
      created_by: user!.id,
      category: t.category,
    }));
    const { error } = await supabase.from('document_requirements').insert(inserts as any);
    if (!error) { toast({ title: 'Templates Added', description: 'Starter document requirements loaded' }); fetchRequirements(); }
  };

  // Group requirements by category
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: requirements.filter(r => (r.category || 'other') === cat.value),
  })).filter(g => g.items.length > 0);

  if (loading) return <div className="text-center py-4 text-muted-foreground text-[13px]">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(null); setForm({ name: '', description: '', is_required: true, category: 'other' }); } }}>
          <DialogTrigger asChild>
            <Button className="h-9 text-[13px]"><Plus className="h-4 w-4 mr-2" />Add Requirement</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Requirement' : 'Add Requirement'}</DialogTitle>
              <DialogDescription>Define a document type that partners must upload for each donor referral.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Consent Form" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description / Instructions</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Guidance for partners on what to upload..." rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="is_required" checked={form.is_required} onCheckedChange={(v) => setForm(p => ({ ...p, is_required: !!v }))} />
                <Label htmlFor="is_required" className="text-[13px]">Required document</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {requirements.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center space-y-4">
            <p className="text-muted-foreground text-[13px]">No document requirements configured yet.</p>
            <Button variant="outline" onClick={handleAddStarters}>Load Starter Templates</Button>
          </CardContent>
        </Card>
      )}

      {grouped.map(group => (
        <div key={group.value} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">{group.label}</p>
            <Badge variant="secondary" className="text-[11px]">{group.items.length}</Badge>
          </div>
          {group.items.map(r => (
            <Card key={r.id} className={!r.is_active ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium">{r.name}</p>
                    {r.is_required ? <Badge variant="default" className="text-[11px]">Required</Badge> : <Badge variant="secondary" className="text-[11px]">Optional</Badge>}
                    {!r.is_active && <Badge variant="outline" className="text-[11px]">Inactive</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={r.is_active} onCheckedChange={v => handleToggleActive(r.id, v)} />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                {r.description && <p className="text-[13px] text-muted-foreground mt-1">{r.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
};

export default DocumentChecklistSettings;
