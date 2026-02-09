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
  created_by: string;
  created_at: string;
  updated_at: string;
}

const starterTemplates = [
  { name: 'Consent Form', description: 'Signed consent form from next of kin or legal authority', is_required: true },
  { name: 'Medical Examiner / Coroner Report', description: 'Official report from ME or coroner office', is_required: true },
  { name: 'Serology / Infectious Disease Test Results', description: 'Lab results for HIV, Hep B/C, syphilis, and other required tests', is_required: true },
  { name: 'Next of Kin Authorization', description: 'Written authorization from next of kin for tissue recovery', is_required: true },
  { name: 'Donor Medical / Social History Questionnaire (DRAI)', description: 'Completed DRAI form with medical and social history', is_required: true },
  { name: 'Hemodilution Worksheet', description: 'Completed plasma dilution / hemodilution assessment worksheet', is_required: false },
];

const DocumentChecklistSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentRequirement | null>(null);
  const [form, setForm] = useState({ name: '', description: '', is_required: true });
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
        .update({ name: form.name, description: form.description || null, is_required: form.is_required })
        .eq('id', editing.id);
      if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
      else toast({ title: 'Updated', description: 'Requirement updated' });
    } else {
      const maxOrder = requirements.length > 0 ? Math.max(...requirements.map(r => r.sort_order)) + 1 : 0;
      const { error } = await supabase
        .from('document_requirements')
        .insert({ name: form.name, description: form.description || null, is_required: form.is_required, sort_order: maxOrder, created_by: user!.id });
      if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
      else toast({ title: 'Created', description: 'Requirement added' });
    }

    setSaving(false);
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: '', description: '', is_required: true });
    fetchRequirements();
  };

  const handleEdit = (r: DocumentRequirement) => {
    setEditing(r);
    setForm({ name: r.name, description: r.description || '', is_required: r.is_required });
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
    }));
    const { error } = await supabase.from('document_requirements').insert(inserts);
    if (!error) { toast({ title: 'Templates Added', description: 'Starter document requirements loaded' }); fetchRequirements(); }
  };

  if (loading) return <div className="text-center py-4 text-muted-foreground text-[13px]">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(null); setForm({ name: '', description: '', is_required: true }); } }}>
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

      {requirements.map(r => (
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
  );
};

export default DocumentChecklistSettings;
