
-- Add order_id column to control_records to link reception controls to supplier orders
ALTER TABLE public.control_records
ADD COLUMN order_id uuid REFERENCES public.supplier_orders(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_control_records_order_id ON public.control_records(order_id);
