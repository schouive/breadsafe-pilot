-- Add type column to raw_materials for flour vs other ingredient distinction
ALTER TABLE public.raw_materials
ADD COLUMN IF NOT EXISTS type text DEFAULT 'ingredient';

-- Add comment explaining valid values
COMMENT ON COLUMN public.raw_materials.type IS 'Type of raw material: farine (flour) or ingredient (other ingredients)';

-- Update the recipe_baker_nutrition view to handle multi-flour recipes
DROP VIEW IF EXISTS public.recipe_baker_nutrition;

CREATE OR REPLACE VIEW public.recipe_baker_nutrition
WITH (security_invoker = on)
AS
SELECT
  r.id AS recipe_id,
  r.name AS recipe_name,
  r.baking_ratio,
  r.process_losses,
  COALESCE(SUM(ri.baker_percentage), 0) AS total_baker_percentage,
  COALESCE(SUM(
    CASE WHEN rm.type = 'farine' THEN ri.baker_percentage ELSE 0 END
  ), 0) AS total_flour_percentage,
  COALESCE(SUM(
    CASE 
      WHEN rm.price IS NOT NULL AND ri.baker_percentage IS NOT NULL 
      THEN (ri.baker_percentage / 100.0) * rm.price 
      ELSE 0 
    END
  ), 0) AS total_cost,
  COALESCE(SUM(
    CASE 
      WHEN rm.energy_kj IS NOT NULL AND ri.baker_percentage IS NOT NULL 
      THEN (ri.baker_percentage / 100.0) * rm.energy_kj 
      ELSE 0 
    END
  ), 0) AS total_energy_kj,
  COALESCE(SUM(
    CASE 
      WHEN rm.energy_kcal IS NOT NULL AND ri.baker_percentage IS NOT NULL 
      THEN (ri.baker_percentage / 100.0) * rm.energy_kcal 
      ELSE 0 
    END
  ), 0) AS total_energy_kcal,
  COALESCE(SUM(
    CASE 
      WHEN rm.fat IS NOT NULL AND ri.baker_percentage IS NOT NULL 
      THEN (ri.baker_percentage / 100.0) * rm.fat 
      ELSE 0 
    END
  ), 0) AS total_fat,
  COALESCE(SUM(
    CASE 
      WHEN rm.saturated_fat IS NOT NULL AND ri.baker_percentage IS NOT NULL 
      THEN (ri.baker_percentage / 100.0) * rm.saturated_fat 
      ELSE 0 
    END
  ), 0) AS total_saturated_fat,
  COALESCE(SUM(
    CASE 
      WHEN rm.carbohydrates IS NOT NULL AND ri.baker_percentage IS NOT NULL 
      THEN (ri.baker_percentage / 100.0) * rm.carbohydrates 
      ELSE 0 
    END
  ), 0) AS total_carbohydrates,
  COALESCE(SUM(
    CASE 
      WHEN rm.sugars IS NOT NULL AND ri.baker_percentage IS NOT NULL 
      THEN (ri.baker_percentage / 100.0) * rm.sugars 
      ELSE 0 
    END
  ), 0) AS total_sugars,
  COALESCE(SUM(
    CASE 
      WHEN rm.fiber IS NOT NULL AND ri.baker_percentage IS NOT NULL 
      THEN (ri.baker_percentage / 100.0) * rm.fiber 
      ELSE 0 
    END
  ), 0) AS total_fiber,
  COALESCE(SUM(
    CASE 
      WHEN rm.protein IS NOT NULL AND ri.baker_percentage IS NOT NULL 
      THEN (ri.baker_percentage / 100.0) * rm.protein 
      ELSE 0 
    END
  ), 0) AS total_protein,
  COALESCE(SUM(
    CASE 
      WHEN rm.salt IS NOT NULL AND ri.baker_percentage IS NOT NULL 
      THEN (ri.baker_percentage / 100.0) * rm.salt 
      ELSE 0 
    END
  ), 0) AS total_salt
FROM recipes r
LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
LEFT JOIN raw_materials rm ON rm.id = ri.raw_material_id
GROUP BY r.id, r.name, r.baking_ratio, r.process_losses;