-- Add process field to recipes table
ALTER TABLE public.recipes 
ADD COLUMN process text;