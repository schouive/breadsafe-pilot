-- Add new columns for raw materials
ALTER TABLE public.raw_materials 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS composition text,
ADD COLUMN IF NOT EXISTS allergens_secondary text[] DEFAULT '{}'::text[];