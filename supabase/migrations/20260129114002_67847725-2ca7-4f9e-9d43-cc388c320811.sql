-- Add INCO declaration fields to recipes table for intermediate products
ALTER TABLE public.recipes 
ADD COLUMN inco_declaration_mode TEXT DEFAULT 'detailed' CHECK (inco_declaration_mode IN ('simple', 'detailed')),
ADD COLUMN inco_name TEXT;

-- Add INCO name field to raw_materials table
ALTER TABLE public.raw_materials 
ADD COLUMN inco_name TEXT;

COMMENT ON COLUMN public.recipes.inco_declaration_mode IS 'Mode de déclaration INCO pour les PI: simple (nom générique) ou detailed (décomposition)';
COMMENT ON COLUMN public.recipes.inco_name IS 'Nom INCO utilisé quand le mode est simple (ex: pâte fermentée)';
COMMENT ON COLUMN public.raw_materials.inco_name IS 'Nom INCO pour l''étiquetage (ex: farine de blé au lieu de Harvest Queen)';