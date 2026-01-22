-- Add fields for purchase unit management and density conversion
ALTER TABLE public.raw_materials
ADD COLUMN IF NOT EXISTS purchase_unit text DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS purchase_price numeric,
ADD COLUMN IF NOT EXISTS density numeric;

-- Add comment for clarity
COMMENT ON COLUMN public.raw_materials.purchase_unit IS 'Unit of purchase: kg, L, or piece';
COMMENT ON COLUMN public.raw_materials.purchase_price IS 'Original purchase price in the purchase unit';
COMMENT ON COLUMN public.raw_materials.density IS 'Density in kg/L, required for liquid materials';
COMMENT ON COLUMN public.raw_materials.price IS 'Reference price in €/kg for all calculations';
COMMENT ON COLUMN public.raw_materials.price_unit IS 'Always kg for reference calculations';

-- Migrate existing data: copy current price to purchase_price where not set
UPDATE public.raw_materials 
SET purchase_price = price,
    purchase_unit = COALESCE(price_unit, 'kg')
WHERE purchase_price IS NULL;