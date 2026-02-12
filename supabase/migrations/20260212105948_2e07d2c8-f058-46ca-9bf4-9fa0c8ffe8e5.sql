
-- Add INCO workflow columns to product_sheets
ALTER TABLE public.product_sheets
ADD COLUMN IF NOT EXISTS inco_html text,
ADD COLUMN IF NOT EXISTS inco_html_original text,
ADD COLUMN IF NOT EXISTS inco_status text NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS inco_validated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS inco_validated_by uuid,
ADD COLUMN IF NOT EXISTS inco_validation_comment text,
ADD COLUMN IF NOT EXISTS inco_version integer NOT NULL DEFAULT 0;

-- Add product_sheet_id to inco_change_logs (nullable, so existing carton_label logs still work)
ALTER TABLE public.inco_change_logs
ADD COLUMN IF NOT EXISTS product_sheet_id uuid REFERENCES public.product_sheets(id) ON DELETE CASCADE;

-- Make carton_label_id nullable (old logs keep it, new logs use product_sheet_id)
ALTER TABLE public.inco_change_logs
ALTER COLUMN carton_label_id DROP NOT NULL;

-- RLS for inco_change_logs on product_sheet_id (same pattern as existing)
CREATE POLICY "Users can read inco logs for product sheets"
ON public.inco_change_logs
FOR SELECT
USING (product_sheet_id IS NOT NULL);

CREATE POLICY "Users can insert inco logs for product sheets"
ON public.inco_change_logs
FOR INSERT
WITH CHECK (product_sheet_id IS NOT NULL OR carton_label_id IS NOT NULL);
