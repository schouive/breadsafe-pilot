import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type TimeEventType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';

export interface TimeEntry {
  id: string;
  employee_id: string;
  badge_id: string;
  event_type: TimeEventType;
  recorded_at: string;
  device_id: string | null;
  scan_speed_ms: number | null;
  is_manual_correction: boolean;
  photo_url: string | null;
  created_at: string;
  // Joined
  employee_name?: string;
  employee_photo?: string;
}

export interface TimeCorrection {
  id: string;
  time_entry_id: string;
  requested_by: string;
  original_event_type: string;
  corrected_event_type: string | null;
  original_recorded_at: string;
  corrected_recorded_at: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
}

// Find employee by badge ID
export function useEmployeeByBadge() {
  return useMutation({
    mutationFn: async (badgeId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, badge_id, photo_url, avatar_url')
        .eq('badge_id', badgeId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

// Get last event for an employee
export function useLastTimeEvent(employeeId: string | null) {
  return useQuery({
    queryKey: ['last-time-event', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as TimeEntry | null;
    },
    enabled: !!employeeId,
    refetchInterval: 5000,
  });
}

// Record a time event
export function useRecordTimeEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      badgeId,
      eventType,
      scanSpeedMs,
      deviceId,
      photoUrl,
    }: {
      employeeId: string;
      badgeId: string;
      eventType: TimeEventType;
      scanSpeedMs?: number;
      deviceId?: string;
      photoUrl?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          employee_id: employeeId,
          badge_id: badgeId,
          event_type: eventType,
          scan_speed_ms: scanSpeedMs || null,
          device_id: deviceId || null,
          photo_url: photoUrl || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['last-time-event', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
}

// Get time entries with filters
export function useTimeEntries(options?: {
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['time-entries', options],
    queryFn: async () => {
      let query = supabase
        .from('time_entries')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId);
      }
      if (options?.dateFrom) {
        query = query.gte('recorded_at', options.dateFrom);
      }
      if (options?.dateTo) {
        query = query.lte('recorded_at', options.dateTo);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      } else {
        query = query.limit(500);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with employee names
      const employeeIds = [...new Set((data || []).map((e) => e.employee_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, avatar_url')
        .in('id', employeeIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, { name: p.full_name, photo: p.photo_url || p.avatar_url }])
      );

      return (data || []).map((entry) => ({
        ...entry,
        employee_name: profileMap.get(entry.employee_id)?.name || 'Inconnu',
        employee_photo: profileMap.get(entry.employee_id)?.photo,
      })) as TimeEntry[];
    },
  });
}

// Get all employees with badges
export function useEmployeesWithBadges() {
  return useQuery({
    queryKey: ['employees-badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, badge_id, photo_url, avatar_url, is_active')
        .not('badge_id', 'is', null)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
  });
}

// Get time corrections
export function useTimeCorrections(status?: string) {
  return useQuery({
    queryKey: ['time-corrections', status],
    queryFn: async () => {
      let query = supabase
        .from('time_corrections')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TimeCorrection[];
    },
  });
}

// Create correction request
export function useCreateCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (correction: {
      time_entry_id: string;
      requested_by: string;
      original_event_type: string;
      corrected_event_type?: string;
      original_recorded_at: string;
      corrected_recorded_at?: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('time_corrections')
        .insert(correction)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-corrections'] });
      toast.success('Demande de correction créée');
    },
  });
}

// Review correction
export function useReviewCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      correctionId,
      status,
      reviewerId,
      comment,
    }: {
      correctionId: string;
      status: 'approved' | 'rejected';
      reviewerId: string;
      comment?: string;
    }) => {
      const { error } = await supabase
        .from('time_corrections')
        .update({
          status,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_comment: comment || null,
        })
        .eq('id', correctionId);

      if (error) throw error;

      // If approved, insert a corrected entry
      if (status === 'approved') {
        const { data: correction } = await supabase
          .from('time_corrections')
          .select('*')
          .eq('id', correctionId)
          .single();

        if (correction && (correction.corrected_event_type || correction.corrected_recorded_at)) {
          const { data: originalEntry } = await supabase
            .from('time_entries')
            .select('*')
            .eq('id', correction.time_entry_id)
            .single();

          if (originalEntry) {
            await supabase.from('time_entries').insert({
              employee_id: originalEntry.employee_id,
              badge_id: originalEntry.badge_id,
              event_type: correction.corrected_event_type || originalEntry.event_type,
              recorded_at: correction.corrected_recorded_at || originalEntry.recorded_at,
              device_id: 'correction',
              is_manual_correction: true,
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Correction traitée');
    },
  });
}

// Calculate daily stats for an employee
export function useEmployeeDailyStats(employeeId: string | null, date: string) {
  return useQuery({
    queryKey: ['employee-daily-stats', employeeId, date],
    queryFn: async () => {
      if (!employeeId) return null;
      
      const dayStart = `${date}T00:00:00Z`;
      const dayEnd = `${date}T23:59:59Z`;

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('recorded_at', dayStart)
        .lte('recorded_at', dayEnd)
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      const entries = data || [];
      let totalWorkMs = 0;
      let totalBreakMs = 0;
      let clockInTime: Date | null = null;
      let breakStartTime: Date | null = null;

      for (const entry of entries) {
        const time = new Date(entry.recorded_at);
        switch (entry.event_type) {
          case 'clock_in':
            clockInTime = time;
            break;
          case 'break_start':
            if (clockInTime) {
              totalWorkMs += time.getTime() - clockInTime.getTime();
              clockInTime = null;
            }
            breakStartTime = time;
            break;
          case 'break_end':
            if (breakStartTime) {
              totalBreakMs += time.getTime() - breakStartTime.getTime();
              breakStartTime = null;
            }
            clockInTime = time;
            break;
          case 'clock_out':
            if (clockInTime) {
              totalWorkMs += time.getTime() - clockInTime.getTime();
              clockInTime = null;
            }
            break;
        }
      }

      return {
        entries,
        totalWorkMs,
        totalBreakMs,
        totalWorkHours: totalWorkMs / (1000 * 60 * 60),
        totalBreakMinutes: totalBreakMs / (1000 * 60),
      };
    },
    enabled: !!employeeId,
  });
}
