-- Migration 2: Tables et policies pour le nouveau système de rôles

-- 1. Ajouter les champs dans profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Créer la table d'audit pour les actions sensibles
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for audit_logs
CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Quality and auditors can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  has_role(auth.uid(), 'quality_assistant'::app_role) OR 
  has_role(auth.uid(), 'auditor'::app_role)
);

CREATE POLICY "Authenticated users can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Créer la fonction has_any_role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- 4. Policy pour permettre aux admins de gérer les profils
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Mettre à jour les policies pour les recettes
DROP POLICY IF EXISTS "Admins can manage recipes" ON public.recipes;
CREATE POLICY "Admins and bureau can manage recipes" 
ON public.recipes 
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

DROP POLICY IF EXISTS "Quality assistants can view recipes" ON public.recipes;
CREATE POLICY "Quality auditors bureau can view recipes" 
ON public.recipes 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['quality_assistant'::app_role, 'auditor'::app_role, 'bureau_methodes'::app_role]));

-- 6. Mettre à jour les policies pour recipe_ingredients
DROP POLICY IF EXISTS "Admins can manage recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Admins and bureau can manage recipe ingredients" 
ON public.recipe_ingredients 
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

DROP POLICY IF EXISTS "Quality assistants can view recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Quality auditors bureau can view recipe ingredients" 
ON public.recipe_ingredients 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['quality_assistant'::app_role, 'auditor'::app_role, 'bureau_methodes'::app_role]));

-- 7. Policies pour product_sheets
DROP POLICY IF EXISTS "Admins can manage product sheets" ON public.product_sheets;
CREATE POLICY "Admins and bureau can manage product sheets" 
ON public.product_sheets 
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

DROP POLICY IF EXISTS "Quality assistants can view product sheets" ON public.product_sheets;
CREATE POLICY "Quality auditors bureau can view product sheets" 
ON public.product_sheets 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['quality_assistant'::app_role, 'auditor'::app_role, 'bureau_methodes'::app_role]));

-- 8. Policies pour label_data
DROP POLICY IF EXISTS "Admins can manage label data" ON public.label_data;
CREATE POLICY "Admins and bureau can manage label data" 
ON public.label_data 
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

DROP POLICY IF EXISTS "Quality assistants can view label data" ON public.label_data;
CREATE POLICY "Quality auditors bureau can view label data" 
ON public.label_data 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['quality_assistant'::app_role, 'auditor'::app_role, 'bureau_methodes'::app_role]));

-- 9. Policies pour carton_labels
DROP POLICY IF EXISTS "Admins can manage carton labels" ON public.carton_labels;
CREATE POLICY "Admins and bureau can manage carton labels" 
ON public.carton_labels 
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

DROP POLICY IF EXISTS "Quality assistants can view carton labels" ON public.carton_labels;
CREATE POLICY "Quality auditors bureau can view carton labels" 
ON public.carton_labels 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['quality_assistant'::app_role, 'auditor'::app_role, 'bureau_methodes'::app_role]));

-- 10. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);