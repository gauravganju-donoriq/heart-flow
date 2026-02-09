
-- Create screening_guidelines table
CREATE TABLE public.screening_guidelines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create screening_results table
CREATE TABLE public.screening_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id uuid NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  verdict text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  reasoning text NOT NULL DEFAULT '',
  concerns jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_used text NOT NULL DEFAULT '',
  guidelines_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.screening_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_results ENABLE ROW LEVEL SECURITY;

-- RLS for screening_guidelines: admin-only
CREATE POLICY "Admins can view screening guidelines"
  ON public.screening_guidelines FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert screening guidelines"
  ON public.screening_guidelines FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update screening guidelines"
  ON public.screening_guidelines FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete screening guidelines"
  ON public.screening_guidelines FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS for screening_results: admin-only
CREATE POLICY "Admins can view screening results"
  ON public.screening_results FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert screening results"
  ON public.screening_results FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on screening_guidelines
CREATE TRIGGER update_screening_guidelines_updated_at
  BEFORE UPDATE ON public.screening_guidelines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
