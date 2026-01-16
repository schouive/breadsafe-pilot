-- Add preventive_action column to non_conformities table
ALTER TABLE public.non_conformities 
ADD COLUMN preventive_action TEXT NULL;