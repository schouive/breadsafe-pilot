-- Add calculation_mode field to recipes table
ALTER TABLE public.recipes
ADD COLUMN calculation_mode text NOT NULL DEFAULT 'flour_based'
CHECK (calculation_mode IN ('flour_based', 'total_weight'));