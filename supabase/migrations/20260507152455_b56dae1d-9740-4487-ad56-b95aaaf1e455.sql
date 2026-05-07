
-- Drop existing view if present (incompatible columns)
DROP VIEW IF EXISTS public.product_label_view;

-- 1. nutrition_profiles
CREATE TABLE public.nutrition_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  energy_kj numeric,
  energy_kcal numeric,
  fat numeric,
  saturated_fat numeric,
  carbohydrates numeric,
  sugars numeric,
  fiber numeric,
  protein numeric,
  salt numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view nutrition profiles" ON public.nutrition_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin bureau manage nutrition profiles" ON public.nutrition_profiles FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));
CREATE TRIGGER trg_nutrition_profiles_updated BEFORE UPDATE ON public.nutrition_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. products_master
CREATE TABLE public.products_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_base text NOT NULL UNIQUE,
  label text NOT NULL,
  family_id uuid REFERENCES public.product_families(id),
  recipe_id uuid REFERENCES public.recipes(id),
  nutrition_profile_id uuid REFERENCES public.nutrition_profiles(id),
  product_sheet_id uuid REFERENCES public.product_sheets(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_master_family ON public.products_master(family_id);
CREATE INDEX idx_products_master_recipe ON public.products_master(recipe_id);
ALTER TABLE public.products_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view products master" ON public.products_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin bureau manage products master" ON public.products_master FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));
CREATE TRIGGER trg_products_master_updated BEFORE UPDATE ON public.products_master
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. erp_articles
CREATE TABLE public.erp_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products_master(id) ON DELETE RESTRICT,
  erp_code text NOT NULL UNIQUE,
  erp_label text NOT NULL,
  temperature_state text NOT NULL CHECK (temperature_state IN ('FR','FZ')),
  slicing_state text NOT NULL CHECK (slicing_state IN ('SLI','WHO')),
  packaging_code text NOT NULL CHECK (packaging_code IN ('U01','C05','C24','PAL')),
  barcode_value text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_erp_articles_product ON public.erp_articles(product_id);
CREATE INDEX idx_erp_articles_active ON public.erp_articles(active);
ALTER TABLE public.erp_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view erp articles" ON public.erp_articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin bureau manage erp articles" ON public.erp_articles FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));
CREATE TRIGGER trg_erp_articles_updated BEFORE UPDATE ON public.erp_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. article_templates
CREATE TABLE public.article_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_article_id uuid NOT NULL REFERENCES public.erp_articles(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.label_templates(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (erp_article_id, template_id)
);
CREATE INDEX idx_article_templates_article ON public.article_templates(erp_article_id);
ALTER TABLE public.article_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view article templates" ON public.article_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin bureau manage article templates" ON public.article_templates FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

-- 5. Migration des données depuis print_products
INSERT INTO public.products_master (sku_base, label, family_id, recipe_id, active, created_at)
SELECT pp.sku_base, pp.label, pp.family_id, pp.recipe_id, COALESCE(pp.active, true), pp.created_at
FROM public.print_products pp
WHERE NOT EXISTS (SELECT 1 FROM public.products_master pm WHERE pm.sku_base = pp.sku_base);

-- 6. Migration des variants vers erp_articles
INSERT INTO public.erp_articles (product_id, erp_code, erp_label, temperature_state, slicing_state, packaging_code, active, created_at)
SELECT pm.id,
  pm.sku_base || '-' || v.temperature || '-' || v.slicing || '-' || v.packaging,
  pm.label || ' ' || v.temperature || '/' || v.slicing || '/' || v.packaging,
  v.temperature, v.slicing, v.packaging,
  COALESCE(v.is_active, true), v.created_at
FROM public.print_product_variants v
JOIN public.print_products pp ON pp.id = v.product_id
JOIN public.products_master pm ON pm.sku_base = pp.sku_base
WHERE v.temperature IN ('FR','FZ') AND v.slicing IN ('SLI','WHO') AND v.packaging IN ('U01','C05','C24','PAL')
ON CONFLICT (erp_code) DO NOTHING;

-- 7. Création des liens article_templates depuis variants
INSERT INTO public.article_templates (erp_article_id, template_id)
SELECT DISTINCT ea.id, lt.id
FROM public.print_product_variants v
JOIN public.print_products pp ON pp.id = v.product_id
JOIN public.products_master pm ON pm.sku_base = pp.sku_base
JOIN public.erp_articles ea ON ea.product_id = pm.id AND ea.temperature_state = v.temperature AND ea.slicing_state = v.slicing AND ea.packaging_code = v.packaging
JOIN public.label_templates lt ON lt.template_name = v.template_name OR lt.template_code = v.template_name
ON CONFLICT DO NOTHING;

-- 8. Vue product_label_view
CREATE VIEW public.product_label_view AS
SELECT
  ea.id AS erp_article_id,
  ea.erp_code, ea.erp_label,
  ea.temperature_state, ea.slicing_state, ea.packaging_code, ea.barcode_value, ea.active,
  pm.id AS product_master_id, pm.sku_base, pm.label AS product_label,
  f.code AS family_code, f.label AS family_label,
  r.id AS recipe_id, r.name AS recipe_name,
  np.energy_kj, np.energy_kcal, np.fat, np.saturated_fat,
  np.carbohydrates, np.sugars, np.fiber, np.protein, np.salt,
  ps.id AS product_sheet_id, ps.inco_html, ps.allergen_statement, ps.snapshot_allergens,
  lt.id AS template_id, lt.template_code, lt.template_name, lt.zpl_filename
FROM public.erp_articles ea
JOIN public.products_master pm ON pm.id = ea.product_id
LEFT JOIN public.product_families f ON f.id = pm.family_id
LEFT JOIN public.recipes r ON r.id = pm.recipe_id
LEFT JOIN public.nutrition_profiles np ON np.id = pm.nutrition_profile_id
LEFT JOIN public.product_sheets ps ON ps.id = pm.product_sheet_id
LEFT JOIN public.article_templates at ON at.erp_article_id = ea.id
LEFT JOIN public.label_templates lt ON lt.id = at.template_id;
