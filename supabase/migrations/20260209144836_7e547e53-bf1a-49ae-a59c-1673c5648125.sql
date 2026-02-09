
-- Trigger function to update order status based on receptions
CREATE OR REPLACE FUNCTION public.update_order_status_on_reception()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id uuid;
  v_total_lines integer;
  v_fully_received_lines integer;
  v_partially_received_lines integer;
BEGIN
  -- Get order_id from the reception
  SELECT order_id INTO v_order_id
  FROM supplier_receptions
  WHERE id = NEW.reception_id;

  -- If no order linked, skip
  IF v_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count total order lines
  SELECT COUNT(*) INTO v_total_lines
  FROM supplier_order_lines
  WHERE order_id = v_order_id;

  -- Count fully received lines (received qty >= ordered qty)
  SELECT COUNT(*) INTO v_fully_received_lines
  FROM supplier_order_lines sol
  WHERE sol.order_id = v_order_id
    AND (
      SELECT COALESCE(SUM(srl.quantity_received), 0)
      FROM supplier_reception_lines srl
      JOIN supplier_receptions sr ON sr.id = srl.reception_id
      WHERE srl.order_line_id = sol.id
    ) >= sol.quantity_ordered;

  -- Count lines with any reception
  SELECT COUNT(*) INTO v_partially_received_lines
  FROM supplier_order_lines sol
  WHERE sol.order_id = v_order_id
    AND (
      SELECT COALESCE(SUM(srl.quantity_received), 0)
      FROM supplier_reception_lines srl
      JOIN supplier_receptions sr ON sr.id = srl.reception_id
      WHERE srl.order_line_id = sol.id
    ) > 0;

  -- Update status
  IF v_fully_received_lines >= v_total_lines THEN
    UPDATE supplier_orders SET status = 'received', updated_at = now() WHERE id = v_order_id;
  ELSIF v_partially_received_lines > 0 THEN
    UPDATE supplier_orders SET status = 'partially_received', updated_at = now() WHERE id = v_order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on reception lines insert
DROP TRIGGER IF EXISTS trg_update_order_status ON supplier_reception_lines;
CREATE TRIGGER trg_update_order_status
AFTER INSERT ON supplier_reception_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_order_status_on_reception();
