-- Make supplier_id optional (nullable) for raw_materials
ALTER TABLE public.raw_materials 
ALTER COLUMN supplier_id DROP NOT NULL;