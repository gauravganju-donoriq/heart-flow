import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, File, Download, CheckCircle2, AlertCircle, Circle, ChevronDown, FolderOpen } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Document = Database['public']['Tables']['documents']['Row'];

interface DocumentRequirement {
  id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  category: string;
}

interface DocumentUploadProps {
  donorId: string;
  canUpload?: boolean;
}

const CATEGORIES = [
  { value: 'consent_authorization', label: 'Consent & Authorization' },
  { value: 'medical_clinical', label: 'Medical & Clinical' },
  { value: 'lab_serology', label: 'Lab & Serology' },
  { value: 'recovery_packaging', label: 'Recovery & Packaging' },
  { value: 'other', label: 'Other' },
] as const;

const DocumentUpload = ({ donorId, canUpload = true }: DocumentUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>('');

  useEffect(() => {
    Promise.all([fetchDocuments(), fetchRequirements()]).then(() => setLoading(false));
  }, [donorId]);

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('donor_id', donorId)
      .order('created_at', { ascending: false });
    if (!error && data) setDocuments(data);
  };

  const fetchRequirements = async () => {
    const { data, error } = await supabase
      .from('document_requirements')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (!error && data) setRequirements(data as DocumentRequirement[]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${donorId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('donor-documents')
        .upload(fileName, file);

      if (uploadError) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: uploadError.message });
        continue;
      }

      const insertData: any = {
        donor_id: donorId,
        file_name: file.name,
        file_path: fileName,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
      };
      if (selectedRequirementId && selectedRequirementId !== 'other') {
        insertData.document_requirement_id = selectedRequirementId;
      }

      const { error: dbError } = await supabase.from('documents').insert(insertData);
      if (dbError) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save document record' });
      }
    }

    setUploading(false);
    setSelectedRequirementId('');
    fetchDocuments();
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast({ title: 'Success', description: 'Documents uploaded successfully' });
  };

  const handleDownload = async (doc: Document) => {
    const { data, error } = await supabase.storage
      .from('donor-documents')
      .download(doc.file_path);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to download file' });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUploadForRequirement = (reqId: string) => {
    setSelectedRequirementId(reqId);
    fileInputRef.current?.click();
  };

  const handleUploadOther = () => {
    setSelectedRequirementId('other');
    fileInputRef.current?.click();
  };

  // Group requirements by category
  const grouped = CATEGORIES.map(cat => {
    const items = requirements.filter(r => (r.category || 'other') === cat.value);
    return { ...cat, items };
  }).filter(g => g.items.length > 0);

  // Find fulfilled requirements
  const getMatchedDoc = (reqId: string) => documents.find((doc: any) => doc.document_requirement_id === reqId);

  // Uncategorized documents (not matched to any requirement)
  const matchedDocIds = new Set(
    requirements.map(r => getMatchedDoc(r.id)?.id).filter(Boolean)
  );
  const uncategorizedDocs = documents.filter(d => !matchedDocIds.has(d.id));

  // Overall compliance
  const requiredReqs = requirements.filter(r => r.is_required);
  const fulfilledRequired = requiredReqs.filter(r => !!getMatchedDoc(r.id)).length;

  if (loading) return <div className="text-center py-4 text-muted-foreground text-[13px]">Loading...</div>;

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      />

      {/* Overall compliance summary */}
      {requirements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Document Compliance</p>
                <CardDescription className="text-[13px]">
                  {requiredReqs.length > 0
                    ? `${fulfilledRequired} of ${requiredReqs.length} required documents uploaded`
                    : 'All documents optional'}
                </CardDescription>
              </div>
              {requiredReqs.length > 0 && fulfilledRequired < requiredReqs.length && (
                <div className="flex items-center gap-1.5 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-[12px] font-medium">Missing documents</span>
                </div>
              )}
              {requiredReqs.length > 0 && fulfilledRequired === requiredReqs.length && (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-[12px] font-medium">Complete</span>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Section-wise requirements with inline uploads */}
      {grouped.map(group => {
        const groupFulfilled = group.items.filter(r => !!getMatchedDoc(r.id)).length;
        const groupRequired = group.items.filter(r => r.is_required).length;
        const groupRequiredFulfilled = group.items.filter(r => r.is_required && !!getMatchedDoc(r.id)).length;
        const allDone = groupRequired === 0 || groupRequiredFulfilled === groupRequired;

        return (
          <Collapsible key={group.value} defaultOpen>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{group.label}</p>
                      <Badge variant={allDone ? 'default' : 'secondary'} className="text-[11px]">
                        {groupFulfilled} / {group.items.length}
                      </Badge>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {group.items.map(req => {
                      const matchedDoc = getMatchedDoc(req.id);
                      const fulfilled = !!matchedDoc;
                      return (
                        <div
                          key={req.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border ${
                            fulfilled
                              ? 'border-emerald-200 bg-emerald-50/50'
                              : req.is_required
                              ? 'border-amber-200 bg-amber-50/30'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {fulfilled ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : req.is_required ? (
                              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-medium">{req.name}</p>
                                {req.is_required && !fulfilled && (
                                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Required</Badge>
                                )}
                              </div>
                              {fulfilled && matchedDoc ? (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <File className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <p className="text-[12px] text-muted-foreground truncate">{matchedDoc.file_name}</p>
                                  <span className="text-[11px] text-muted-foreground">·</span>
                                  <span className="text-[11px] text-muted-foreground">{formatFileSize(matchedDoc.file_size)}</span>
                                </div>
                              ) : (
                                req.description && <p className="text-[12px] text-muted-foreground mt-0.5">{req.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 ml-2">
                            {fulfilled && matchedDoc ? (
                              <Button variant="ghost" size="sm" className="h-7" onClick={() => handleDownload(matchedDoc)}>
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            ) : canUpload ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[12px] h-7"
                                disabled={uploading}
                                onClick={() => handleUploadForRequirement(req.id)}
                              >
                                <Upload className="h-3 w-3 mr-1" />Upload
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* Other / Uncategorized Documents */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Other Documents</p>
              <p className="text-[13px] text-muted-foreground">Additional files not tied to a specific requirement</p>
            </div>
            {canUpload && (
              <Button variant="outline" size="sm" className="h-8 text-[13px]" disabled={uploading} onClick={handleUploadOther}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            )}
          </div>
        </CardHeader>
        {uncategorizedDocs.length > 0 && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              {uncategorizedDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between py-2.5 px-3 border rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <File className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate">{doc.file_name}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 shrink-0" onClick={() => handleDownload(doc)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        )}
        {uncategorizedDocs.length === 0 && (
          <CardContent className="pt-0">
            <p className="text-[13px] text-muted-foreground text-center py-4">No additional documents</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default DocumentUpload;
