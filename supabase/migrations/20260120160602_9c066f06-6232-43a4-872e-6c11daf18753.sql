-- Create carton_labels table linked to product_sheets
CREATE TABLE public.carton_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_sheet_id UUID NOT NULL REFERENCES public.product_sheets(id) ON DELETE CASCADE,
  label_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated')),
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID,
  validation_comment TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Snapshot of FT data at validation time
  snapshot_product_sheet_version INTEGER,
  snapshot_ingredients_html TEXT,
  snapshot_allergens_secondary JSONB,
  snapshot_nutrition JSONB,
  snapshot_net_weight NUMERIC,
  snapshot_net_weight_unit TEXT,
  snapshot_storage_instructions TEXT,
  snapshot_thawing_instructions TEXT,
  snapshot_created_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.carton_labels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Quality assistants can view carton labels"
ON public.carton_labels
FOR SELECT
USING (has_role(auth.uid(), 'quality_assistant'::app_role));

CREATE POLICY "Admins can manage carton labels"
ON public.carton_labels
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_carton_labels_updated_at
BEFORE UPDATE ON public.carton_labels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_carton_labels_product_sheet_id ON public.carton_labels(product_sheet_id);
CREATE INDEX idx_carton_labels_status ON public.carton_labels(status);