-- Add new fields to product_sheets for complete FT functionality
-- Snapshot fields to freeze recipe data at creation time
ALTER TABLE public.product_sheets 
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS product_reference text,
ADD COLUMN IF NOT EXISTS pieces_per_carton integer,
ADD COLUMN IF NOT EXISTS cartons_per_layer integer,
ADD COLUMN IF NOT EXISTS layers_per_pallet integer,
ADD COLUMN IF NOT EXISTS carton_dimensions text,
ADD COLUMN IF NOT EXISTS carton_weight numeric,
ADD COLUMN IF NOT EXISTS thawing_instructions text,
ADD COLUMN IF NOT EXISTS quality_comment text,
ADD COLUMN IF NOT EXISTS product_image_url text,
ADD COLUMN IF NOT EXISTS dlc_ddm_type text DEFAULT 'DLC',
ADD COLUMN IF NOT EXISTS dlc_ddm_days integer,
ADD COLUMN IF NOT EXISTS snapshot_recipe_name text,
ADD COLUMN IF NOT EXISTS snapshot_recipe_code text,
ADD COLUMN IF NOT EXISTS snapshot_ingredients jsonb,
ADD COLUMN IF NOT EXISTS snapshot_allergens jsonb,
ADD COLUMN IF NOT EXISTS snapshot_nutrition jsonb,
ADD COLUMN IF NOT EXISTS snapshot_created_at timestamp with time zone DEFAULT now();

-- Add constraint for dlc_ddm_type
ALTER TABLE public.product_sheets 
DROP CONSTRAINT IF EXISTS product_sheets_dlc_ddm_type_check;

ALTER TABLE public.product_sheets 
ADD CONSTRAINT product_sheets_dlc_ddm_type_check 
CHECK (dlc_ddm_type IN ('DLC', 'DDM'));

-- Create index for version tracking
CREATE INDEX IF NOT EXISTS idx_product_sheets_recipe_version 
ON public.product_sheets(recipe_id, version);

-- Comment the table for documentation
COMMENT ON TABLE public.product_sheets IS 'Fiches techniques produits avec snapshot figé des données recette';