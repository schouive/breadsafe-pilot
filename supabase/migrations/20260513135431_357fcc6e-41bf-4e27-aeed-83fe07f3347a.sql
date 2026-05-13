
-- 1. Create product_sheet_packagings table
CREATE TABLE public.product_sheet_packagings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_sheet_id uuid NOT NULL REFERENCES public.product_sheets(id) ON DELETE CASCADE,
  packaging_code text NOT NULL CHECK (packaging_code = ANY (ARRAY['U01','C04','C05','C18','C24','PAL'])),
  erp_code text NOT NULL,
  erp_label text NOT NULL,
  barcode_value text,
  temperature_state text NOT NULL DEFAULT 'FR' CHECK (temperature_state = ANY (ARRAY['FR','FZ'])),
  slicing_state text NOT NULL DEFAULT 'WHO' CHECK (slicing_state = ANY (ARRAY['SLI','WHO'])),
  pieces_per_carton integer,
  cartons_per_layer integer,
  layers_per_pallet integer,
  carton_weight numeric,
  carton_dimensions text,
  template_id uuid REFERENCES public.label_templates(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  print_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_sheet_id, erp_code)
);

CREATE INDEX idx_psp_product_sheet ON public.product_sheet_packagings(product_sheet_id);
CREATE INDEX idx_psp_active ON public.product_sheet_packagings(active);

-- Trigger updated_at
CREATE TRIGGER trg_psp_updated_at
BEFORE UPDATE ON public.product_sheet_packagings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. RLS
ALTER TABLE public.product_sheet_packagings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin bureau manage psp"
ON public.product_sheet_packagings
FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

CREATE POLICY "Authenticated view psp"
ON public.product_sheet_packagings
FOR SELECT TO authenticated
USING (true);

-- 3. Migrate existing erp_articles -> product_sheet_packagings
INSERT INTO public.product_sheet_packagings (
  product_sheet_id, packaging_code, erp_code, erp_label, barcode_value,
  temperature_state, slicing_state, active
)
SELECT
  pm.product_sheet_id,
  ea.packaging_code,
  ea.erp_code,
  ea.erp_label,
  ea.barcode_value,
  ea.temperature_state,
  ea.slicing_state,
  ea.active
FROM public.erp_articles ea
JOIN public.products_master pm ON pm.id = ea.product_id
WHERE pm.product_sheet_id IS NOT NULL
ON CONFLICT (product_sheet_id, erp_code) DO NOTHING;

-- 4. Add packaging_id on print_program_items, populate from erp_article_id
ALTER TABLE public.print_program_items
  ADD COLUMN packaging_id uuid REFERENCES public.product_sheet_packagings(id) ON DELETE CASCADE;

UPDATE public.print_program_items ppi
SET packaging_id = psp.id
FROM public.erp_articles ea
JOIN public.products_master pm ON pm.id = ea.product_id
JOIN public.product_sheet_packagings psp
  ON psp.product_sheet_id = pm.product_sheet_id
 AND psp.erp_code = ea.erp_code
WHERE ppi.erp_article_id = ea.id;

-- 5. Drop now-obsolete tables (cascade drops FKs and dependent objects)
ALTER TABLE public.print_program_items DROP COLUMN IF EXISTS erp_article_id;
DROP VIEW IF EXISTS public.product_label_view CASCADE;
DROP TABLE IF EXISTS public.article_templates CASCADE;
DROP TABLE IF EXISTS public.erp_articles CASCADE;
DROP TABLE IF EXISTS public.products_master CASCADE;
DROP TABLE IF EXISTS public.nutrition_profiles CASCADE;
