
ALTER TABLE public.product_sheet_packagings
  ADD COLUMN IF NOT EXISTS in_print_catalog boolean NOT NULL DEFAULT false;

-- Migrer l'existant : tous les packagings actuellement actifs sur des FT validées sont déjà dans le catalogue
UPDATE public.product_sheet_packagings psp
SET in_print_catalog = true
FROM public.product_sheets ps
WHERE psp.product_sheet_id = ps.id
  AND ps.inco_status = 'validated'
  AND psp.active = true;
