DROP POLICY IF EXISTS "Users can view own time entries" ON public.time_entries;

CREATE POLICY "Time tracking users can view entries for active employees"
ON public.time_entries
FOR SELECT
TO authenticated
USING (
  public.has_module_access(auth.uid(), 'time_tracking'::public.app_module)
  AND EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = time_entries.employee_id
      AND e.is_active = true
  )
);

DROP POLICY IF EXISTS "Authenticated can insert time entries for active employees" ON public.time_entries;

CREATE POLICY "Time tracking users can insert entries for active employees"
ON public.time_entries
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_module_access(auth.uid(), 'time_tracking'::public.app_module)
  AND EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = time_entries.employee_id
      AND e.is_active = true
  )
);