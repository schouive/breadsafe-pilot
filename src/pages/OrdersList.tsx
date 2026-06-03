import { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, isSameDay, isToday, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ClipboardList, Eye, Mail, Loader2, Pencil, Save, X, Trash2, FileText, Send, Clock, CheckCircle2, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useSupplierOrders, useSupplierOrder, useUpdateSupplierOrder, useDeleteSupplierOrder, SupplierOrderWithSupplier } from '@/hooks/useSupplierOrders';
import { useSuppliers, useRawMaterials } from '@/hooks/useSuppliers';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  partially_received: 'Partielle',
  received: 'Reçue',
};

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  draft: { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted' },
  sent: { icon: Send, color: 'text-primary', bg: 'bg-primary/10' },
  partially_received: { icon: Package, color: 'text-[hsl(38,92%,40%)]', bg: 'bg-[hsl(var(--status-acceptable-light))]' },
  received: { icon: CheckCircle2, color: 'text-[hsl(142,71%,35%)]', bg: 'bg-[hsl(var(--status-conforme-light))]' },
};

function isOrderLate(
  order: { id: string; status: string; expected_delivery_date: string | null },
  receivedOrderIds?: Set<string>
) {
  // Une commande dont la réception a été saisie (partielle ou complète) n'est plus "en retard"
  if (order.status === 'received' || order.status === 'partially_received') return false;
  // Ou si une réception HACCP (CP_RECEPTION) a déjà été enregistrée pour cette commande
  if (receivedOrderIds?.has(order.id)) return false;
  if (!order.expected_delivery_date) return false;
  return isPast(parseISO(order.expected_delivery_date));
}

const ORDER_UNITS = [
  { value: 'bidon', label: 'Bidon(s)' },
  { value: 'carton', label: 'Carton(s)' },
  { value: 'palette', label: 'Palette(s)' },
  { value: 'piece', label: 'Pièce(s)' },
  { value: 'ramette', label: 'Ramette(s)' },
  { value: 'sac', label: 'Sac(s)' },
  { value: 'seau', label: 'Sceau(x)' },
];

export default function OrdersList() {
  const queryClient = useQueryClient();
  const [sendingEmail, setSendingEmail] = useState(false);
  const { data: suppliers } = useSuppliers();
  const [detailOrderId, setDetailOrderId] = useState<string | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editLines, setEditLines] = useState<{ raw_material_id: string; name: string; quantity: number; unit: string }[]>([]);

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const updateOrder = useUpdateSupplierOrder();
  const deleteOrder = useDeleteSupplierOrder();

  // Fetch all orders (no date filter — we filter client-side for the calendar)
  const { data: orders, isLoading } = useSupplierOrders({});
  const { data: detailOrder } = useSupplierOrder(detailOrderId);
  const { data: rawMaterials } = useRawMaterials(detailOrder?.supplier_id);

  // Fetch order_ids that already have a CP_RECEPTION control record (HACCP reception)
  const { data: receivedOrderIds } = useQuery({
    queryKey: ['cp_reception_order_ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_records')
        .select('order_id')
        .eq('control_point_code', 'CP_RECEPTION')
        .not('order_id', 'is', null);
      if (error) throw error;
      return new Set<string>((data || []).map((r: any) => r.order_id));
    },
  });

  const [filterSupplierId, setFilterSupplierId] = useState<string>('all');

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const filteredOrders = filterSupplierId === 'all'
    ? orders
    : orders?.filter((o) => o.supplier_id === filterSupplierId);

  const getOrdersForDay = (date: Date) => {
    if (!filteredOrders) return [];
    return filteredOrders.filter((o) => {
      const orderDate = o.expected_delivery_date || o.order_date;
      return isSameDay(parseISO(orderDate), date);
    });
  };

  // Unique suppliers from orders
  const orderSuppliers = Array.from(
    new Map(orders?.map((o) => [o.supplier_id, o.suppliers?.name]) ?? [])
  ).sort((a, b) => (a[1] || '').localeCompare(b[1] || ''));

  // Stats
  const lateCount = filteredOrders?.filter((o) => isOrderLate(o, receivedOrderIds)).length ?? 0;
  const todayOrders = getOrdersForDay(new Date());
  const pendingToday = todayOrders.filter((o) => o.status !== 'received').length;

  const startEditing = () => {
    if (!detailOrder) return;
    setEditDate(detailOrder.expected_delivery_date || '');
    setEditComment(detailOrder.comment || '');
    const existingLines = detailOrder.supplier_order_lines || [];
    if (rawMaterials) {
      const lines = rawMaterials.map((m) => {
        const existing = existingLines.find((l) => l.raw_material_id === m.id);
        return {
          raw_material_id: m.id,
          name: m.name,
          quantity: existing?.quantity_ordered ?? 0,
          unit: existing?.unit ?? ((m as any).order_unit || m.purchase_unit || m.unit || 'kg'),
        };
      });
      setEditLines(lines);
    } else {
      setEditLines(existingLines.map((l) => ({
        raw_material_id: l.raw_material_id,
        name: l.raw_materials?.name || '—',
        quantity: l.quantity_ordered,
        unit: l.unit,
      })));
    }
    setIsEditing(true);
  };

  const cancelEditing = () => setIsEditing(false);

  const handleSaveEdit = async () => {
    if (!detailOrder) return;
    const validLines = editLines.filter((l) => l.quantity > 0);
    if (validLines.length === 0) {
      toast.error('Au moins une ligne avec quantité > 0 est requise');
      return;
    }
    await updateOrder.mutateAsync({
      id: detailOrder.id,
      expected_delivery_date: editDate || null,
      comment: editComment || null,
      lines: validLines,
    });
    setIsEditing(false);
  };

  const handleSendEmail = async () => {
    if (!detailOrder) return;
    const recipientEmail = detailOrder.suppliers?.order_email || detailOrder.suppliers?.email;
    if (!recipientEmail) {
      toast.error("Aucun email configuré pour ce fournisseur");
      return;
    }
    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-order-email', {
        body: {
          orderId: detailOrder.id,
          recipientEmail,
          senderName: 'Bread Shop',
        },
      });
      if (error) throw error;
      await supabase
        .from('supplier_orders')
        .update({ status: 'sent' as any })
        .eq('id', detailOrder.id);
      queryClient.invalidateQueries({ queryKey: ['supplier_orders'] });
      queryClient.invalidateQueries({ queryKey: ['supplier_order', detailOrder.id] });
      toast.success(`Email envoyé à ${recipientEmail}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commandes fournisseurs</h1>
          <p className="text-muted-foreground mt-1">Calendrier et suivi des commandes</p>
        </div>
        <div className="flex items-center gap-3">
          {lateCount > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {lateCount} en retard
            </Badge>
          )}
          <Badge variant="outline" className="text-sm px-3 py-1">
            {pendingToday} commande{pendingToday > 1 ? 's' : ''} aujourd'hui
          </Badge>
        </div>
      </div>

      {/* Supplier filter */}
      {orderSuppliers.length > 1 && (
        <div className="flex items-center gap-3">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Fournisseur</Label>
          <Select value={filterSupplierId} onValueChange={setFilterSupplierId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Tous les fournisseurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les fournisseurs</SelectItem>
              {orderSuppliers.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name || '—'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(currentWeekStart, 'd MMMM', { locale: fr })} – {format(addDays(currentWeekStart, 6), 'd MMMM yyyy', { locale: fr })}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Week grid */}
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Chargement...</div>
      ) : weekDays.every((day) => getOrdersForDay(day).length === 0) ? (
        <div className="py-16 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">Aucune commande cette semaine</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {weekDays.filter((day) => getOrdersForDay(day).length > 0).map((day) => {
            const dayOrders = getOrdersForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'bg-card rounded-xl border p-4 min-h-[200px]',
                  isCurrentDay ? 'border-primary ring-1 ring-primary/20' : 'border-border'
                )}
              >
                {/* Day header */}
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground capitalize">
                    {format(day, 'EEEE', { locale: fr })}
                  </p>
                  <p className={cn(
                    'text-xl font-bold mt-1',
                    isCurrentDay ? 'text-primary' : 'text-foreground'
                  )}>
                    {format(day, 'd', { locale: fr })}
                  </p>
                </div>

                {/* Orders for the day */}
                <div className="space-y-2">
                  {dayOrders.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center">
                      Aucune commande
                    </p>
                  ) : (
                    dayOrders.map((order) => {
                      const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
                      const StatusIcon = statusCfg.icon;
                      const late = isOrderLate(order);

                      return (
                        <button
                          key={order.id}
                          onClick={() => setDetailOrderId(order.id)}
                          className={cn(
                            'w-full rounded-lg p-2 text-xs text-left transition-colors hover:ring-1 hover:ring-primary/30',
                            late ? 'bg-destructive/10' : statusCfg.bg
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {late ? (
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-destructive" />
                            ) : (
                              <StatusIcon className={cn('h-3.5 w-3.5 mt-0.5 flex-shrink-0', statusCfg.color)} />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {order.suppliers?.name || '—'}
                              </p>
                              <p className="text-muted-foreground mt-0.5 font-mono">
                                {order.order_number}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={cn('h-3 w-3 rounded-full', cfg.bg, 'ring-1 ring-current/30', cfg.color)} />
            <span className="text-muted-foreground">{STATUS_LABELS[key]}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-destructive/10 ring-1 ring-destructive/30" />
          <span className="text-muted-foreground">En retard</span>
        </div>
      </div>

      {/* Order Detail Sheet */}
      <Sheet open={!!detailOrderId} onOpenChange={(open) => { if (!open) { setDetailOrderId(undefined); setIsEditing(false); } }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="font-mono">
                {detailOrder?.order_number || 'Chargement...'}
              </SheetTitle>
              {detailOrder && !isEditing && (
                <div className="flex items-center gap-2">
                  {(detailOrder.status as string) === 'draft' && (
                    <Button variant="outline" size="sm" onClick={startEditing}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Modifier
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer la commande</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer la commande {detailOrder.order_number} ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={async () => {
                            await deleteOrder.mutateAsync(detailOrder.id);
                            setDetailOrderId(undefined);
                          }}
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </SheetHeader>
          {detailOrder && !isEditing && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fournisseur</p>
                  <p className="font-medium">{detailOrder.suppliers?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Statut</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className={cn(
                      STATUS_CONFIG[detailOrder.status]?.bg,
                      STATUS_CONFIG[detailOrder.status]?.color
                    )}>
                      {STATUS_LABELS[detailOrder.status]}
                    </Badge>
                    {isOrderLate(detailOrder) && (
                      <Badge variant="destructive">Retard</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Date commande</p>
                  <p className="font-medium">
                    {format(new Date(detailOrder.order_date), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Réception prévue</p>
                  <p className="font-medium">
                    {detailOrder.expected_delivery_date
                      ? format(new Date(detailOrder.expected_delivery_date), 'dd/MM/yyyy', { locale: fr })
                      : '—'}
                  </p>
                </div>
              </div>

              {detailOrder.comment && (
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Commentaire</p>
                  <p className="bg-muted/50 rounded-lg p-3">{detailOrder.comment}</p>
                </div>
              )}

              <div>
                <h3 className="font-medium mb-3">Lignes de commande</h3>
                <div className="space-y-2">
                  {detailOrder.supplier_order_lines?.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <span className="text-sm font-medium">
                        {line.raw_materials?.name || '—'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {line.quantity_ordered} {line.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Edit Mode */}
          {detailOrder && isEditing && (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Date de réception prévue</Label>
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Commentaire</Label>
                  <Textarea
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    placeholder="Commentaire libre..."
                    rows={2}
                  />
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Lignes de commande</h3>
                <div className="space-y-2">
                  {editLines.map((line) => (
                    <div
                      key={line.raw_material_id}
                      className={cn(
                        'p-3 rounded-lg border transition-colors',
                        line.quantity > 0 ? 'border-primary/40 bg-primary/5' : 'bg-card'
                      )}
                    >
                      <p className="font-medium text-sm mb-2 truncate">{line.name}</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={line.quantity || ''}
                          onChange={(e) => {
                            const qty = parseFloat(e.target.value) || 0;
                            setEditLines((prev) =>
                              prev.map((l) =>
                                l.raw_material_id === line.raw_material_id ? { ...l, quantity: qty } : l
                              )
                            );
                          }}
                          className="flex-1 min-w-0 text-center"
                          placeholder="Qté"
                        />
                        <Select
                          value={line.unit}
                          onValueChange={(v) => {
                            setEditLines((prev) =>
                              prev.map((l) =>
                                l.raw_material_id === line.raw_material_id ? { ...l, unit: v } : l
                              )
                            );
                          }}
                        >
                          <SelectTrigger className="w-28 shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_UNITS.map((u) => (
                              <SelectItem key={u.value} value={u.value}>
                                {u.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={cancelEditing} className="flex-1">
                  <X className="h-4 w-4 mr-1" />
                  Annuler
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateOrder.isPending}
                  className="flex-1"
                >
                  {updateOrder.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {updateOrder.isPending ? 'Sauvegarde...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
