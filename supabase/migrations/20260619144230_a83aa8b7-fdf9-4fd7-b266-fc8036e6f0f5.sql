DROP POLICY IF EXISTS "Users can insert inco logs for product sheets" ON public.inco_change_logs;
ALTER TABLE public.inco_change_logs DROP COLUMN IF EXISTS carton_label_id;
DROP TABLE IF EXISTS public.carton_labels CASCADE;
CREATE POLICY "Users can insert inco logs for product sheets"
ON public.inco_change_logs
FOR INSERT
TO authenticated
WITH CHECK (product_sheet_id IS NOT NULL);