-- Add is_active column to partners table for deactivation support
ALTER TABLE public.partners ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Create index for filtering active partners
CREATE INDEX idx_partners_is_active ON public.partners(is_active);