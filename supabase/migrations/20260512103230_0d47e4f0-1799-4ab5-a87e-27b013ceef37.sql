DROP POLICY IF EXISTS "Admin quality bureau can view suppliers" ON public.suppliers;

CREATE POLICY "Authenticated users can view suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (true);