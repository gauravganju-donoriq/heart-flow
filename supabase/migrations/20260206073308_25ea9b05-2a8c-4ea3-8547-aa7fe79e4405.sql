-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'partner');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create partners table (organization details)
CREATE TABLE public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    organization_name TEXT NOT NULL,
    contact_phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Create donor status enum
CREATE TYPE public.donor_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected');

-- Create donors table
CREATE TABLE public.donors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
    donor_code TEXT UNIQUE,
    status donor_status NOT NULL DEFAULT 'draft',
    -- Demographics
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    gender TEXT,
    blood_type TEXT,
    -- Tissue condition
    cause_of_death TEXT,
    death_date TIMESTAMP WITH TIME ZONE,
    tissue_type TEXT,
    tissue_condition TEXT,
    -- Compliance
    consent_obtained BOOLEAN DEFAULT false,
    medical_history_reviewed BOOLEAN DEFAULT false,
    -- Review fields
    review_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for donor documents
INSERT INTO storage.buckets (id, name, public) VALUES ('donor-documents', 'donor-documents', false);

-- Create documents table
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID REFERENCES public.donors(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    donor_id UUID REFERENCES public.donors(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for partners
CREATE POLICY "Partners can view their own record"
ON public.partners FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Partners can update their own record"
ON public.partners FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all partners"
ON public.partners FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage partners"
ON public.partners FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for donors
CREATE POLICY "Partners can view their own donors"
ON public.donors FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.partners
        WHERE partners.id = donors.partner_id
        AND partners.user_id = auth.uid()
    )
);

CREATE POLICY "Partners can insert donors"
ON public.donors FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.partners
        WHERE partners.id = partner_id
        AND partners.user_id = auth.uid()
    )
);

CREATE POLICY "Partners can update draft donors"
ON public.donors FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.partners
        WHERE partners.id = donors.partner_id
        AND partners.user_id = auth.uid()
    )
    AND status = 'draft'
);

CREATE POLICY "Admins can view all donors"
ON public.donors FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all donors"
ON public.donors FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for documents
CREATE POLICY "Partners can view their donor documents"
ON public.documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.donors
        JOIN public.partners ON partners.id = donors.partner_id
        WHERE donors.id = documents.donor_id
        AND partners.user_id = auth.uid()
    )
);

CREATE POLICY "Partners can upload documents"
ON public.documents FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.donors
        JOIN public.partners ON partners.id = donors.partner_id
        WHERE donors.id = donor_id
        AND partners.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
);

CREATE POLICY "Admins can view all documents"
ON public.documents FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Storage policies for donor-documents bucket
CREATE POLICY "Partners can upload to their donor folders"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'donor-documents'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Partners can view their donor documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'donor-documents'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Admins can view all documents in bucket"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'donor-documents'
    AND public.has_role(auth.uid(), 'admin')
);

-- Function to auto-generate donor code
CREATE OR REPLACE FUNCTION public.generate_donor_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.donor_code IS NULL THEN
        NEW.donor_code := 'DN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_donor_code
BEFORE INSERT ON public.donors
FOR EACH ROW
EXECUTE FUNCTION public.generate_donor_code();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partners_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_donors_updated_at
BEFORE UPDATE ON public.donors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();