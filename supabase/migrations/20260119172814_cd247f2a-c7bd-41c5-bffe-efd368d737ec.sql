-- Add price columns to raw_materials
ALTER TABLE public.raw_materials
ADD COLUMN IF NOT EXISTS price numeric,
ADD COLUMN IF NOT EXISTS price_unit text DEFAULT 'kg';