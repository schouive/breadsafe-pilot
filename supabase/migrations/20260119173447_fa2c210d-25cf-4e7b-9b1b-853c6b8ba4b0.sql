-- Ajouter les colonnes pour la logique boulangère aux recettes
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'validated')),
ADD COLUMN IF NOT EXISTS reference_flour_id uuid REFERENCES public.raw_materials(id),
ADD COLUMN IF NOT EXISTS baking_ratio numeric DEFAULT 0.90,
ADD COLUMN IF NOT EXISTS process_losses numeric DEFAULT 0;

-- Modifier recipe_ingredients pour les pourcentages boulangers
ALTER TABLE public.recipe_ingredients
ADD COLUMN IF NOT EXISTS baker_percentage numeric;

-- Créer la table pour les données d'étiquette
CREATE TABLE IF NOT EXISTS public.label_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  product_reference text,
  commercial_designation text,
  pieces_per_carton integer,
  cartons_per_layer integer,
  cartons_per_pallet integer,
  net_weight numeric,
  net_weight_unit text DEFAULT 'g',
  carton_format text,
  usage_instructions text,
  thawing_instructions text,
  storage_conditions text,
  product_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recipe_id)
);

-- Enable RLS
ALTER TABLE public.label_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for label_data
CREATE POLICY "Admins can manage label data"
ON public.label_data
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Quality assistants can view label data"
ON public.label_data
FOR SELECT
USING (has_role(auth.uid(), 'quality_assistant'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_label_data_updated_at
BEFORE UPDATE ON public.label_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Créer une vue pour les calculs nutritionnels par recette (logique boulangère)
CREATE OR REPLACE VIEW public.recipe_baker_nutrition
WITH (security_invoker = on)
AS
SELECT 
  r.id AS recipe_id,
  r.name AS recipe_name,
  r.baking_ratio,
  r.process_losses,
  -- Somme des pourcentages boulangers (poids total cru)
  COALESCE(SUM(ri.baker_percentage), 0) AS total_baker_percentage,
  -- Nutritions totales (basées sur les pourcentages boulangers, pour 100g de farine de référence)
  COALESCE(SUM(ri.baker_percentage * rm.energy_kcal / 100), 0) AS total_energy_kcal,
  COALESCE(SUM(ri.baker_percentage * rm.energy_kj / 100), 0) AS total_energy_kj,
  COALESCE(SUM(ri.baker_percentage * rm.fat / 100), 0) AS total_fat,
  COALESCE(SUM(ri.baker_percentage * rm.saturated_fat / 100), 0) AS total_saturated_fat,
  COALESCE(SUM(ri.baker_percentage * rm.carbohydrates / 100), 0) AS total_carbohydrates,
  COALESCE(SUM(ri.baker_percentage * rm.sugars / 100), 0) AS total_sugars,
  COALESCE(SUM(ri.baker_percentage * rm.fiber / 100), 0) AS total_fiber,
  COALESCE(SUM(ri.baker_percentage * rm.protein / 100), 0) AS total_protein,
  COALESCE(SUM(ri.baker_percentage * rm.salt / 100), 0) AS total_salt,
  -- Coût total (pour 100g de farine de référence)
  COALESCE(SUM(ri.baker_percentage * COALESCE(rm.price, 0) / 100), 0) AS total_cost
FROM recipes r
LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
LEFT JOIN raw_materials rm ON rm.id = ri.raw_material_id
GROUP BY r.id, r.name, r.baking_ratio, r.process_losses;