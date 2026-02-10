-- Update default status for new orders to 'draft'
ALTER TABLE public.supplier_orders ALTER COLUMN status SET DEFAULT 'draft'::order_status;