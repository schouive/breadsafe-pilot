
-- Sequence for batch numbering
CREATE SEQUENCE IF NOT EXISTS public.print_batch_number_seq START 1;

-- Function to generate batch number
CREATE OR REPLACE FUNCTION public.generate_print_batch_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.print_batch_number_seq')::text, 4, '0');
END;
$$;

-- ============ print_batches ============
CREATE TABLE public.print_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL UNIQUE DEFAULT public.generate_print_batch_number(),
  name text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','printing','completed','partial','failed')),
  global_lot text,
  global_ddm date,
  created_by uuid NOT NULL,
  printed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view print batches"
  ON public.print_batches FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert own print batches"
  ON public.print_batches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner admin bureau update print batches"
  ON public.print_batches FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

CREATE POLICY "Owner admin bureau delete print batches"
  ON public.print_batches FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

CREATE TRIGGER trg_print_batches_updated_at
  BEFORE UPDATE ON public.print_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_print_batches_created_by ON public.print_batches(created_by);
CREATE INDEX idx_print_batches_created_at ON public.print_batches(created_at DESC);

-- ============ print_batch_items ============
CREATE TABLE public.print_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.print_batches(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  product_id uuid NOT NULL,
  lot_override text,
  ddm_override date,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','printing','printed','failed')),
  error_message text,
  printed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print_batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view print batch items"
  ON public.print_batch_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated manage print batch items"
  ON public.print_batch_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.print_batches b
      WHERE b.id = batch_id
        AND (b.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.print_batches b
      WHERE b.id = batch_id
        AND (b.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
    )
  );

CREATE TRIGGER trg_print_batch_items_updated_at
  BEFORE UPDATE ON public.print_batch_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_print_batch_items_batch ON public.print_batch_items(batch_id);

-- ============ print_jobs ============
CREATE TABLE public.print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.print_batches(id) ON DELETE SET NULL,
  batch_item_id uuid REFERENCES public.print_batch_items(id) ON DELETE SET NULL,
  operator_id uuid NOT NULL,
  zpl_payload text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  error_message text,
  print_method text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view print jobs"
  ON public.print_jobs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert own print jobs"
  ON public.print_jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = operator_id);

CREATE POLICY "Admin delete print jobs"
  ON public.print_jobs FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_print_jobs_batch ON public.print_jobs(batch_id);
CREATE INDEX idx_print_jobs_item ON public.print_jobs(batch_item_id);
CREATE INDEX idx_print_jobs_created_at ON public.print_jobs(created_at DESC);
