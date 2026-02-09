import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, File, Download, CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Document = Database['public']['Tables']['documents']['Row'];

interface DocumentRequirement {
  id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

interface DocumentUploadProps {
  donorId: string;
  canUpload?: boolean;
}

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

  const getRequirementStatus = (req: DocumentRequirement) => {
    const matched = documents.find((doc: any) => doc.document_requirement_id === req.id);
    return !!matched;
  };

  const fulfilledCount = requirements.filter(r => r.is_required && getRequirementStatus(r)).length;
  const requiredCount = requirements.filter(r => r.is_required).length;

  const handleUploadForRequirement = (reqId: string) => {
    setSelectedRequirementId(reqId);
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Compliance Checklist */}
      {requirements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Document Checklist</p>
                <CardDescription className="text-[13px]">
                  {requiredCount > 0 ? `${fulfilledCount} of ${requiredCount} required documents uploaded` : 'All documents optional'}
                </CardDescription>
              </div>
              {requiredCount > 0 && fulfilledCount < requiredCount && (
                <div className="flex items-center gap-1.5 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-[12px] font-medium">Missing documents</span>
                </div>
              )}
              {requiredCount > 0 && fulfilledCount === requiredCount && (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-[12px] font-medium">Complete</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requirements.map(req => {
                const fulfilled = getRequirementStatus(req);
                return (
                  <div key={req.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${fulfilled ? 'border-emerald-200 bg-emerald-50/50' : req.is_required ? 'border-amber-200 bg-amber-50/30' : 'border-border'}`}>
                    <div className="flex items-center gap-2.5">
                      {fulfilled ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : req.is_required ? (
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <p className="text-[13px] font-medium">{req.name}</p>
                        {req.description && <p className="text-[12px] text-muted-foreground">{req.description}</p>}
                      </div>
                    </div>
                    {!fulfilled && canUpload && (
                      <Button variant="ghost" size="sm" className="text-[12px] h-7" onClick={() => handleUploadForRequirement(req.id)}>
                        <Upload className="h-3 w-3 mr-1" />Upload
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List & Upload */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Documents</p>
              <p className="text-[13px] text-muted-foreground">Uploaded files for this donor</p>
            </div>
            {canUpload && (
              <div className="flex items-center gap-2">
                {requirements.length > 0 && (
                  <Select value={selectedRequirementId} onValueChange={setSelectedRequirementId}>
                    <SelectTrigger className="w-[180px] h-9 text-[13px]">
                      <SelectValue placeholder="Document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {requirements.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No documents uploaded yet</div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const matchedReq = requirements.find(r => r.id === (doc as any).document_requirement_id);
                return (
                  <div key={doc.id} className="flex items-center justify-between py-2.5 px-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <File className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-[13px] font-medium">{doc.file_name}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {matchedReq && <span className="text-foreground font-medium">{matchedReq.name} · </span>}
                          {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUpload;
