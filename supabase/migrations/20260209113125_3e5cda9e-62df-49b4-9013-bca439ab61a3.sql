
-- Add slug column to partners
ALTER TABLE public.partners ADD COLUMN slug text UNIQUE;

-- Backfill existing partners with slugs from organization_name
UPDATE public.partners
SET slug = lower(regexp_replace(regexp_replace(organization_name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));

-- Make slug NOT NULL after backfill
ALTER TABLE public.partners ALTER COLUMN slug SET NOT NULL;

-- Allow public read of partner by slug (for login page branding)
CREATE POLICY "Anyone can read partner by slug"
ON public.partners
FOR SELECT
USING (true);
