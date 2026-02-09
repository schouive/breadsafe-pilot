
-- Add type_produit to raw_materials (alimentaire_MP for existing, non_alimentaire for new non-food products)
ALTER TABLE public.raw_materials 
ADD COLUMN IF NOT EXISTS type_produit text NOT NULL DEFAULT 'alimentaire_MP';

-- Add supplier_reference and internal_comment
ALTER TABLE public.raw_materials 
ADD COLUMN IF NOT EXISTS supplier_reference text;

ALTER TABLE public.raw_materials 
ADD COLUMN IF NOT EXISTS internal_comment text;

-- Add FDS URL
ALTER TABLE public.raw_materials 
ADD COLUMN IF NOT EXISTS fds_url text;

-- Create storage bucket for FDS files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fds-documents', 'fds-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for FDS documents
CREATE POLICY "Authenticated users can view FDS" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'fds-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Quality and admin can upload FDS" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'fds-documents' AND (
  public.has_role(auth.uid(), 'quality_assistant') OR 
  public.has_role(auth.uid(), 'admin')
));

CREATE POLICY "Quality and admin can delete FDS" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'fds-documents' AND (
  public.has_role(auth.uid(), 'quality_assistant') OR 
  public.has_role(auth.uid(), 'admin')
));
