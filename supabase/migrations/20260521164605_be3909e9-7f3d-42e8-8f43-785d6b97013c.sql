DROP POLICY IF EXISTS "Users can insert time entries" ON public.time_entries;

CREATE POLICY "Authenticated can insert time entries for active employees"
ON public.time_entries
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = time_entries.employee_id
      AND e.is_active = true
  )
);