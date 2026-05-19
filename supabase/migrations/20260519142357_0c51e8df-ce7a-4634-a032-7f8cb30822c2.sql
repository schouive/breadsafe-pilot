-- Enum des modules applicatifs
CREATE TYPE public.app_module AS ENUM (
  'haccp',
  'products',
  'labeling',
  'orders',
  'time_tracking',
  'rd',
  'settings'
);

-- Table d'association utilisateur ↔ module
CREATE TABLE public.user_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module public.app_module NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (user_id, module)
);

CREATE INDEX idx_user_module_access_user ON public.user_module_access(user_id);

ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;

-- Fonction sécurisée (security definer) pour vérifier un accès
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module public.app_module)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_module_access
      WHERE user_id = _user_id AND module = _module
    )
$$;

-- Policies
CREATE POLICY "Admins manage all module access"
ON public.user_module_access
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view their own module access"
ON public.user_module_access
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Migration des rôles existants vers les modules
INSERT INTO public.user_module_access (user_id, module)
SELECT DISTINCT ur.user_id, m.module
FROM public.user_roles ur
CROSS JOIN LATERAL (
  VALUES
    ('admin'::app_role, 'haccp'::app_module),
    ('admin', 'products'), ('admin', 'labeling'), ('admin', 'orders'),
    ('admin', 'time_tracking'), ('admin', 'rd'), ('admin', 'settings'),
    ('quality_assistant', 'haccp'), ('quality_assistant', 'products'),
    ('quality_assistant', 'orders'), ('quality_assistant', 'settings'),
    ('bureau_methodes', 'products'), ('bureau_methodes', 'labeling'),
    ('bureau_methodes', 'rd'),
    ('operator', 'haccp'), ('operator', 'time_tracking'),
    ('auditor', 'haccp'), ('auditor', 'products'), ('auditor', 'orders')
) AS m(role, module)
WHERE ur.role = m.role
ON CONFLICT (user_id, module) DO NOTHING;

-- Mettre à jour handle_new_user pour donner accès au pointage par défaut
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'full_name', 'Utilisateur'), new.email);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'operator');

  INSERT INTO public.user_module_access (user_id, module)
  VALUES (new.id, 'time_tracking')
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;