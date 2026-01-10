-- Fix function search path warning
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix permissive RLS policy for non_conformities INSERT
DROP POLICY IF EXISTS "Quality users can insert non-conformities" ON public.non_conformities;

CREATE POLICY "Authenticated users can insert non-conformities"
ON public.non_conformities
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.control_records 
        WHERE id = control_record_id 
        AND operator_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'quality_assistant')
    OR public.has_role(auth.uid(), 'admin')
);