-- Drop and recreate the recipe_nutrition view with correct baker's percentage calculation
DROP VIEW IF EXISTS public.recipe_nutrition;

CREATE VIEW public.recipe_nutrition AS
WITH recipe_totals AS (
  SELECT 
    r.id AS recipe_id,
    r.name AS recipe_name,
    r.baking_ratio,
    r.process_losses,
    -- Sum of all baker percentages (for 100g of flour, we get X g of raw dough)
    SUM(COALESCE(ri.baker_percentage, 0)) AS total_baker_percentage,
    -- Nutritional totals based on baker's percentage
    -- If ingredient is X% of flour weight, and we have 100g flour base, ingredient weight = X grams
    -- Nutritional values in raw_materials are per 100g, so we need: (X grams * value) / 100
    SUM(COALESCE(rm.energy_kcal, 0) * COALESCE(ri.baker_percentage, 0) / 100) AS total_energy_kcal,
    SUM(COALESCE(rm.energy_kj, 0) * COALESCE(ri.baker_percentage, 0) / 100) AS total_energy_kj,
    SUM(COALESCE(rm.fat, 0) * COALESCE(ri.baker_percentage, 0) / 100) AS total_fat,
    SUM(COALESCE(rm.saturated_fat, 0) * COALESCE(ri.baker_percentage, 0) / 100) AS total_saturated_fat,
    SUM(COALESCE(rm.carbohydrates, 0) * COALESCE(ri.baker_percentage, 0) / 100) AS total_carbohydrates,
    SUM(COALESCE(rm.sugars, 0) * COALESCE(ri.baker_percentage, 0) / 100) AS total_sugars,
    SUM(COALESCE(rm.fiber, 0) * COALESCE(ri.baker_percentage, 0) / 100) AS total_fiber,
    SUM(COALESCE(rm.protein, 0) * COALESCE(ri.baker_percentage, 0) / 100) AS total_protein,
    SUM(COALESCE(rm.salt, 0) * COALESCE(ri.baker_percentage, 0) / 100) AS total_salt
  FROM recipes r
  LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
  LEFT JOIN raw_materials rm ON rm.id = ri.raw_material_id
  GROUP BY r.id, r.name, r.baking_ratio, r.process_losses
)
SELECT 
  recipe_id,
  recipe_name,
  -- Keep for backward compatibility
  NULL::numeric AS yield_quantity,
  NULL::text AS yield_unit,
  -- Total nutritional values (for 100g flour base)
  ROUND(total_energy_kcal, 2) AS total_energy_kcal,
  ROUND(total_energy_kj, 2) AS total_energy_kj,
  ROUND(total_fat, 2) AS total_fat,
  ROUND(total_saturated_fat, 2) AS total_saturated_fat,
  ROUND(total_carbohydrates, 2) AS total_carbohydrates,
  ROUND(total_sugars, 2) AS total_sugars,
  ROUND(total_fiber, 2) AS total_fiber,
  ROUND(total_protein, 2) AS total_protein,
  ROUND(total_salt, 2) AS total_salt,
  -- Per 100g of FINISHED product
  -- Raw dough weight = total_baker_percentage grams (for 100g flour base)
  -- Cooked weight = raw dough * baking_ratio * (1 - process_losses/100)
  -- Per 100g = total * 100 / cooked_weight
  CASE 
    WHEN total_baker_percentage > 0 AND COALESCE(baking_ratio, 0.9) > 0 THEN
      ROUND(total_energy_kcal * 100 / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1 - COALESCE(process_losses, 0) / 100)), 2)
    ELSE NULL
  END AS per_100g_energy_kcal,
  CASE 
    WHEN total_baker_percentage > 0 AND COALESCE(baking_ratio, 0.9) > 0 THEN
      ROUND(total_energy_kj * 100 / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1 - COALESCE(process_losses, 0) / 100)), 2)
    ELSE NULL
  END AS per_100g_energy_kj,
  CASE 
    WHEN total_baker_percentage > 0 AND COALESCE(baking_ratio, 0.9) > 0 THEN
      ROUND(total_fat * 100 / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1 - COALESCE(process_losses, 0) / 100)), 2)
    ELSE NULL
  END AS per_100g_fat,
  CASE 
    WHEN total_baker_percentage > 0 AND COALESCE(baking_ratio, 0.9) > 0 THEN
      ROUND(total_saturated_fat * 100 / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1 - COALESCE(process_losses, 0) / 100)), 2)
    ELSE NULL
  END AS per_100g_saturated_fat,
  CASE 
    WHEN total_baker_percentage > 0 AND COALESCE(baking_ratio, 0.9) > 0 THEN
      ROUND(total_carbohydrates * 100 / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1 - COALESCE(process_losses, 0) / 100)), 2)
    ELSE NULL
  END AS per_100g_carbohydrates,
  CASE 
    WHEN total_baker_percentage > 0 AND COALESCE(baking_ratio, 0.9) > 0 THEN
      ROUND(total_sugars * 100 / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1 - COALESCE(process_losses, 0) / 100)), 2)
    ELSE NULL
  END AS per_100g_sugars,
  CASE 
    WHEN total_baker_percentage > 0 AND COALESCE(baking_ratio, 0.9) > 0 THEN
      ROUND(total_fiber * 100 / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1 - COALESCE(process_losses, 0) / 100)), 2)
    ELSE NULL
  END AS per_100g_fiber,
  CASE 
    WHEN total_baker_percentage > 0 AND COALESCE(baking_ratio, 0.9) > 0 THEN
      ROUND(total_protein * 100 / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1 - COALESCE(process_losses, 0) / 100)), 2)
    ELSE NULL
  END AS per_100g_protein,
  CASE 
    WHEN total_baker_percentage > 0 AND COALESCE(baking_ratio, 0.9) > 0 THEN
      ROUND(total_salt * 100 / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1 - COALESCE(process_losses, 0) / 100)), 2)
    ELSE NULL
  END AS per_100g_salt
FROM recipe_totals;