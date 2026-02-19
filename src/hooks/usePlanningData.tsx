import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, addDays, format, isSameDay, isBefore, startOfDay } from 'date-fns';

export interface DayControlStatus {
  code: string;
  label: string;
  frequency: 'daily' | 'per_reception' | 'per_production';
  status: 'done_conforme' | 'done_acceptable' | 'done_nonconforme' | 'overdue' | 'pending' | 'not_required';
  count?: number; // how many records for that day
}

// Define expected controls
const EXPECTED_CONTROLS = [
  { code: 'CP_STOCKAGE', label: 'Températures Stockage', frequency: 'daily' as const },
  { code: 'CP_RECEPTION', label: 'Contrôle Réception', frequency: 'per_reception' as const },
  { code: 'CP5_CORPS_ETRANGER', label: 'Détecteur Métaux', frequency: 'per_production' as const },
  { code: 'CP8_DLC_PERIMEE', label: 'Vérification DLC', frequency: 'daily' as const },
  { code: 'CP_PRODUCTION', label: 'Traçabilité Production', frequency: 'daily' as const },
];

export function usePlanningData(weekStart: Date) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(addDays(weekEnd, 1), 'yyyy-MM-dd');

  // Fetch control_records for the week
  const controlRecordsQuery = useQuery({
    queryKey: ['planning_control_records', startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_records')
        .select('id, control_point_code, timestamp, status')
        .gte('timestamp', `${startStr}T00:00:00`)
        .lt('timestamp', `${endStr}T00:00:00`)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch storage_temperature_records for the week
  const storageRecordsQuery = useQuery({
    queryKey: ['planning_storage_records', startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storage_temperature_records')
        .select('id, recorded_at, status')
        .gte('recorded_at', `${startStr}T00:00:00`)
        .lt('recorded_at', `${endStr}T00:00:00`);
      if (error) throw error;
      return data;
    },
  });

  // Fetch metal detector controls for the week
  const metalDetectorQuery = useQuery({
    queryKey: ['planning_metal_detector', startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metal_detector_controls')
        .select('id, production_date, status')
        .gte('production_date', startStr)
        .lte('production_date', format(weekEnd, 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    },
  });

  const isLoading = controlRecordsQuery.isLoading || storageRecordsQuery.isLoading || metalDetectorQuery.isLoading;

  const getControlsForDay = (day: Date): DayControlStatus[] => {
    const controlRecords = controlRecordsQuery.data || [];
    const storageRecords = storageRecordsQuery.data || [];
    const metalRecords = metalDetectorQuery.data || [];
    const today = startOfDay(new Date());
    const dayStart = startOfDay(day);
    const isPast = isBefore(dayStart, today);
    const isToday = isSameDay(dayStart, today);
    const dayStr = format(day, 'yyyy-MM-dd');

    return EXPECTED_CONTROLS.map((ctrl) => {
      let records: Array<{ status?: string }> = [];

      if (ctrl.code === 'CP_STOCKAGE') {
        records = storageRecords.filter(r => isSameDay(new Date(r.recorded_at), day));
      } else if (ctrl.code === 'CP5_CORPS_ETRANGER') {
        records = metalRecords.filter(r => r.production_date === dayStr);
      } else {
        records = controlRecords.filter(r => 
          r.control_point_code === ctrl.code && isSameDay(new Date(r.timestamp), day)
        );
      }

      const count = records.length;

      if (count === 0) {
        // No records for this day
        if (isPast) {
          // For non-daily controls on past days, mark as not_required if it's optional
          if (ctrl.frequency !== 'daily') {
            return { ...ctrl, status: 'not_required' as const, count: 0 };
          }
          return { ...ctrl, status: 'overdue' as const, count: 0 };
        }
        if (isToday) {
          return { ...ctrl, status: 'pending' as const, count: 0 };
        }
        // Future
        return { ...ctrl, status: 'pending' as const, count: 0 };
      }

      // Determine worst status
      const hasNonConforme = records.some(r => {
        if (ctrl.code === 'CP5_CORPS_ETRANGER') return r.status === 'deviation';
        return r.status === 'nonconforme';
      });
      const hasAcceptable = records.some(r => r.status === 'acceptable');

      if (hasNonConforme) return { ...ctrl, status: 'done_nonconforme' as const, count };
      if (hasAcceptable) return { ...ctrl, status: 'done_acceptable' as const, count };
      return { ...ctrl, status: 'done_conforme' as const, count };
    });
  };

  return { getControlsForDay, isLoading };
}
