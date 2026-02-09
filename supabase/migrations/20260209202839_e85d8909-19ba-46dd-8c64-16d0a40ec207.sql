
-- Create document_requirements table
CREATE TABLE public.document_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD
CREATE POLICY "Admins can manage document requirements"
ON public.document_requirements FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read active requirements
CREATE POLICY "Authenticated users can view document requirements"
ON public.document_requirements FOR SELECT
TO authenticated
USING (true);

-- Timestamp trigger
CREATE TRIGGER update_document_requirements_updated_at
BEFORE UPDATE ON public.document_requirements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add document_requirement_id to documents table
ALTER TABLE public.documents
ADD COLUMN document_requirement_id UUID REFERENCES public.document_requirements(id);
