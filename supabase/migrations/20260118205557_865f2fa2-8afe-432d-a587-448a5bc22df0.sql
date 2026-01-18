-- ============================================
-- MODULE PRODUITS & ÉTIQUETAGE - SCHEMA
-- ============================================

-- Ajouter les colonnes nutritionnelles à raw_materials
ALTER TABLE public.raw_materials
ADD COLUMN IF NOT EXISTS energy_kcal numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS energy_kj numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fat numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS saturated_fat numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS carbohydrates numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sugars numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fiber numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS protein numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS salt numeric DEFAULT NULL;

-- Table des recettes
CREATE TABLE public.recipes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text UNIQUE,
    description text,
    category text,
    yield_quantity numeric NOT NULL DEFAULT 1,
    yield_unit text NOT NULL DEFAULT 'kg',
    preparation_notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Table de liaison recette <-> matières premières
CREATE TABLE public.recipe_ingredients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
    quantity numeric NOT NULL,
    unit text NOT NULL DEFAULT 'kg',
    order_index integer NOT NULL DEFAULT 0,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(recipe_id, raw_material_id)
);

-- Table des fiches techniques produits
CREATE TABLE public.product_sheets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    brand text,
    barcode text,
    net_weight numeric,
    net_weight_unit text DEFAULT 'g',
    shelf_life_days integer,
    storage_instructions text,
    allergen_statement text,
    ingredients_declaration text,
    usage_instructions text,
    origin_country text,
    certifications text[],
    is_published boolean NOT NULL DEFAULT false,
    published_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Vue pour les valeurs nutritionnelles calculées des recettes
CREATE OR REPLACE VIEW public.recipe_nutrition AS
SELECT 
    r.id as recipe_id,
    r.name as recipe_name,
    r.yield_quantity,
    r.yield_unit,
    COALESCE(SUM(ri.quantity * rm.energy_kcal / 100), 0) as total_energy_kcal,
    COALESCE(SUM(ri.quantity * rm.energy_kj / 100), 0) as total_energy_kj,
    COALESCE(SUM(ri.quantity * rm.fat / 100), 0) as total_fat,
    COALESCE(SUM(ri.quantity * rm.saturated_fat / 100), 0) as total_saturated_fat,
    COALESCE(SUM(ri.quantity * rm.carbohydrates / 100), 0) as total_carbohydrates,
    COALESCE(SUM(ri.quantity * rm.sugars / 100), 0) as total_sugars,
    COALESCE(SUM(ri.quantity * rm.fiber / 100), 0) as total_fiber,
    COALESCE(SUM(ri.quantity * rm.protein / 100), 0) as total_protein,
    COALESCE(SUM(ri.quantity * rm.salt / 100), 0) as total_salt,
    -- Valeurs pour 100g
    CASE WHEN r.yield_quantity > 0 THEN COALESCE(SUM(ri.quantity * rm.energy_kcal / 100), 0) / r.yield_quantity * 0.1 ELSE 0 END as per_100g_energy_kcal,
    CASE WHEN r.yield_quantity > 0 THEN COALESCE(SUM(ri.quantity * rm.energy_kj / 100), 0) / r.yield_quantity * 0.1 ELSE 0 END as per_100g_energy_kj,
    CASE WHEN r.yield_quantity > 0 THEN COALESCE(SUM(ri.quantity * rm.fat / 100), 0) / r.yield_quantity * 0.1 ELSE 0 END as per_100g_fat,
    CASE WHEN r.yield_quantity > 0 THEN COALESCE(SUM(ri.quantity * rm.saturated_fat / 100), 0) / r.yield_quantity * 0.1 ELSE 0 END as per_100g_saturated_fat,
    CASE WHEN r.yield_quantity > 0 THEN COALESCE(SUM(ri.quantity * rm.carbohydrates / 100), 0) / r.yield_quantity * 0.1 ELSE 0 END as per_100g_carbohydrates,
    CASE WHEN r.yield_quantity > 0 THEN COALESCE(SUM(ri.quantity * rm.sugars / 100), 0) / r.yield_quantity * 0.1 ELSE 0 END as per_100g_sugars,
    CASE WHEN r.yield_quantity > 0 THEN COALESCE(SUM(ri.quantity * rm.fiber / 100), 0) / r.yield_quantity * 0.1 ELSE 0 END as per_100g_fiber,
    CASE WHEN r.yield_quantity > 0 THEN COALESCE(SUM(ri.quantity * rm.protein / 100), 0) / r.yield_quantity * 0.1 ELSE 0 END as per_100g_protein,
    CASE WHEN r.yield_quantity > 0 THEN COALESCE(SUM(ri.quantity * rm.salt / 100), 0) / r.yield_quantity * 0.1 ELSE 0 END as per_100g_salt
FROM public.recipes r
LEFT JOIN public.recipe_ingredients ri ON ri.recipe_id = r.id
LEFT JOIN public.raw_materials rm ON rm.id = ri.raw_material_id
GROUP BY r.id, r.name, r.yield_quantity, r.yield_unit;

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sheets ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour recipes (admin only pour modification, lecture pour quality_assistant)
CREATE POLICY "Admins can manage recipes"
ON public.recipes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Quality assistants can view recipes"
ON public.recipes FOR SELECT
USING (has_role(auth.uid(), 'quality_assistant'::app_role));

-- RLS Policies pour recipe_ingredients
CREATE POLICY "Admins can manage recipe ingredients"
ON public.recipe_ingredients FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Quality assistants can view recipe ingredients"
ON public.recipe_ingredients FOR SELECT
USING (has_role(auth.uid(), 'quality_assistant'::app_role));

-- RLS Policies pour product_sheets
CREATE POLICY "Admins can manage product sheets"
ON public.product_sheets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Quality assistants can view product sheets"
ON public.product_sheets FOR SELECT
USING (has_role(auth.uid(), 'quality_assistant'::app_role));

-- Triggers pour updated_at
CREATE TRIGGER update_recipes_updated_at
BEFORE UPDATE ON public.recipes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipe_ingredients_updated_at
BEFORE UPDATE ON public.recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_sheets_updated_at
BEFORE UPDATE ON public.product_sheets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();