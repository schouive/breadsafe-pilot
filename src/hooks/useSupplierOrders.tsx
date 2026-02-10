import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupplierOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  status: 'draft' | 'sent' | 'partially_received' | 'received';
  order_date: string;
  expected_delivery_date: string | null;
  comment: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierOrderLine {
  id: string;
  order_id: string;
  raw_material_id: string;
  quantity_ordered: number;
  unit: string;
  created_at: string;
}

export interface SupplierOrderWithSupplier extends SupplierOrder {
  suppliers: { id: string; name: string } | null;
}

export interface OrderLineWithMaterial extends SupplierOrderLine {
  raw_materials: {
    id: string;
    name: string;
    unit: string | null;
    purchase_unit: string | null;
  } | null;
}

export interface SupplierOrderFull extends SupplierOrder {
  suppliers: {
    id: string;
    name: string;
    order_email: string | null;
    email: string | null;
    client_code: string | null;
  } | null;
  supplier_order_lines: OrderLineWithMaterial[];
}

interface UpdateOrderInput {
  id: string;
  expected_delivery_date?: string | null;
  comment?: string | null;
  lines: { raw_material_id: string; quantity: number; unit: string }[];
}

interface OrderFilters {
  supplierId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useSupplierOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ['supplier_orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('supplier_orders')
        .select(`
          *,
          suppliers ( id, name )
        `)
        .order('order_date', { ascending: false });

      if (filters?.supplierId) query = query.eq('supplier_id', filters.supplierId);
      if (filters?.status) query = query.eq('status', filters.status as any);
      if (filters?.dateFrom) query = query.gte('order_date', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('order_date', filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as SupplierOrderWithSupplier[];
    },
  });
}

export function useSupplierOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['supplier_order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_orders')
        .select(`
          *,
          suppliers ( id, name, order_email, email, client_code ),
          supplier_order_lines (
            *,
            raw_materials ( id, name, unit, purchase_unit )
          )
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as unknown as SupplierOrderFull;
    },
    enabled: !!id,
  });
}

export function useOpenOrdersBySupplier(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['supplier_orders', 'open', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_orders')
        .select(`
          *,
          supplier_order_lines (
            *,
            raw_materials ( id, name, unit, purchase_unit )
          )
        `)
        .eq('supplier_id', supplierId!)
        .in('status', ['draft', 'sent', 'partially_received'] as any)
        .order('order_date', { ascending: false });

      if (error) throw error;
      return data as unknown as (SupplierOrder & {
        supplier_order_lines: OrderLineWithMaterial[];
      })[];
    },
    enabled: !!supplierId,
  });
}

interface CreateOrderInput {
  supplier_id: string;
  expected_delivery_date?: string | null;
  comment?: string | null;
  lines: { raw_material_id: string; quantity: number; unit: string }[];
}

export function useCreateSupplierOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data: order, error: orderError } = await supabase
        .from('supplier_orders')
        .insert({
          supplier_id: input.supplier_id,
          expected_delivery_date: input.expected_delivery_date || null,
          comment: input.comment || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const lines = input.lines
        .filter((l) => l.quantity > 0)
        .map((line) => ({
          order_id: (order as any).id,
          raw_material_id: line.raw_material_id,
          quantity_ordered: line.quantity,
          unit: line.unit,
        }));

      if (lines.length === 0) throw new Error('Aucune ligne de commande');

      const { error: linesError } = await supabase
        .from('supplier_order_lines')
        .insert(lines);

      if (linesError) throw linesError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_orders'] });
      toast.success('Commande créée avec succès');
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la création de la commande");
      console.error(error);
    },
  });
}
