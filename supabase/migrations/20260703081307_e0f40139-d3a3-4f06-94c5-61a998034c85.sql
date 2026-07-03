
CREATE TABLE public.production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.production_plans(id) ON DELETE CASCADE,
  batch_number integer NOT NULL,
  chariots integer,
  dough_temperature numeric,
  kneading_start timestamptz,
  kneading_end timestamptz,
  shaping_start timestamptz,
  line_start timestamptz,
  proofing_start timestamptz,
  proofing_end timestamptz,
  oven_in timestamptz,
  oven_out timestamptz,
  production_end timestamptz,
  comments text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, batch_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_batches TO authenticated;
GRANT ALL ON public.production_batches TO service_role;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read production batches"
  ON public.production_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert production batches"
  ON public.production_batches FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','bureau_methodes','operator','quality_assistant']::app_role[]));
CREATE POLICY "Staff can update production batches"
  ON public.production_batches FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','bureau_methodes','operator','quality_assistant']::app_role[]));
CREATE POLICY "Admin can delete production batches"
  ON public.production_batches FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','bureau_methodes']::app_role[]));

CREATE TRIGGER trg_production_batches_updated
  BEFORE UPDATE ON public.production_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_production_batches_plan ON public.production_batches(plan_id);
