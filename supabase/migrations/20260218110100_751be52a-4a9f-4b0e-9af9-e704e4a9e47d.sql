
-- =============================================
-- CCP Metal Detector Module - Complete Schema
-- =============================================

-- Metal detector machines registry
CREATE TABLE public.metal_detectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  serial_number text,
  production_line text NOT NULL,
  last_calibration_date date,
  test_kit_reference text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metal_detectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view metal detectors" ON public.metal_detectors FOR SELECT USING (true);
CREATE POLICY "Quality and admin can manage metal detectors" ON public.metal_detectors FOR ALL USING (has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_metal_detectors_updated_at BEFORE UPDATE ON public.metal_detectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Test piece configurations (configurable Fe/Al/Inox diameters)
CREATE TABLE public.metal_detector_test_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_piece_type text NOT NULL,
  diameter_mm numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_piece_type)
);

ALTER TABLE public.metal_detector_test_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view test configs" ON public.metal_detector_test_configs FOR SELECT USING (true);
CREATE POLICY "Quality and admin can manage test configs" ON public.metal_detector_test_configs FOR ALL USING (has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_metal_detector_test_configs_updated_at BEFORE UPDATE ON public.metal_detector_test_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default test piece configs
INSERT INTO public.metal_detector_test_configs (test_piece_type, diameter_mm) VALUES
  ('Fe', 2.0),
  ('Al', 2.5),
  ('Inox', 3.0);

-- CCP control sessions
CREATE TABLE public.metal_detector_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metal_detector_id uuid REFERENCES public.metal_detectors(id) NOT NULL,
  operator_id uuid NOT NULL,
  supervisor_id uuid,
  control_moment text NOT NULL,
  product_reference text NOT NULL,
  lot_number text NOT NULL,
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  production_line text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  production_blocked boolean NOT NULL DEFAULT false,
  is_validated boolean NOT NULL DEFAULT false,
  validated_at timestamptz,
  test_kit_reference text,
  calibration_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metal_detector_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view metal detector controls" ON public.metal_detector_controls FOR SELECT USING (true);
CREATE POLICY "Users can insert metal detector controls" ON public.metal_detector_controls FOR INSERT WITH CHECK (auth.uid() = operator_id);
CREATE POLICY "Authorized users can update metal detector controls" ON public.metal_detector_controls FOR UPDATE USING (
  (auth.uid() = operator_id AND is_validated = false)
  OR has_role(auth.uid(), 'quality_assistant'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE TRIGGER update_metal_detector_controls_updated_at BEFORE UPDATE ON public.metal_detector_controls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Individual test results (Fe, Al, Inox per control)
CREATE TABLE public.metal_detector_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid REFERENCES public.metal_detector_controls(id) ON DELETE CASCADE NOT NULL,
  test_piece_type text NOT NULL,
  diameter_mm numeric NOT NULL,
  result text NOT NULL,
  tested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metal_detector_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view metal detector tests" ON public.metal_detector_tests FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert metal detector tests" ON public.metal_detector_tests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.metal_detector_controls WHERE id = control_id AND operator_id = auth.uid() AND is_validated = false)
);

-- Deviation records
CREATE TABLE public.metal_detector_deviations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid REFERENCES public.metal_detector_controls(id) NOT NULL,
  cause_description text NOT NULL,
  corrective_action text NOT NULL,
  product_decision text NOT NULL,
  release_justification text,
  supervisor_id uuid NOT NULL,
  supervisor_validated boolean NOT NULL DEFAULT false,
  supervisor_validated_at timestamptz,
  retest_control_id uuid REFERENCES public.metal_detector_controls(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metal_detector_deviations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view deviations" ON public.metal_detector_deviations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert deviations" ON public.metal_detector_deviations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Supervisors can update deviations" ON public.metal_detector_deviations FOR UPDATE USING (
  has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE TRIGGER update_metal_detector_deviations_updated_at BEFORE UPDATE ON public.metal_detector_deviations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Global settings (check interval etc.)
CREATE TABLE public.metal_detector_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_interval_hours numeric NOT NULL DEFAULT 2,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.metal_detector_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view md settings" ON public.metal_detector_settings FOR SELECT USING (true);
CREATE POLICY "Quality and admin can manage md settings" ON public.metal_detector_settings FOR ALL USING (has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'quality_assistant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.metal_detector_settings (check_interval_hours) VALUES (2);

-- Audit log for CCP changes
CREATE TABLE public.metal_detector_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid REFERENCES public.metal_detector_controls(id),
  deviation_id uuid REFERENCES public.metal_detector_deviations(id),
  user_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metal_detector_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view md audit logs" ON public.metal_detector_audit_logs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert md audit logs" ON public.metal_detector_audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
