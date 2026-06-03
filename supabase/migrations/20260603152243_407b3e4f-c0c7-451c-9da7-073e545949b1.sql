ALTER TABLE public.print_history DROP CONSTRAINT IF EXISTS print_history_product_id_fkey;
ALTER TABLE public.print_history
  ADD CONSTRAINT print_history_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.product_sheet_packagings(id) ON DELETE CASCADE;