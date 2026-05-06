
-- Enum pour le statut des essais
CREATE TYPE public.rd_trial_status AS ENUM ('preparation', 'in_progress', 'completed', 'validated', 'abandoned');
CREATE TYPE public.rd_trial_decision AS ENUM ('redo', 'adjust', 'validated');

-- Séquence pour identifiant lisible
CREATE SEQUENCE public.rd_trial_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_rd_trial_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN 'ESSAI-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.rd_trial_number_seq')::text, 4, '0');
END;
$$;

-- Table principale: essais
CREATE TABLE public.rd_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_number text NOT NULL UNIQUE DEFAULT public.generate_rd_trial_number(),
  trial_name text NOT NULL,
  trial_version integer NOT NULL DEFAULT 1,
  status public.rd_trial_status NOT NULL DEFAULT 'preparation',
  is_archived boolean NOT NULL DEFAULT false,

  -- Infos générales
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  recipe_name_text text,
  recipe_version_text text,
  objective text,
  product_concerned text,
  operator_id uuid,
  operator_name text,

  -- Formulation
  total_hydration numeric,
  formulation_notes text,

  -- Températures
  temp_flour numeric,
  temp_water numeric,
  temp_lab numeric,
  temp_base numeric,
  temp_target numeric,
  temp_actual_end_kneading numeric,

  -- Pétrissage
  mixer_type text,
  frasage_notes text,
  autolyse_notes text,
  bassinage_notes text,
  speed1_value text,
  speed1_duration_min numeric,
  speed2_value text,
  speed2_duration_min numeric,
  kneading_total_min numeric,
  kneading_observations text,

  -- Pointage (1ère fermentation)
  pointage_start timestamptz,
  pointage_end timestamptz,
  pointage_dough_temp numeric,
  pointage_ambient_temp numeric,
  pointage_humidity numeric,
  pointage_observations text,

  -- Division / détente
  division_time timestamptz,
  patons_weight numeric,
  detente_duration_min numeric,
  division_observations text,

  -- Apprêt
  appret_start timestamptz,
  appret_end timestamptz,
  appret_temp numeric,
  appret_humidity numeric,
  appret_observations text,

  -- Cuisson
  oven_type text,
  cooking_temp numeric,
  steam boolean,
  cooking_duration_min numeric,
  cooking_observations text,

  -- Évaluation finale (notes /10)
  eval_volume numeric,
  eval_alveolage numeric,
  eval_tenue numeric,
  eval_coloration numeric,
  eval_croustillance numeric,
  eval_gout numeric,
  eval_maniabilite numeric,
  eval_average numeric,
  eval_notes text,

  -- Conclusion
  conclusion_hypothesis text,
  conclusion_result text,
  conclusion_gaps text,
  conclusion_corrective text,
  conclusion_decision public.rd_trial_decision,

  trial_date timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rd_trials_status ON public.rd_trials(status);
CREATE INDEX idx_rd_trials_recipe ON public.rd_trials(recipe_id);
CREATE INDEX idx_rd_trials_date ON public.rd_trials(trial_date DESC);
CREATE INDEX idx_rd_trials_archived ON public.rd_trials(is_archived);

-- Ingrédients de l'essai
CREATE TABLE public.rd_trial_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id uuid NOT NULL REFERENCES public.rd_trials(id) ON DELETE CASCADE,
  raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE SET NULL,
  ingredient_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  baker_percentage numeric,
  observations text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rd_trial_ingredients_trial ON public.rd_trial_ingredients(trial_id);

-- Rabats
CREATE TABLE public.rd_trial_rabats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id uuid NOT NULL REFERENCES public.rd_trials(id) ON DELETE CASCADE,
  rabat_time timestamptz,
  rabat_type text,
  observation text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rd_trial_rabats_trial ON public.rd_trial_rabats(trial_id);

-- Journal de process (timeline)
CREATE TABLE public.rd_trial_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id uuid NOT NULL REFERENCES public.rd_trials(id) ON DELETE CASCADE,
  entry_time timestamptz NOT NULL DEFAULT now(),
  comment text NOT NULL,
  author_id uuid,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rd_trial_journal_trial ON public.rd_trial_journal(trial_id, entry_time DESC);

-- Historique des versions
CREATE TABLE public.rd_trial_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id uuid NOT NULL REFERENCES public.rd_trials(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rd_trial_versions_trial ON public.rd_trial_versions(trial_id, version_number DESC);

-- Triggers updated_at
CREATE TRIGGER update_rd_trials_updated_at
BEFORE UPDATE ON public.rd_trials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.rd_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rd_trial_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rd_trial_rabats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rd_trial_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rd_trial_versions ENABLE ROW LEVEL SECURITY;

-- Policies: Admin + Bureau méthodes + Qualité = manage; Auditeur = lecture
CREATE POLICY "RD editors manage trials" ON public.rd_trials
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]));
CREATE POLICY "Auditors view trials" ON public.rd_trials
  FOR SELECT USING (has_role(auth.uid(), 'auditor'::app_role));

CREATE POLICY "RD editors manage ingredients" ON public.rd_trial_ingredients
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]));
CREATE POLICY "Auditors view ingredients" ON public.rd_trial_ingredients
  FOR SELECT USING (has_role(auth.uid(), 'auditor'::app_role));

CREATE POLICY "RD editors manage rabats" ON public.rd_trial_rabats
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]));
CREATE POLICY "Auditors view rabats" ON public.rd_trial_rabats
  FOR SELECT USING (has_role(auth.uid(), 'auditor'::app_role));

CREATE POLICY "RD editors manage journal" ON public.rd_trial_journal
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]));
CREATE POLICY "Auditors view journal" ON public.rd_trial_journal
  FOR SELECT USING (has_role(auth.uid(), 'auditor'::app_role));

CREATE POLICY "RD editors manage versions" ON public.rd_trial_versions
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]));
CREATE POLICY "Auditors view versions" ON public.rd_trial_versions
  FOR SELECT USING (has_role(auth.uid(), 'auditor'::app_role));
