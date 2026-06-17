ALTER TABLE public.product_sheet_packagings
  ADD COLUMN IF NOT EXISTS translated_ingredients_html text,
  ADD COLUMN IF NOT EXISTS translated_allergen_statement text,
  ADD COLUMN IF NOT EXISTS translated_traces_statement text,
  ADD COLUMN IF NOT EXISTS translated_storage_instructions text,
  ADD COLUMN IF NOT EXISTS translated_thawing_instructions text,
  ADD COLUMN IF NOT EXISTS translated_at timestamptz;