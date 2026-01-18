-- Recréer la vue avec security_invoker pour respecter les permissions de l'utilisateur
DROP VIEW IF EXISTS public.recipe_nutrition;

CREATE VIEW public.recipe_nutrition
WITH (security_invoker = on) AS
SELECT
    r.id as recipe_id,
    r.name as recipe_name,
    r.yield_quantity,
    r.yield_unit,
    -- Valeurs nutritionnelles totales de la recette
    ROUND(SUM(COALESCE(rm.energy_kcal, 0) * ri.quantity)::numeric, 2) as total_energy_kcal,
    ROUND(SUM(COALESCE(rm.energy_kj, 0) * ri.quantity)::numeric, 2) as total_energy_kj,
    ROUND(SUM(COALESCE(rm.fat, 0) * ri.quantity)::numeric, 2) as total_fat,
    ROUND(SUM(COALESCE(rm.saturated_fat, 0) * ri.quantity)::numeric, 2) as total_saturated_fat,
    ROUND(SUM(COALESCE(rm.carbohydrates, 0) * ri.quantity)::numeric, 2) as total_carbohydrates,
    ROUND(SUM(COALESCE(rm.sugars, 0) * ri.quantity)::numeric, 2) as total_sugars,
    ROUND(SUM(COALESCE(rm.fiber, 0) * ri.quantity)::numeric, 2) as total_fiber,
    ROUND(SUM(COALESCE(rm.protein, 0) * ri.quantity)::numeric, 2) as total_protein,
    ROUND(SUM(COALESCE(rm.salt, 0) * ri.quantity)::numeric, 2) as total_salt,
    -- Valeurs pour 100g (basé sur yield_quantity en kg converti en g)
    CASE 
        WHEN r.yield_quantity > 0 THEN 
            ROUND((SUM(COALESCE(rm.energy_kcal, 0) * ri.quantity) / (r.yield_quantity * 10))::numeric, 2)
        ELSE NULL 
    END as per_100g_energy_kcal,
    CASE 
        WHEN r.yield_quantity > 0 THEN 
            ROUND((SUM(COALESCE(rm.energy_kj, 0) * ri.quantity) / (r.yield_quantity * 10))::numeric, 2)
        ELSE NULL 
    END as per_100g_energy_kj,
    CASE 
        WHEN r.yield_quantity > 0 THEN 
            ROUND((SUM(COALESCE(rm.fat, 0) * ri.quantity) / (r.yield_quantity * 10))::numeric, 2)
        ELSE NULL 
    END as per_100g_fat,
    CASE 
        WHEN r.yield_quantity > 0 THEN 
            ROUND((SUM(COALESCE(rm.saturated_fat, 0) * ri.quantity) / (r.yield_quantity * 10))::numeric, 2)
        ELSE NULL 
    END as per_100g_saturated_fat,
    CASE 
        WHEN r.yield_quantity > 0 THEN 
            ROUND((SUM(COALESCE(rm.carbohydrates, 0) * ri.quantity) / (r.yield_quantity * 10))::numeric, 2)
        ELSE NULL 
    END as per_100g_carbohydrates,
    CASE 
        WHEN r.yield_quantity > 0 THEN 
            ROUND((SUM(COALESCE(rm.sugars, 0) * ri.quantity) / (r.yield_quantity * 10))::numeric, 2)
        ELSE NULL 
    END as per_100g_sugars,
    CASE 
        WHEN r.yield_quantity > 0 THEN 
            ROUND((SUM(COALESCE(rm.fiber, 0) * ri.quantity) / (r.yield_quantity * 10))::numeric, 2)
        ELSE NULL 
    END as per_100g_fiber,
    CASE 
        WHEN r.yield_quantity > 0 THEN 
            ROUND((SUM(COALESCE(rm.protein, 0) * ri.quantity) / (r.yield_quantity * 10))::numeric, 2)
        ELSE NULL 
    END as per_100g_protein,
    CASE 
        WHEN r.yield_quantity > 0 THEN 
            ROUND((SUM(COALESCE(rm.salt, 0) * ri.quantity) / (r.yield_quantity * 10))::numeric, 2)
        ELSE NULL 
    END as per_100g_salt
FROM public.recipes r
LEFT JOIN public.recipe_ingredients ri ON ri.recipe_id = r.id
LEFT JOIN public.raw_materials rm ON rm.id = ri.raw_material_id
GROUP BY r.id, r.name, r.yield_quantity, r.yield_unit;