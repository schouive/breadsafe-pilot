ALTER TABLE public.product_sheet_packagings ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr';
CREATE INDEX IF NOT EXISTS idx_psp_language ON public.product_sheet_packagings(language);