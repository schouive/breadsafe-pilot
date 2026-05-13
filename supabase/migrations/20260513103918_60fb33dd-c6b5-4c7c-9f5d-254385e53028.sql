-- Programmes d'impression clients
CREATE TABLE public.print_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  customer_code text,
  customer_name text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.print_program_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.print_programs(id) ON DELETE CASCADE,
  erp_article_id uuid NOT NULL REFERENCES public.erp_articles(id) ON DELETE CASCADE,
  print_order integer NOT NULL DEFAULT 0,
  default_quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_print_program_items_program ON public.print_program_items(program_id);

ALTER TABLE public.print_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_program_items ENABLE ROW LEVEL SECURITY;

-- print_programs policies
CREATE POLICY "Authenticated view print programs"
  ON public.print_programs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin bureau quality manage print programs"
  ON public.print_programs FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]));

-- print_program_items policies
CREATE POLICY "Authenticated view print program items"
  ON public.print_program_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin bureau quality manage print program items"
  ON public.print_program_items FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role]));

CREATE TRIGGER trg_print_programs_updated_at
  BEFORE UPDATE ON public.print_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_print_program_items_updated_at
  BEFORE UPDATE ON public.print_program_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();