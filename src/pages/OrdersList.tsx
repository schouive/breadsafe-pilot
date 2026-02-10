import { useState } from 'react';
import { format, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ClipboardList, Filter, Eye, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useSupplierOrders, useSupplierOrder, SupplierOrderWithSupplier } from '@/hooks/useSupplierOrders';
import { useSuppliers } from '@/hooks/useSuppliers';

const STATUS_LABELS: Record<string, string> = {
  draft: 'En cours de création',
  sent: 'Envoyée',
  partially_received: 'Partiellement reçue',
  received: 'Reçue',
};

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  sent: 'bg-primary/10 text-primary border-primary/30',
  partially_received: 'bg-[hsl(var(--status-acceptable-light))] text-[hsl(38,92%,25%)] border-[hsl(var(--status-acceptable)/0.3)]',
  received: 'bg-[hsl(var(--status-conforme-light))] text-[hsl(142,71%,25%)] border-[hsl(var(--status-conforme)/0.3)]',
};

function isOrderLate(order: { status: string; expected_delivery_date: string | null }) {
  if (order.status === 'received') return false;
  if (!order.expected_delivery_date) return false;
  return isPast(parseISO(order.expected_delivery_date));
}

export default function OrdersList() {
  const [sendingEmail, setSendingEmail] = useState(false);
  const { data: suppliers } = useSuppliers();
  const [filterSupplier, setFilterSupplier] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [detailOrderId, setDetailOrderId] = useState<string | undefined>(undefined);

  const filters = {
    supplierId: filterSupplier || undefined,
    status: filterStatus || undefined,
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
  };

  const { data: orders, isLoading } = useSupplierOrders(filters);
  const { data: detailOrder } = useSupplierOrder(detailOrderId);

  const clearFilters = () => {
    setFilterSupplier('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
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
          senderName: 'BreadSafe',
        },
      });
      if (error) throw error;
      toast.success(`Email envoyé à ${recipientEmail}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commandes fournisseurs</h1>
        <p className="text-muted-foreground mt-1">Suivi et historique des commandes</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Réinitialiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Fournisseur</Label>
              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {suppliers?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Statut</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="sent">Envoyée</SelectItem>
                  <SelectItem value="partially_received">Partiellement reçue</SelectItem>
                  <SelectItem value="received">Reçue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date début</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date fin</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : !orders?.length ? (
            <div className="p-8 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune commande trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Commande</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date commande</TableHead>
                  <TableHead>Réception prévue</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>{order.suppliers?.name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={STATUS_CLASSES[order.status]}>
                          {STATUS_LABELS[order.status]}
                        </Badge>
                        {isOrderLate(order) && (
                          <Badge variant="outline" className="bg-[hsl(var(--status-acceptable-light))] text-[hsl(25,95%,40%)] border-[hsl(var(--status-acceptable)/0.3)]">
                            Retard
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.order_date), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {order.expected_delivery_date
                        ? format(new Date(order.expected_delivery_date), 'dd/MM/yyyy', { locale: fr })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDetailOrderId(order.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Sheet */}
      <Sheet open={!!detailOrderId} onOpenChange={(open) => !open && setDetailOrderId(undefined)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono">
              {detailOrder?.order_number || 'Chargement...'}
            </SheetTitle>
          </SheetHeader>
          {detailOrder && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fournisseur</p>
                  <p className="font-medium">{detailOrder.suppliers?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Statut</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className={STATUS_CLASSES[detailOrder.status]}>
                      {STATUS_LABELS[detailOrder.status]}
                    </Badge>
                    {isOrderLate(detailOrder) && (
                      <Badge variant="outline" className="bg-[hsl(var(--status-acceptable-light))] text-[hsl(25,95%,40%)] border-[hsl(var(--status-acceptable)/0.3)]">
                        Retard
                      </Badge>
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
              {/* Send Email Button */}
              {detailOrder.status === 'sent' && (
                <Button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="w-full"
                >
                  {sendingEmail ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {sendingEmail ? 'Envoi en cours...' : 'Envoyer par email'}
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
