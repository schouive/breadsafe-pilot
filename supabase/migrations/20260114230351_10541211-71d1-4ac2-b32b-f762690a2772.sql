-- Create audit log table for non-conformities
CREATE TABLE public.nc_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  non_conformity_id UUID NOT NULL REFERENCES public.non_conformities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nc_audit_logs ENABLE ROW LEVEL SECURITY;

-- Everyone can view audit logs
CREATE POLICY "Authenticated users can view audit logs"
ON public.nc_audit_logs
FOR SELECT
USING (true);

-- Only quality/admin can insert audit logs
CREATE POLICY "Quality and admin can insert audit logs"
ON public.nc_audit_logs
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'quality_assistant'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = user_id
);

-- Create index for faster queries
CREATE INDEX idx_nc_audit_logs_nc_id ON public.nc_audit_logs(non_conformity_id);
CREATE INDEX idx_nc_audit_logs_created_at ON public.nc_audit_logs(created_at DESC);