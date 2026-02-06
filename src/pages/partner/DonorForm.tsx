import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, FileText, Bell, ArrowLeft, Save, Send } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type DonorInsert = Database['public']['Tables']['donors']['Insert'];

const navItems = [
  { label: 'Dashboard', href: '/partner', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Donors', href: '/partner/donors', icon: <FileText className="h-4 w-4" /> },
  { label: 'Notifications', href: '/partner/notifications', icon: <Bell className="h-4 w-4" /> },
];

const DonorForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { partnerId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    if (id) {
      fetchDonor();
    }
  }, [id]);

  const fetchDonor = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('donors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load donor data',
      });
      navigate('/partner/donors');
      return;
    }

    if (data.status !== 'draft') {
      toast({
        variant: 'destructive',
        title: 'Cannot Edit',
        description: 'Only draft donors can be edited',
      });
      navigate(`/partner/donors/${id}`);
      return;
    }

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
    if (!partnerId) return;

    setSaving(true);

    const donorData: DonorInsert = {
      partner_id: partnerId,
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
      result = await supabase
        .from('donors')
        .update(donorData)
        .eq('id', id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('donors')
        .insert(donorData)
        .select()
        .single();
    }

    setSaving(false);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error.message,
      });
      return;
    }

    toast({
      title: submit ? 'Donor Submitted' : 'Donor Saved',
      description: submit
        ? 'Your donor has been submitted for review'
        : 'Your donor has been saved as a draft',
    });

    navigate(`/partner/donors/${result.data.id}`);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Partner Portal">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Partner Portal">
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/partner/donors')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? 'Edit Donor' : 'New Donor'}</h1>
            <p className="text-muted-foreground">Enter donor information for screening</p>
          </div>
        </div>

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
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
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
                <Input
                  id="cause_of_death"
                  value={formData.cause_of_death}
                  onChange={(e) => handleChange('cause_of_death', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="death_date">Date of Death</Label>
                <Input
                  id="death_date"
                  type="date"
                  value={formData.death_date}
                  onChange={(e) => handleChange('death_date', e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tissue_type">Tissue Type</Label>
                <Select value={formData.tissue_type} onValueChange={(v) => handleChange('tissue_type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
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
              <Checkbox
                id="consent_obtained"
                checked={formData.consent_obtained}
                onCheckedChange={(checked) => handleChange('consent_obtained', !!checked)}
              />
              <Label htmlFor="consent_obtained">Consent obtained from next of kin</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="medical_history_reviewed"
                checked={formData.medical_history_reviewed}
                onCheckedChange={(checked) => handleChange('medical_history_reviewed', !!checked)}
              />
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

export default DonorForm;
