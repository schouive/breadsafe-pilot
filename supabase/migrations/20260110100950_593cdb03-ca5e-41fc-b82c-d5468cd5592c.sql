-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('operator', 'quality_assistant', 'admin');

-- Create user_roles table (for proper role management, not stored on profiles)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'full_name', 'Utilisateur'), new.email);
  
  -- Default role is operator
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'operator');
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Control status enum
CREATE TYPE public.control_status AS ENUM ('conforme', 'acceptable', 'nonconforme', 'pending');

-- Control point code enum (grouped: CP_RECEPTION for CP1-4, individual for CP5-8)
CREATE TYPE public.control_point_code AS ENUM (
    'CP_RECEPTION',
    'CP5_CORPS_ETRANGER',
    'CP6_STOCKAGE_POSITIF',
    'CP7_STOCKAGE_NEGATIF',
    'CP8_DLC_PERIMEE'
);

-- Non-conformity severity enum
CREATE TYPE public.nc_severity AS ENUM ('minor', 'major', 'critical');

-- Non-conformity status enum
CREATE TYPE public.nc_status AS ENUM ('open', 'in_progress', 'resolved', 'validated');

-- Control records table
CREATE TABLE public.control_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_point_code control_point_code NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    operator_id UUID REFERENCES auth.users(id) NOT NULL,
    status control_status NOT NULL DEFAULT 'pending',
    
    -- Temperature fields (for CP1, CP6, CP7)
    temperature NUMERIC(5,2),
    temperature_conforme BOOLEAN,
    
    -- Integrity check (CP2)
    integrite_conforme BOOLEAN,
    integrite_notes TEXT,
    
    -- DLC check (CP3, CP8)
    dlc_date DATE,
    dlc_conforme BOOLEAN,
    dlc_notes TEXT,
    
    -- Allergen check (CP4)
    allergenes_conformes BOOLEAN,
    allergenes_notes TEXT,
    
    -- Foreign body check (CP5)
    corps_etranger_detecte BOOLEAN,
    
    -- Common fields
    notes TEXT,
    lot_number TEXT,
    supplier TEXT,
    product TEXT,
    
    -- Photo evidence (URLs from storage)
    photos TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.control_records ENABLE ROW LEVEL SECURITY;

-- Control records RLS
CREATE POLICY "Authenticated users can view all control records"
ON public.control_records
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert control records"
ON public.control_records
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = operator_id);

CREATE POLICY "Users can update their own records"
ON public.control_records
FOR UPDATE
TO authenticated
USING (auth.uid() = operator_id OR public.has_role(auth.uid(), 'quality_assistant') OR public.has_role(auth.uid(), 'admin'));

-- Non-conformities table
CREATE TABLE public.non_conformities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_record_id UUID REFERENCES public.control_records(id) ON DELETE CASCADE NOT NULL,
    control_point_code control_point_code NOT NULL,
    description TEXT NOT NULL,
    severity nc_severity NOT NULL DEFAULT 'minor',
    status nc_status NOT NULL DEFAULT 'open',
    assigned_to UUID REFERENCES auth.users(id),
    corrective_action TEXT,
    corrective_action_date TIMESTAMP WITH TIME ZONE,
    validated_by UUID REFERENCES auth.users(id),
    validated_at TIMESTAMP WITH TIME ZONE,
    photos TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.non_conformities ENABLE ROW LEVEL SECURITY;

-- Non-conformities RLS
CREATE POLICY "Authenticated users can view all non-conformities"
ON public.non_conformities
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Quality users can insert non-conformities"
ON public.non_conformities
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Quality users can update non-conformities"
ON public.non_conformities
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'quality_assistant') OR public.has_role(auth.uid(), 'admin') OR assigned_to = auth.uid());

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_control_records_updated_at
    BEFORE UPDATE ON public.control_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_non_conformities_updated_at
    BEFORE UPDATE ON public.non_conformities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for control photos
INSERT INTO storage.buckets (id, name, public) VALUES ('control-photos', 'control-photos', true);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'control-photos');

CREATE POLICY "Anyone can view photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'control-photos');

CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'control-photos' AND auth.uid()::text = (storage.foldername(name))[1]);