
-- Add all 21 missing screening columns to donors table
ALTER TABLE public.donors
  ADD COLUMN call_type text,
  ADD COLUMN caller_name text,
  ADD COLUMN donor_age integer,
  ADD COLUMN time_of_death text,
  ADD COLUMN death_type text,
  ADD COLUMN death_timezone text,
  ADD COLUMN clinical_course text,
  ADD COLUMN height_inches numeric,
  ADD COLUMN weight_kgs numeric,
  ADD COLUMN medical_history text,
  ADD COLUMN high_risk_notes text,
  ADD COLUMN donor_accepted text,
  ADD COLUMN hv_heart_valves boolean,
  ADD COLUMN hv_pathology_request text,
  ADD COLUMN ai_aorto_iliac boolean,
  ADD COLUMN fm_femoral boolean,
  ADD COLUMN sv_saphenous_vein boolean,
  ADD COLUMN has_autopsy boolean,
  ADD COLUMN external_donor_id text,
  ADD COLUMN is_prescreen_update boolean,
  ADD COLUMN courier_update text;
