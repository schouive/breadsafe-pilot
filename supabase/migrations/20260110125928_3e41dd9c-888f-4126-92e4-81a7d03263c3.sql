-- Table des fournisseurs
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des matières premières
CREATE TABLE public.raw_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  category TEXT,
  unit TEXT DEFAULT 'kg',
  requires_cold_storage BOOLEAN NOT NULL DEFAULT false,
  storage_temp_min NUMERIC,
  storage_temp_max NUMERIC,
  allergens TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des chambres froides
CREATE TABLE public.cold_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'refrigere', -- 'refrigere' ou 'negatif'
  temp_min NUMERIC NOT NULL,
  temp_max NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des relevés de température de stockage
CREATE TABLE public.storage_temperature_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cold_room_id UUID NOT NULL REFERENCES public.cold_rooms(id) ON DELETE RESTRICT,
  operator_id UUID NOT NULL,
  temperature NUMERIC NOT NULL,
  is_conforme BOOLEAN NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_temperature_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suppliers (read all, write for quality/admin)
CREATE POLICY "Authenticated users can view suppliers"
ON public.suppliers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Quality and admin can manage suppliers"
ON public.suppliers FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for raw_materials (read all, write for quality/admin)
CREATE POLICY "Authenticated users can view raw materials"
ON public.raw_materials FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Quality and admin can manage raw materials"
ON public.raw_materials FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for cold_rooms (read all, write for quality/admin)
CREATE POLICY "Authenticated users can view cold rooms"
ON public.cold_rooms FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Quality and admin can manage cold rooms"
ON public.cold_rooms FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for storage_temperature_records
CREATE POLICY "Authenticated users can view temperature records"
ON public.storage_temperature_records FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own temperature records"
ON public.storage_temperature_records FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = operator_id);

CREATE POLICY "Quality and admin can manage temperature records"
ON public.storage_temperature_records FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_raw_materials_updated_at
BEFORE UPDATE ON public.raw_materials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cold_rooms_updated_at
BEFORE UPDATE ON public.cold_rooms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add CP_STOCKAGE to control_point_code enum (merge CP6 & CP7)
ALTER TYPE control_point_code ADD VALUE IF NOT EXISTS 'CP_STOCKAGE';

-- Add raw_material_id to control_records for linking to products
ALTER TABLE public.control_records ADD COLUMN raw_material_id UUID REFERENCES public.raw_materials(id);

-- Insert some default cold rooms
INSERT INTO public.cold_rooms (name, type, temp_min, temp_max) VALUES
  ('Chambre froide positive 1', 'refrigere', 0, 4),
  ('Chambre froide négative 1', 'negatif', -22, -18);