
-- Add production module to app_module enum
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'production';

-- Enum priority
DO $$ BEGIN
  CREATE TYPE public.production_priority AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.production_status AS ENUM ('pending','in_progress','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- production_plans
CREATE TABLE public.production_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  recipe_name text NOT NULL,
  chariots integer NOT NULL DEFAULT 1,
  quantity_total numeric,
  scheduled_time timestamptz NOT NULL,
  priority public.production_priority NOT NULL DEFAULT 'normal',
  manager_name text,
  operator_name text,
  observations text,
  status public.production_status NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_plans TO authenticated;
GRANT ALL ON public.production_plans TO service_role;
ALTER TABLE public.production_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read production plans"
  ON public.production_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert production plans"
  ON public.production_plans FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','bureau_methodes','operator','quality_assistant']::app_role[]));
CREATE POLICY "Staff can update production plans"
  ON public.production_plans FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','bureau_methodes','operator','quality_assistant']::app_role[]));
CREATE POLICY "Admin can delete production plans"
  ON public.production_plans FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','bureau_methodes']::app_role[]));

CREATE TRIGGER trg_production_plans_updated
  BEFORE UPDATE ON public.production_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- production_journals
CREATE TABLE public.production_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL UNIQUE REFERENCES public.production_plans(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  recipe_name text NOT NULL,
  chariots integer,
  manager_name text,
  operator_name text,
  kneading_start timestamptz,
  kneading_end timestamptz,
  dough_temperature numeric,
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
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_journals TO authenticated;
GRANT ALL ON public.production_journals TO service_role;
ALTER TABLE public.production_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read production journals"
  ON public.production_journals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert production journals"
  ON public.production_journals FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','bureau_methodes','operator','quality_assistant']::app_role[]));
CREATE POLICY "Staff can update production journals"
  ON public.production_journals FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','bureau_methodes','operator','quality_assistant']::app_role[]));
CREATE POLICY "Admin can delete production journals"
  ON public.production_journals FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','bureau_methodes']::app_role[]));

CREATE TRIGGER trg_production_journals_updated
  BEFORE UPDATE ON public.production_journals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_production_plans_date ON public.production_plans(production_date);
CREATE INDEX idx_production_plans_status ON public.production_plans(status);
CREATE INDEX idx_production_journals_plan ON public.production_journals(plan_id);
