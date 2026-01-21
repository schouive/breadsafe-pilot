-- Add recipe_type field to recipes table
ALTER TABLE public.recipes 
ADD COLUMN recipe_type text NOT NULL DEFAULT 'finished' 
CHECK (recipe_type IN ('finished', 'intermediate'));

-- Add comment for documentation
COMMENT ON COLUMN public.recipes.recipe_type IS 'Type of recipe: finished (product for sale) or intermediate (poolish, levain, etc.)';

-- Allow recipe_ingredients to reference other recipes as ingredients
ALTER TABLE public.recipe_ingredients 
ADD COLUMN ingredient_recipe_id uuid REFERENCES public.recipes(id) ON DELETE CASCADE;

-- Add constraint: either raw_material_id or ingredient_recipe_id must be set, but not both
ALTER TABLE public.recipe_ingredients 
ADD CONSTRAINT ingredient_source_check 
CHECK (
  (raw_material_id IS NOT NULL AND ingredient_recipe_id IS NULL) OR 
  (raw_material_id IS NULL AND ingredient_recipe_id IS NOT NULL)
);

-- Make raw_material_id nullable (since ingredient_recipe_id can be used instead)
ALTER TABLE public.recipe_ingredients 
ALTER COLUMN raw_material_id DROP NOT NULL;

-- Add index for performance
CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(ingredient_recipe_id);
CREATE INDEX idx_recipes_type ON public.recipes(recipe_type);