
-- Fonction pour arrondir à N chiffres significatifs
CREATE OR REPLACE FUNCTION round_sig(val numeric, sig_digits integer)
RETURNS numeric AS $$
BEGIN
  IF val = 0 OR val IS NULL THEN RETURN val; END IF;
  RETURN round(val::numeric, sig_digits - 1 - floor(log10(abs(val)))::integer);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Recréer la vue recipe_nutrition avec arrondi à 2 chiffres significatifs
DROP VIEW IF EXISTS public.recipe_nutrition;

CREATE VIEW public.recipe_nutrition AS
WITH recipe_totals AS (
  SELECT r.id AS recipe_id,
    r.name AS recipe_name,
    r.baking_ratio,
    r.process_losses,
    sum(COALESCE(ri.baker_percentage, 0::numeric)) AS total_baker_percentage,
    sum(COALESCE(rm.energy_kcal, 0::numeric) * COALESCE(ri.baker_percentage, 0::numeric) / 100::numeric) AS total_energy_kcal,
    sum(COALESCE(rm.energy_kj, 0::numeric) * COALESCE(ri.baker_percentage, 0::numeric) / 100::numeric) AS total_energy_kj,
    sum(COALESCE(rm.fat, 0::numeric) * COALESCE(ri.baker_percentage, 0::numeric) / 100::numeric) AS total_fat,
    sum(COALESCE(rm.saturated_fat, 0::numeric) * COALESCE(ri.baker_percentage, 0::numeric) / 100::numeric) AS total_saturated_fat,
    sum(COALESCE(rm.carbohydrates, 0::numeric) * COALESCE(ri.baker_percentage, 0::numeric) / 100::numeric) AS total_carbohydrates,
    sum(COALESCE(rm.sugars, 0::numeric) * COALESCE(ri.baker_percentage, 0::numeric) / 100::numeric) AS total_sugars,
    sum(COALESCE(rm.fiber, 0::numeric) * COALESCE(ri.baker_percentage, 0::numeric) / 100::numeric) AS total_fiber,
    sum(COALESCE(rm.protein, 0::numeric) * COALESCE(ri.baker_percentage, 0::numeric) / 100::numeric) AS total_protein,
    sum(COALESCE(rm.salt, 0::numeric) * COALESCE(ri.baker_percentage, 0::numeric) / 100::numeric) AS total_salt
  FROM recipes r
    LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
    LEFT JOIN raw_materials rm ON rm.id = ri.raw_material_id
  GROUP BY r.id, r.name, r.baking_ratio, r.process_losses
)
SELECT recipe_id,
  recipe_name,
  NULL::numeric AS yield_quantity,
  NULL::text AS yield_unit,
  round_sig(total_energy_kcal, 2) AS total_energy_kcal,
  round_sig(total_energy_kj, 2) AS total_energy_kj,
  round_sig(total_fat, 2) AS total_fat,
  round_sig(total_saturated_fat, 2) AS total_saturated_fat,
  round_sig(total_carbohydrates, 2) AS total_carbohydrates,
  round_sig(total_sugars, 2) AS total_sugars,
  round_sig(total_fiber, 2) AS total_fiber,
  round_sig(total_protein, 2) AS total_protein,
  round_sig(total_salt, 2) AS total_salt,
  CASE
    WHEN total_baker_percentage > 0::numeric AND COALESCE(baking_ratio, 0.9) > 0::numeric
    THEN round_sig(total_energy_kcal * 100::numeric / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1::numeric - COALESCE(process_losses, 0::numeric) / 100::numeric)), 2)
    ELSE NULL::numeric
  END AS per_100g_energy_kcal,
  CASE
    WHEN total_baker_percentage > 0::numeric AND COALESCE(baking_ratio, 0.9) > 0::numeric
    THEN round_sig(total_energy_kj * 100::numeric / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1::numeric - COALESCE(process_losses, 0::numeric) / 100::numeric)), 2)
    ELSE NULL::numeric
  END AS per_100g_energy_kj,
  CASE
    WHEN total_baker_percentage > 0::numeric AND COALESCE(baking_ratio, 0.9) > 0::numeric
    THEN round_sig(total_fat * 100::numeric / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1::numeric - COALESCE(process_losses, 0::numeric) / 100::numeric)), 2)
    ELSE NULL::numeric
  END AS per_100g_fat,
  CASE
    WHEN total_baker_percentage > 0::numeric AND COALESCE(baking_ratio, 0.9) > 0::numeric
    THEN round_sig(total_saturated_fat * 100::numeric / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1::numeric - COALESCE(process_losses, 0::numeric) / 100::numeric)), 2)
    ELSE NULL::numeric
  END AS per_100g_saturated_fat,
  CASE
    WHEN total_baker_percentage > 0::numeric AND COALESCE(baking_ratio, 0.9) > 0::numeric
    THEN round_sig(total_carbohydrates * 100::numeric / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1::numeric - COALESCE(process_losses, 0::numeric) / 100::numeric)), 2)
    ELSE NULL::numeric
  END AS per_100g_carbohydrates,
  CASE
    WHEN total_baker_percentage > 0::numeric AND COALESCE(baking_ratio, 0.9) > 0::numeric
    THEN round_sig(total_sugars * 100::numeric / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1::numeric - COALESCE(process_losses, 0::numeric) / 100::numeric)), 2)
    ELSE NULL::numeric
  END AS per_100g_sugars,
  CASE
    WHEN total_baker_percentage > 0::numeric AND COALESCE(baking_ratio, 0.9) > 0::numeric
    THEN round_sig(total_fiber * 100::numeric / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1::numeric - COALESCE(process_losses, 0::numeric) / 100::numeric)), 2)
    ELSE NULL::numeric
  END AS per_100g_fiber,
  CASE
    WHEN total_baker_percentage > 0::numeric AND COALESCE(baking_ratio, 0.9) > 0::numeric
    THEN round_sig(total_protein * 100::numeric / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1::numeric - COALESCE(process_losses, 0::numeric) / 100::numeric)), 2)
    ELSE NULL::numeric
  END AS per_100g_protein,
  CASE
    WHEN total_baker_percentage > 0::numeric AND COALESCE(baking_ratio, 0.9) > 0::numeric
    THEN round_sig(total_salt * 100::numeric / (total_baker_percentage * COALESCE(baking_ratio, 0.9) * (1::numeric - COALESCE(process_losses, 0::numeric) / 100::numeric)), 2)
    ELSE NULL::numeric
  END AS per_100g_salt
FROM recipe_totals;
