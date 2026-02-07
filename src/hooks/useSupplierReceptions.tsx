import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReceptionLineInput {
  raw_material_id: string;
  quantity_received: number;
  unit: string;
  order_line_id?: string | null;
}

interface CreateReceptionInput {
  supplier_id: string;
  order_id?: string | null;
  delivery_note_number: string;
  notes?: string | null;
  lines: ReceptionLineInput[];
}

export function useReceivedQuantitiesByOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['received_quantities', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_receptions')
        .select(`
          supplier_reception_lines (
            order_line_id,
            quantity_received
          )
        `)
        .eq('order_id', orderId!);

      if (error) throw error;

      const received: Record<string, number> = {};
      data?.forEach((reception: any) => {
        const lines = reception.supplier_reception_lines || [];
        lines.forEach((line: any) => {
          if (line.order_line_id) {
            received[line.order_line_id] =
              (received[line.order_line_id] || 0) + Number(line.quantity_received);
          }
        });
      });

      return received;
    },
    enabled: !!orderId,
  });
}

export function useCreateReception() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReceptionInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data: reception, error: receptionError } = await supabase
        .from('supplier_receptions')
        .insert({
          supplier_id: input.supplier_id,
          order_id: input.order_id || null,
          delivery_note_number: input.delivery_note_number,
          operator_id: user.id,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (receptionError) throw receptionError;

      const lines = input.lines
        .filter((l) => l.quantity_received > 0)
        .map((line) => ({
          reception_id: (reception as any).id,
          raw_material_id: line.raw_material_id,
          quantity_received: line.quantity_received,
          unit: line.unit,
          order_line_id: line.order_line_id || null,
        }));

      if (lines.length === 0) throw new Error('Aucune quantité saisie');

      const { error: linesError } = await supabase
        .from('supplier_reception_lines')
        .insert(lines);

      if (linesError) throw linesError;

      return reception;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_orders'] });
      queryClient.invalidateQueries({ queryKey: ['received_quantities'] });
      toast.success('Réception enregistrée avec succès');
    },
    onError: (error: any) => {
      toast.error(
        error.message || "Erreur lors de l'enregistrement de la réception"
      );
      console.error(error);
    },
  });
}
