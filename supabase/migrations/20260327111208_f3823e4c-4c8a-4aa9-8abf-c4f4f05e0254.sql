
-- Add badge_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badge_id text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url text;

-- Time entries table
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  device_id text,
  scan_speed_ms integer,
  is_manual_correction boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view their own entries
CREATE POLICY "Users can view own time entries"
  ON public.time_entries FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role]));

-- Only system/edge function inserts (via service role or the user themselves for scan)
CREATE POLICY "Users can insert own time entries"
  ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role]));

-- No update/delete allowed (audit-proof)
-- Admins can view all
CREATE POLICY "Admins can view all time entries"
  ON public.time_entries FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role]));

-- Time corrections table
CREATE TABLE public.time_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid NOT NULL REFERENCES public.time_entries(id),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  original_event_type text NOT NULL,
  corrected_event_type text,
  original_recorded_at timestamptz NOT NULL,
  corrected_recorded_at timestamptz,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.time_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own corrections"
  ON public.time_corrections FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role]));

CREATE POLICY "Managers can insert corrections"
  ON public.time_corrections FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role]));

CREATE POLICY "Managers can update corrections"
  ON public.time_corrections FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'quality_assistant'::app_role]));

-- Index for fast lookups
CREATE INDEX idx_time_entries_employee_recorded ON public.time_entries(employee_id, recorded_at DESC);
CREATE INDEX idx_time_entries_badge ON public.time_entries(badge_id);
CREATE INDEX idx_profiles_badge ON public.profiles(badge_id);

-- Enable realtime for time entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;
