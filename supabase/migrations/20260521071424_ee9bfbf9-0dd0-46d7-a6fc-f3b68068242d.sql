-- 1) Table employees
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  badge_id text UNIQUE,
  photo_url text,
  position text,
  email text,
  hire_date date,
  is_active boolean NOT NULL DEFAULT true,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_badge ON public.employees(badge_id);
CREATE INDEX idx_employees_user ON public.employees(user_id);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view employees"
  ON public.employees FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin quality manage employees"
  ON public.employees FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role]));

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Migrer les profils existants : 1 employee par profil, en réutilisant le même id
INSERT INTO public.employees (id, full_name, badge_id, photo_url, email, is_active, user_id)
SELECT p.id, p.full_name, p.badge_id, COALESCE(p.photo_url, p.avatar_url), p.email, p.is_active, p.id
FROM public.profiles p
ON CONFLICT (id) DO NOTHING;

-- 3) Repointer time_entries.employee_id vers employees.id
ALTER TABLE public.time_entries
  DROP CONSTRAINT IF EXISTS time_entries_employee_id_fkey;

ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

-- 4) Mettre à jour les RLS de time_entries pour fonctionner avec employees (via user_id)
DROP POLICY IF EXISTS "Users can insert own time entries" ON public.time_entries;
CREATE POLICY "Users can insert time entries"
  ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
    OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role])
  );

-- 5) Vue helper publique des employés (équivalent profiles_public côté pointage)
CREATE OR REPLACE VIEW public.employees_public AS
  SELECT id, full_name, badge_id, photo_url, position, is_active, user_id
  FROM public.employees;

GRANT SELECT ON public.employees_public TO authenticated, anon;