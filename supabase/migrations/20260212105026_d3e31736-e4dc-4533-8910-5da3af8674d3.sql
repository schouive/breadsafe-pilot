
-- Add column to preserve auto-generated INCO HTML
ALTER TABLE public.carton_labels 
ADD COLUMN IF NOT EXISTS snapshot_ingredients_html_original text;

-- Create INCO change log table for tracking manual edits
CREATE TABLE public.inco_change_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  carton_label_id uuid NOT NULL REFERENCES public.carton_labels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL, -- 'manual_edit', 'validation', 'archive', 'regeneration'
  html_before text,
  html_after text,
  allergens_removed text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inco_change_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins and bureau can view INCO change logs"
ON public.inco_change_logs
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role, 'quality_assistant'::app_role, 'auditor'::app_role]));

CREATE POLICY "Admins and bureau can insert INCO change logs"
ON public.inco_change_logs
FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'bureau_methodes'::app_role]));

-- Index for fast lookups
CREATE INDEX idx_inco_change_logs_label ON public.inco_change_logs(carton_label_id, created_at DESC);
