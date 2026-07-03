CREATE TABLE public.production_batch_shapings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
  product_sheet_id UUID NOT NULL REFERENCES public.product_sheets(id) ON DELETE RESTRICT,
  chariots NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(batch_id, product_sheet_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_batch_shapings TO authenticated;
GRANT ALL ON public.production_batch_shapings TO service_role;

ALTER TABLE public.production_batch_shapings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view shapings"
  ON public.production_batch_shapings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert shapings"
  ON public.production_batch_shapings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update shapings"
  ON public.production_batch_shapings FOR UPDATE
  TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete shapings"
  ON public.production_batch_shapings FOR DELETE
  TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_pbs_updated_at
  BEFORE UPDATE ON public.production_batch_shapings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pbs_batch ON public.production_batch_shapings(batch_id);
CREATE INDEX idx_pbs_sheet ON public.production_batch_shapings(product_sheet_id);