
-- Attach the donor_code trigger
CREATE TRIGGER generate_donor_code_trigger
  BEFORE INSERT ON public.donors
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_donor_code();

-- Attach the DIN trigger
CREATE TRIGGER generate_din_trigger
  BEFORE UPDATE ON public.donors
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_din();
