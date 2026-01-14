-- Step 1: Drop the RLS policy that depends on assigned_to
DROP POLICY IF EXISTS "Quality users can update non-conformities" ON public.non_conformities;

-- Step 2: Drop the foreign key constraint on assigned_to
ALTER TABLE public.non_conformities 
DROP CONSTRAINT IF EXISTS non_conformities_assigned_to_fkey;

-- Step 3: Change assigned_to column from UUID to TEXT
ALTER TABLE public.non_conformities 
ALTER COLUMN assigned_to TYPE TEXT;

-- Step 4: Recreate the RLS policy without assigned_to = auth.uid() comparison
CREATE POLICY "Quality users can update non-conformities"
ON public.non_conformities
FOR UPDATE
USING (
  has_role(auth.uid(), 'quality_assistant'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);