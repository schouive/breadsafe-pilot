
-- 1. profiles: create safe public view (no email) and restrict base table
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT id, full_name, avatar_url, photo_url, badge_id, is_active
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role));

-- 2. suppliers: restrict SELECT to admin / quality / bureau
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;

CREATE POLICY "Admin quality bureau can view suppliers"
ON public.suppliers FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role, 'bureau_methodes'::app_role]));

-- 3. recipe_nutrition view: enforce security_invoker
ALTER VIEW public.recipe_nutrition SET (security_invoker = on);
