
ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_status_check;

UPDATE public.recipes SET status = 'in_production' WHERE status = 'validated';
UPDATE public.recipes SET status = 'in_development' WHERE status IS NULL OR status NOT IN ('in_production','in_development');

ALTER TABLE public.recipes ALTER COLUMN status SET DEFAULT 'in_development';
ALTER TABLE public.recipes ADD CONSTRAINT recipes_status_check CHECK (status IN ('in_production','in_development'));

ALTER TABLE public.recipes DROP COLUMN IF EXISTS production_status;
