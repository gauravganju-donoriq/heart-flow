import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, Users, FileText, Bell, ArrowLeft, Save, Send } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type DonorInsert = Database['public']['Tables']['donors']['Insert'];

interface Partner {
  id: string;
  organization_name: string;
}

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Partners', href: '/admin/partners', icon: <Users className="h-4 w-4" /> },
  { label: 'Donors', href: '/admin/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Notifications', href: '/admin/notifications', icon: <Bell className="h-4 w-4" /> },
];

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
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    blood_type: '',
    cause_of_death: '',
    death_date: '',
    tissue_type: '',
    tissue_condition: '',
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

    setSelectedPartnerId(data.partner_id);
    setFormData({
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      date_of_birth: data.date_of_birth || '',
      gender: data.gender || '',
      blood_type: data.blood_type || '',
      cause_of_death: data.cause_of_death || '',
      death_date: data.death_date ? data.death_date.split('T')[0] : '',
      tissue_type: data.tissue_type || '',
      tissue_condition: data.tissue_condition || '',
      consent_obtained: data.consent_obtained || false,
      medical_history_reviewed: data.medical_history_reviewed || false,
    });
    setLoading(false);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (submit = false) => {
    if (!selectedPartnerId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a partner' });
      return;
    }

    setSaving(true);

    const donorData: DonorInsert = {
      partner_id: selectedPartnerId,
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || null,
      blood_type: formData.blood_type || null,
      cause_of_death: formData.cause_of_death || null,
      death_date: formData.death_date ? new Date(formData.death_date).toISOString() : null,
      tissue_type: formData.tissue_type || null,
      tissue_condition: formData.tissue_condition || null,
      consent_obtained: formData.consent_obtained,
      medical_history_reviewed: formData.medical_history_reviewed,
      status: submit ? 'submitted' : 'draft',
      submitted_at: submit ? new Date().toISOString() : null,
    };

    let result;

    if (isEdit) {
      result = await supabase.from('donors').update(donorData).eq('id', id).select().single();
    } else {
      result = await supabase.from('donors').insert(donorData).select().single();
    }

    setSaving(false);

    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error.message });
      return;
    }

    toast({
      title: submit ? 'Donor Submitted' : 'Donor Saved',
      description: submit ? 'Donor has been submitted for review' : 'Donor has been saved as a draft',
    });

    navigate(`/admin/donors/${result.data.id}`);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Admin Panel">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/donors')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? 'Edit Donor' : 'New Donor'}</h1>
            <p className="text-muted-foreground">Enter donor information for screening</p>
          </div>
        </div>

        {/* Partner Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Partner Assignment</CardTitle>
            <CardDescription>Select which partner this donor belongs to</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-sm">
              <Label htmlFor="partner">Partner Organization</Label>
              <Select
                value={selectedPartnerId}
                onValueChange={setSelectedPartnerId}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a partner" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.organization_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Demographics */}
        <Card>
          <CardHeader>
            <CardTitle>Demographics</CardTitle>
            <CardDescription>Basic donor information</CardDescription>
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
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
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

        {/* Tissue Condition */}
        <Card>
          <CardHeader>
            <CardTitle>Tissue Condition</CardTitle>
            <CardDescription>Information about the tissue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cause_of_death">Cause of Death</Label>
                <Input id="cause_of_death" value={formData.cause_of_death} onChange={(e) => handleChange('cause_of_death', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="death_date">Date of Death</Label>
                <Input id="death_date" type="date" value={formData.death_date} onChange={(e) => handleChange('death_date', e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tissue_type">Tissue Type</Label>
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
                <Label htmlFor="tissue_condition">Tissue Condition</Label>
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

        {/* Compliance */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance</CardTitle>
            <CardDescription>Required documentation checks</CardDescription>
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

        {/* Actions */}
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
