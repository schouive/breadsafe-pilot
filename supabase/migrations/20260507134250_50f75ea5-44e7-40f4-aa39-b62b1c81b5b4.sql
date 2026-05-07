
-- Catalogue produits maîtres
CREATE TABLE public.print_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_code text,
  sku_base text NOT NULL UNIQUE,
  family text NOT NULL,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_print_products_search ON public.print_products (family, active);
CREATE INDEX idx_print_products_old_code ON public.print_products (old_code);

-- Variantes autorisées + template Zebra
CREATE TABLE public.print_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.print_products(id) ON DELETE CASCADE,
  temperature text NOT NULL CHECK (temperature IN ('FR','FZ')),
  slicing text NOT NULL CHECK (slicing IN ('SLI','WHO')),
  packaging text NOT NULL CHECK (packaging IN ('U01','C05','C24','PAL')),
  template_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, temperature, slicing, packaging)
);
CREATE INDEX idx_print_variants_product ON public.print_product_variants (product_id);

-- Historique impressions
CREATE TABLE public.print_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.print_products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.print_product_variants(id) ON DELETE SET NULL,
  final_sku text NOT NULL,
  sku_base text NOT NULL,
  old_code text,
  temperature text NOT NULL,
  slicing text NOT NULL,
  packaging text NOT NULL,
  template_name text NOT NULL,
  lot_number text NOT NULL,
  ddm date NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  operator_id uuid NOT NULL,
  printed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_print_history_operator ON public.print_history (operator_id, printed_at DESC);
CREATE INDEX idx_print_history_product ON public.print_history (product_id, printed_at DESC);

-- Favoris opérateur
CREATE TABLE public.print_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.print_products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(operator_id, product_id)
);
CREATE INDEX idx_print_favorites_operator ON public.print_favorites (operator_id);

-- RLS
ALTER TABLE public.print_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_favorites ENABLE ROW LEVEL SECURITY;

-- Products
CREATE POLICY "Authenticated can view print products" ON public.print_products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin bureau manage print products" ON public.print_products
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

-- Variants
CREATE POLICY "Authenticated can view print variants" ON public.print_product_variants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin bureau manage print variants" ON public.print_product_variants
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

-- History
CREATE POLICY "Authenticated can view print history" ON public.print_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators insert own print history" ON public.print_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = operator_id);
CREATE POLICY "Admin can delete print history" ON public.print_history
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Favorites
CREATE POLICY "Operator manage own favorites" ON public.print_favorites
  FOR ALL TO authenticated
  USING (auth.uid() = operator_id)
  WITH CHECK (auth.uid() = operator_id);

-- Trigger updated_at
CREATE TRIGGER trg_print_products_updated
  BEFORE UPDATE ON public.print_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
