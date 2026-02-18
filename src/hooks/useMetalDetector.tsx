import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

// ===================== Types =====================

export interface MetalDetector {
  id: string;
  name: string;
  serial_number: string | null;
  production_line: string;
  last_calibration_date: string | null;
  test_kit_reference: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestConfig {
  id: string;
  test_piece_type: string;
  diameter_mm: number;
  is_active: boolean;
}

export interface MetalDetectorControl {
  id: string;
  metal_detector_id: string;
  operator_id: string;
  supervisor_id: string | null;
  control_moment: string;
  product_reference: string;
  lot_number: string;
  production_date: string;
  production_line: string;
  status: string;
  production_blocked: boolean;
  is_validated: boolean;
  validated_at: string | null;
  test_kit_reference: string | null;
  calibration_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  metal_detectors?: MetalDetector;
  metal_detector_tests?: MetalDetectorTest[];
  metal_detector_deviations?: MetalDetectorDeviation[];
}

export interface MetalDetectorTest {
  id: string;
  control_id: string;
  test_piece_type: string;
  diameter_mm: number;
  result: string;
  tested_at: string;
  created_at: string;
}

export interface MetalDetectorDeviation {
  id: string;
  control_id: string;
  cause_description: string;
  corrective_action: string;
  product_decision: string;
  release_justification: string | null;
  supervisor_id: string;
  supervisor_validated: boolean;
  supervisor_validated_at: string | null;
  retest_control_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetalDetectorSettings {
  id: string;
  check_interval_hours: number;
  updated_at: string;
  updated_by: string | null;
}

export interface MetalDetectorAuditLog {
  id: string;
  control_id: string | null;
  deviation_id: string | null;
  user_id: string;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

// ===================== Metal Detectors (machines) =====================

export function useMetalDetectors() {
  return useQuery({
    queryKey: ['metal_detectors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metal_detectors')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as MetalDetector[];
    },
  });
}

export function useCreateMetalDetector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: Omit<MetalDetector, 'id' | 'created_at' | 'updated_at' | 'is_active'>) => {
      const { data, error } = await supabase.from('metal_detectors').insert(d).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metal_detectors'] }); toast.success('Détecteur ajouté'); },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  });
}

export function useUpdateMetalDetector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...d }: Partial<MetalDetector> & { id: string }) => {
      const { error } = await supabase.from('metal_detectors').update(d).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metal_detectors'] }); toast.success('Détecteur mis à jour'); },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });
}

// ===================== Test Configs =====================

export function useTestConfigs() {
  return useQuery({
    queryKey: ['metal_detector_test_configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metal_detector_test_configs')
        .select('*')
        .eq('is_active', true)
        .order('test_piece_type');
      if (error) throw error;
      return data as TestConfig[];
    },
  });
}

export function useUpdateTestConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, diameter_mm }: { id: string; diameter_mm: number }) => {
      const { error } = await supabase.from('metal_detector_test_configs').update({ diameter_mm }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metal_detector_test_configs'] }); toast.success('Configuration mise à jour'); },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });
}

// ===================== Settings =====================

export function useMetalDetectorSettings() {
  return useQuery({
    queryKey: ['metal_detector_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('metal_detector_settings').select('*').limit(1).single();
      if (error) throw error;
      return data as MetalDetectorSettings;
    },
  });
}

export function useUpdateMetalDetectorSettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, check_interval_hours }: { id: string; check_interval_hours: number }) => {
      const { error } = await supabase.from('metal_detector_settings').update({ check_interval_hours, updated_by: user?.id }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metal_detector_settings'] }); toast.success('Paramètres mis à jour'); },
    onError: () => toast.error('Erreur'),
  });
}

// ===================== Controls (CCP sessions) =====================

export function useMetalDetectorControls(filters?: { date?: string; lot_number?: string; product_reference?: string; operator_id?: string }) {
  return useQuery({
    queryKey: ['metal_detector_controls', filters],
    queryFn: async () => {
      let query = supabase
        .from('metal_detector_controls')
        .select('*, metal_detectors(*), metal_detector_tests(*), metal_detector_deviations(*)')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (filters?.date) query = query.eq('production_date', filters.date);
      if (filters?.lot_number) query = query.ilike('lot_number', `%${filters.lot_number}%`);
      if (filters?.product_reference) query = query.ilike('product_reference', `%${filters.product_reference}%`);
      if (filters?.operator_id) query = query.eq('operator_id', filters.operator_id);

      const { data, error } = await query;
      if (error) throw error;
      return data as MetalDetectorControl[];
    },
  });
}

export function useTodayMetalDetectorControls(metalDetectorId?: string) {
  const today = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['metal_detector_controls_today', metalDetectorId, today],
    queryFn: async () => {
      let query = supabase
        .from('metal_detector_controls')
        .select('*, metal_detector_tests(*), metal_detector_deviations(*)')
        .eq('production_date', today)
        .order('created_at', { ascending: true });
      
      if (metalDetectorId) query = query.eq('metal_detector_id', metalDetectorId);

      const { data, error } = await query;
      if (error) throw error;
      return data as MetalDetectorControl[];
    },
    refetchInterval: 30000,
  });
}

export function useCreateMetalDetectorControl() {
  const qc = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      metal_detector_id: string;
      control_moment: string;
      product_reference: string;
      lot_number: string;
      production_date: string;
      production_line: string;
      test_kit_reference?: string;
      calibration_date?: string;
      notes?: string;
      tests: Array<{ test_piece_type: string; diameter_mm: number; result: string; tested_at: string }>;
    }) => {
      if (!user) throw new Error('Non authentifié');

      const allOK = data.tests.every(t => t.result === 'OK');
      const status = allOK ? 'valid' : 'deviation';
      const production_blocked = !allOK;

      // Insert control
      const { data: control, error: controlErr } = await supabase
        .from('metal_detector_controls')
        .insert({
          metal_detector_id: data.metal_detector_id,
          operator_id: user.id,
          control_moment: data.control_moment,
          product_reference: data.product_reference,
          lot_number: data.lot_number,
          production_date: data.production_date,
          production_line: data.production_line,
          status,
          production_blocked,
          is_validated: allOK,
          validated_at: allOK ? new Date().toISOString() : null,
          test_kit_reference: data.test_kit_reference || null,
          calibration_date: data.calibration_date || null,
          notes: data.notes || null,
        })
        .select()
        .single();
      if (controlErr) throw controlErr;

      // Insert tests
      const tests = data.tests.map(t => ({
        control_id: control.id,
        test_piece_type: t.test_piece_type,
        diameter_mm: t.diameter_mm,
        result: t.result,
        tested_at: t.tested_at,
      }));
      const { error: testsErr } = await supabase.from('metal_detector_tests').insert(tests);
      if (testsErr) throw testsErr;

      // Audit log
      await supabase.from('metal_detector_audit_logs').insert({
        control_id: control.id,
        user_id: user.id,
        action: 'control_created',
        new_values: { status, production_blocked, tests: data.tests },
      });

      return control;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metal_detector_controls'] });
      qc.invalidateQueries({ queryKey: ['metal_detector_controls_today'] });
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });
}

// ===================== Deviations =====================

export function useCreateDeviation() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      control_id: string;
      cause_description: string;
      corrective_action: string;
      product_decision: string;
      release_justification?: string;
      supervisor_id: string;
    }) => {
      if (!user) throw new Error('Non authentifié');

      const { data: deviation, error } = await supabase
        .from('metal_detector_deviations')
        .insert({
          control_id: data.control_id,
          cause_description: data.cause_description,
          corrective_action: data.corrective_action,
          product_decision: data.product_decision,
          release_justification: data.release_justification || null,
          supervisor_id: data.supervisor_id,
        })
        .select()
        .single();
      if (error) throw error;

      // Audit log
      await supabase.from('metal_detector_audit_logs').insert({
        control_id: data.control_id,
        deviation_id: deviation.id,
        user_id: user.id,
        action: 'deviation_created',
        new_values: data,
      });

      return deviation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metal_detector_controls'] });
      qc.invalidateQueries({ queryKey: ['metal_detector_controls_today'] });
      toast.success('Déviation enregistrée');
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });
}

export function useValidateDeviation() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ deviationId, controlId, retestControlId }: { deviationId: string; controlId: string; retestControlId?: string }) => {
      if (!user) throw new Error('Non authentifié');

      // Validate deviation
      const { error } = await supabase
        .from('metal_detector_deviations')
        .update({
          supervisor_validated: true,
          supervisor_validated_at: new Date().toISOString(),
          retest_control_id: retestControlId || null,
        })
        .eq('id', deviationId);
      if (error) throw error;

      // Unblock production if retest passed
      if (retestControlId) {
        await supabase
          .from('metal_detector_controls')
          .update({ production_blocked: false })
          .eq('id', controlId);
      }

      // Audit
      await supabase.from('metal_detector_audit_logs').insert({
        control_id: controlId,
        deviation_id: deviationId,
        user_id: user.id,
        action: 'deviation_validated',
        new_values: { supervisor_validated: true, retest_control_id: retestControlId },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metal_detector_controls'] });
      qc.invalidateQueries({ queryKey: ['metal_detector_controls_today'] });
      toast.success('Déviation validée par le superviseur');
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });
}

// ===================== Audit Logs =====================

export function useMetalDetectorAuditLogs(controlId?: string) {
  return useQuery({
    queryKey: ['metal_detector_audit_logs', controlId],
    queryFn: async () => {
      let query = supabase.from('metal_detector_audit_logs').select('*').order('created_at', { ascending: false });
      if (controlId) query = query.eq('control_id', controlId);
      const { data, error } = await query;
      if (error) throw error;
      return data as MetalDetectorAuditLog[];
    },
    enabled: !!controlId,
  });
}
