
-- Add order_email column to suppliers for dedicated order email
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS order_email text;

-- Create order status enum
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('sent', 'partially_received', 'received');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS public.supplier_order_number_seq START 1;

-- Function to generate order number (CMD-YYYY-NNNN)
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN 'CMD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.supplier_order_number_seq')::text, 4, '0');
END;
$$;

-- =============================================
-- TABLE: supplier_orders
-- =============================================
CREATE TABLE public.supplier_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT public.generate_order_number(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  status public.order_status NOT NULL DEFAULT 'sent',
  order_date timestamptz NOT NULL DEFAULT now(),
  expected_delivery_date date,
  comment text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;

-- Admins & quality can manage orders
CREATE POLICY "Admins can manage orders"
  ON public.supplier_orders FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role]));

-- All authenticated can view orders (for reception screen)
CREATE POLICY "All authenticated can view orders"
  ON public.supplier_orders FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_supplier_orders_updated_at
  BEFORE UPDATE ON public.supplier_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: supplier_order_lines
-- =============================================
CREATE TABLE public.supplier_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.supplier_orders(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id),
  quantity_ordered numeric NOT NULL CHECK (quantity_ordered > 0),
  unit text NOT NULL DEFAULT 'kg',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage order lines"
  ON public.supplier_order_lines FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role]));

CREATE POLICY "All authenticated can view order lines"
  ON public.supplier_order_lines FOR SELECT TO authenticated
  USING (true);

-- =============================================
-- TABLE: supplier_receptions
-- =============================================
CREATE TABLE public.supplier_receptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  order_id uuid REFERENCES public.supplier_orders(id),
  delivery_note_number text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  operator_id uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_receptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can manage receptions"
  ON public.supplier_receptions FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- TABLE: supplier_reception_lines
-- =============================================
CREATE TABLE public.supplier_reception_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id uuid NOT NULL REFERENCES public.supplier_receptions(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id),
  quantity_received numeric NOT NULL CHECK (quantity_received > 0),
  unit text NOT NULL DEFAULT 'kg',
  order_line_id uuid REFERENCES public.supplier_order_lines(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_reception_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can manage reception lines"
  ON public.supplier_reception_lines FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- TRIGGER: Auto-update order status on reception
-- =============================================
CREATE OR REPLACE FUNCTION public.update_order_status_on_reception()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id uuid;
  _all_fulfilled boolean;
  _any_received boolean;
BEGIN
  SELECT order_id INTO _order_id
  FROM supplier_receptions
  WHERE id = NEW.reception_id;

  IF _order_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    bool_and(COALESCE(total_received, 0) >= ol.quantity_ordered),
    bool_or(COALESCE(total_received, 0) > 0)
  INTO _all_fulfilled, _any_received
  FROM supplier_order_lines ol
  LEFT JOIN (
    SELECT rl.order_line_id, SUM(rl.quantity_received) AS total_received
    FROM supplier_reception_lines rl
    JOIN supplier_receptions r ON r.id = rl.reception_id
    WHERE r.order_id = _order_id
    GROUP BY rl.order_line_id
  ) recv ON recv.order_line_id = ol.id
  WHERE ol.order_id = _order_id;

  IF _all_fulfilled THEN
    UPDATE supplier_orders SET status = 'received' WHERE id = _order_id;
  ELSIF _any_received THEN
    UPDATE supplier_orders SET status = 'partially_received' WHERE id = _order_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_order_status_after_reception_line
  AFTER INSERT ON public.supplier_reception_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_order_status_on_reception();
