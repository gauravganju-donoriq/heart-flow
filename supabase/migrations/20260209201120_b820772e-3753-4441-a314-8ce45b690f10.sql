
-- Add DIN column to donors table
ALTER TABLE public.donors ADD COLUMN din TEXT UNIQUE;

-- Create function to auto-generate DIN on submission
CREATE OR REPLACE FUNCTION public.generate_din()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seq_num INTEGER;
  today_str TEXT;
BEGIN
  -- Only generate DIN when status transitions to 'submitted' and din is not yet set
  IF NEW.status = 'submitted' AND (OLD.status IS DISTINCT FROM 'submitted') AND NEW.din IS NULL THEN
    today_str := TO_CHAR(NOW(), 'YYMMDD');
    
    -- Count existing donors submitted today to determine sequence
    SELECT COUNT(*) + 1 INTO seq_num
    FROM public.donors
    WHERE din LIKE 'DIN-' || today_str || '-%';
    
    NEW.din := 'DIN-' || today_str || '-' || LPAD(seq_num::TEXT, 4, '0');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for DIN generation
CREATE TRIGGER set_din_on_submit
BEFORE UPDATE ON public.donors
FOR EACH ROW
EXECUTE FUNCTION public.generate_din();

-- Also handle INSERT with status='submitted' (e.g., admin creating a submitted donor)
CREATE TRIGGER set_din_on_insert
BEFORE INSERT ON public.donors
FOR EACH ROW
EXECUTE FUNCTION public.generate_din();
