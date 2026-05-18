ALTER TABLE public.recipes DROP COLUMN IF EXISTS reference_flour_id;
ALTER TABLE public.recipes DROP COLUMN IF EXISTS category;
ALTER TABLE public.recipes DROP COLUMN IF EXISTS preparation_notes;
ALTER TABLE public.recipe_ingredients DROP COLUMN IF EXISTS notes;
ALTER TABLE public.product_sheets DROP COLUMN IF EXISTS brand;
ALTER TABLE public.product_sheets DROP COLUMN IF EXISTS barcode;
ALTER TABLE public.product_sheets DROP COLUMN IF EXISTS origin_country;
ALTER TABLE public.product_sheets DROP COLUMN IF EXISTS certifications;