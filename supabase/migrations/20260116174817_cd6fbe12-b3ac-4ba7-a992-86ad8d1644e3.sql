-- Add requires_dlc_check column to raw_materials table
ALTER TABLE public.raw_materials 
ADD COLUMN requires_dlc_check boolean NOT NULL DEFAULT false;