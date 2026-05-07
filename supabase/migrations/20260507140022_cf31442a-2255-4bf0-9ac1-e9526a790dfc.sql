
-- 1. Familles de produits
CREATE TABLE public.product_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view families" ON public.product_families FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin bureau manage families" ON public.product_families FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

INSERT INTO public.product_families (code, label) VALUES
  ('BUN', 'Buns'),
  ('BAG', 'Bagels'),
  ('HDG', 'Hot-dogs'),
  ('PDM', 'Pains de mie'),
  ('PLQ', 'Plaques'),
  ('SPC', 'Spéciaux');

-- 2. Allergènes (référentiel normalisé)
CREATE TABLE public.allergens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.allergens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view allergens" ON public.allergens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin bureau manage allergens" ON public.allergens FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]));

INSERT INTO public.allergens (code, label) VALUES
  ('GLUTEN', 'Gluten'),
  ('CRUSTACES', 'Crustacés'),
  ('OEUF', 'Œufs'),
  ('POISSON', 'Poissons'),
  ('ARACHIDE', 'Arachides'),
  ('SOJA', 'Soja'),
  ('LAIT', 'Lait'),
  ('FRUITS_COQUE', 'Fruits à coque'),
  ('CELERI', 'Céleri'),
  ('MOUTARDE', 'Moutarde'),
  ('SESAME', 'Sésame'),
  ('SULFITES', 'Sulfites'),
  ('LUPIN', 'Lupin'),
  ('MOLLUSQUES', 'Mollusques');

-- 3. Types de conditionnement
CREATE TABLE public.packaging_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.packaging_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view packaging" ON public.packaging_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin bureau manage packaging" ON public.packaging_types FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

INSERT INTO public.packaging_types (code, label, quantity) VALUES
  ('U01', 'Unité', 1),
  ('C05', 'Carton de 5', 5),
  ('C24', 'Carton de 24', 24),
  ('PAL', 'Palette', 0);

-- 4. Templates Zebra
CREATE TABLE public.label_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code text UNIQUE NOT NULL,
  template_name text NOT NULL,
  zpl_filename text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.label_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view templates" ON public.label_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin bureau manage templates" ON public.label_templates FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

INSERT INTO public.label_templates (template_code, template_name, zpl_filename) VALUES
  ('PRODUCT_LABEL', 'Étiquette produit', 'product.zpl'),
  ('CARTON_LABEL', 'Étiquette carton', 'carton.zpl'),
  ('PALETTE_LABEL', 'Étiquette palette', 'palette.zpl');

-- 5. Enrichissement print_products
ALTER TABLE public.print_products
  ADD COLUMN family_id uuid REFERENCES public.product_families(id),
  ADD COLUMN recipe_id uuid REFERENCES public.recipes(id),
  ADD COLUMN product_sheet_id uuid REFERENCES public.product_sheets(id);

-- Backfill family_id depuis le champ texte family si possible
UPDATE public.print_products pp
SET family_id = pf.id
FROM public.product_families pf
WHERE pp.family = pf.code;

-- 6. Variant_templates : mapping variant + packaging -> template
ALTER TABLE public.print_product_variants
  ADD COLUMN packaging_id uuid REFERENCES public.packaging_types(id),
  ADD COLUMN template_id uuid REFERENCES public.label_templates(id);

UPDATE public.print_product_variants pv
SET packaging_id = pt.id
FROM public.packaging_types pt
WHERE pv.packaging = pt.code;

UPDATE public.print_product_variants
SET template_id = (SELECT id FROM public.label_templates WHERE template_code = 'PRODUCT_LABEL')
WHERE template_id IS NULL;

-- 7. Vue d'impression
CREATE OR REPLACE VIEW public.product_label_view AS
SELECT
  pp.id AS product_id,
  pp.sku_base,
  pp.old_code,
  pp.label AS product_label,
  pp.active,
  pf.code AS family_code,
  pf.label AS family_label,
  r.id AS recipe_id,
  r.code AS recipe_code,
  r.name AS recipe_name,
  ps.id AS product_sheet_id,
  ps.product_name AS sheet_product_name,
  ps.ingredients_declaration,
  ps.allergen_statement,
  ps.net_weight,
  ps.net_weight_unit,
  pv.id AS variant_id,
  pv.temperature,
  pv.slicing,
  pv.packaging AS packaging_code,
  pkg.label AS packaging_label,
  pkg.quantity AS packaging_quantity,
  lt.template_code,
  lt.template_name,
  lt.zpl_filename
FROM public.print_products pp
LEFT JOIN public.product_families pf ON pf.id = pp.family_id
LEFT JOIN public.recipes r ON r.id = pp.recipe_id
LEFT JOIN public.product_sheets ps ON ps.id = pp.product_sheet_id
LEFT JOIN public.print_product_variants pv ON pv.product_id = pp.id
LEFT JOIN public.packaging_types pkg ON pkg.id = pv.packaging_id
LEFT JOIN public.label_templates lt ON lt.id = pv.template_id;

-- 8. Trigger : empêcher impression si combinaison non autorisée
CREATE OR REPLACE FUNCTION public.validate_print_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lot_number IS NULL OR length(trim(NEW.lot_number)) = 0 THEN
    RAISE EXCEPTION 'Numéro de lot obligatoire';
  END IF;
  IF NEW.ddm IS NULL THEN
    RAISE EXCEPTION 'DDM obligatoire';
  END IF;
  IF NEW.variant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.print_product_variants
    WHERE id = NEW.variant_id AND product_id = NEW.product_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Combinaison produit/variante non autorisée';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_print_history ON public.print_history;
CREATE TRIGGER trg_validate_print_history
  BEFORE INSERT ON public.print_history
  FOR EACH ROW EXECUTE FUNCTION public.validate_print_history();
