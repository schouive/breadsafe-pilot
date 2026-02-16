import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Thermometer,
  Camera,
  ChevronRight,
  Package,
  User,
  Filter,
  Search,
  X,
  FileText,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ControlDetailModal } from '@/components/controls/ControlDetailModal';
import { ControlRecordFromDB } from '@/hooks/useControlRecords';
import { useOperatorNames } from '@/hooks/useOperatorNames';
import { useReceptionHistory, useLinkOrderToReception, ReceptionRecordWithOrder } from '@/hooks/useReceptionHistory';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSupplierOrders, SupplierOrderWithSupplier } from '@/hooks/useSupplierOrders';
import { cn } from '@/lib/utils';

const statusConfig = {
  conforme: {
    label: 'Conforme',
    icon: CheckCircle,
    class: 'bg-success/10 text-success border-success/20',
  },
  acceptable: {
    label: 'Acceptable',
    icon: AlertTriangle,
    class: 'bg-warning/10 text-warning border-warning/20',
  },
  nonconforme: {
    label: 'Non-conforme',
    icon: XCircle,
    class: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  pending: {
    label: 'En attente',
    icon: Calendar,
    class: 'bg-muted text-muted-foreground border-muted',
  },
};

export default function ReceptionHistory() {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<ControlRecordFromDB | null>(null);
  const [linkDialogRecord, setLinkDialogRecord] = useState<ReceptionRecordWithOrder | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  const { data: suppliers } = useSuppliers();
  const { data: records, isLoading } = useReceptionHistory({
    supplierId: selectedSupplierId !== 'all' ? selectedSupplierId : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: allOrders } = useSupplierOrders();
  const linkOrderMutation = useLinkOrderToReception();

  const operatorIds = useMemo(
    () => (records || []).map((r) => r.operator_id),
    [records]
  );
  const { data: operatorNames } = useOperatorNames(operatorIds);

  // Filter orders for link dialog: match supplier and status sent/partially_received
  const availableOrders = useMemo(() => {
    if (!linkDialogRecord || !allOrders) return [];
    return (allOrders as SupplierOrderWithSupplier[]).filter(
      (o) =>
        o.suppliers?.name === linkDialogRecord.supplier &&
        ['sent', 'partially_received'].includes(o.status)
    );
  }, [linkDialogRecord, allOrders]);

  const hasFilters = selectedSupplierId !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSelectedSupplierId('all');
    setDateFrom('');
    setDateTo('');
  };

  const stats = useMemo(() => {
    if (!records) return { total: 0, conforme: 0, nonconforme: 0, acceptable: 0 };
    return {
      total: records.length,
      conforme: records.filter((r) => r.status === 'conforme').length,
      nonconforme: records.filter((r) => r.status === 'nonconforme').length,
      acceptable: records.filter((r) => r.status === 'acceptable').length,
    };
  }, [records]);

  const handleLinkOrder = () => {
    if (!linkDialogRecord || !selectedOrderId) return;
    linkOrderMutation.mutate(
      { recordId: linkDialogRecord.id, orderId: selectedOrderId },
      {
        onSuccess: () => {
          setLinkDialogRecord(null);
          setSelectedOrderId('');
        },
      }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Historique des réceptions</h1>
        <p className="text-muted-foreground mt-1">
          Consulter l'ensemble des contrôles de réception enregistrés
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filtres</span>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto gap-1 h-7 text-xs">
              <X className="h-3 w-3" />
              Réinitialiser
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Fournisseur</label>
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les fournisseurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les fournisseurs</SelectItem>
                {suppliers?.filter((s) => s.is_active).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date début</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date fin</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10"
            />
          </div>
        </div>
      </Card>

      {/* Stats */}
      {records && records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </Card>
          <Card className="p-3 text-center border-success/30">
            <p className="text-2xl font-bold text-success">{stats.conforme}</p>
            <p className="text-xs text-muted-foreground">Conformes</p>
          </Card>
          <Card className="p-3 text-center border-warning/30">
            <p className="text-2xl font-bold text-warning">{stats.acceptable}</p>
            <p className="text-xs text-muted-foreground">Acceptables</p>
          </Card>
          <Card className="p-3 text-center border-destructive/30">
            <p className="text-2xl font-bold text-destructive">{stats.nonconforme}</p>
            <p className="text-xs text-muted-foreground">Non-conformes</p>
          </Card>
        </div>
      )}

      {/* Records list */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement…</p>
        </div>
      ) : records && records.length > 0 ? (
        <div className="grid gap-3">
          {records.map((record) => {
            const status = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <Card
                key={record.id}
                className={cn(
                  'p-4 border cursor-pointer hover:shadow-md transition-shadow',
                  status.class
                )}
              >
                <div className="flex items-start justify-between gap-4" onClick={() => setSelectedRecord(record)}>
                  <div className="flex items-start gap-3 min-w-0">
                    <StatusIcon className="h-5 w-5 mt-0.5 shrink-0" />
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={status.class}>
                          {status.label}
                        </Badge>
                        {record.temperature != null && (
                          <span className="text-sm font-medium flex items-center gap-1">
                            <Thermometer className="h-3.5 w-3.5" />
                            {record.temperature}°C
                          </span>
                        )}
                      </div>

                      {record.supplier && (
                        <p className="text-sm font-medium text-foreground truncate">
                          {record.supplier}
                        </p>
                      )}

                      {record.product && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Package className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{record.product}</span>
                        </div>
                      )}

                      {/* Order number */}
                      <div className="flex items-center gap-1.5 text-sm">
                        {record.order_number ? (
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <FileText className="h-3.5 w-3.5" />
                            {record.order_number}
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLinkDialogRecord(record);
                              setSelectedOrderId('');
                            }}
                          >
                            <Link2 className="h-3 w-3" />
                            Associer une commande
                          </Button>
                        )}
                      </div>

                      {record.photos && record.photos.length > 0 && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Camera className="h-3.5 w-3.5" />
                          <span>
                            {record.photos.length} photo{record.photos.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {operatorNames?.[record.operator_id] && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>{operatorNames[record.operator_id]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(record.timestamp), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <div className="mt-0.5">
                        {format(new Date(record.timestamp), 'HH:mm', { locale: fr })}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {hasFilters
              ? 'Aucun contrôle de réception trouvé pour ces critères'
              : 'Aucun contrôle de réception enregistré'}
          </p>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3">
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      )}

      {/* Detail modal */}
      <ControlDetailModal
        record={selectedRecord}
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onEdit={() => {}}
      />

      {/* Link order dialog */}
      <Dialog open={!!linkDialogRecord} onOpenChange={(open) => !open && setLinkDialogRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associer une commande fournisseur</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Sélectionnez la commande à associer à ce contrôle de réception
              {linkDialogRecord?.supplier && (
                <> pour <strong>{linkDialogRecord.supplier}</strong></>
              )}
            </p>
            {availableOrders.length > 0 ? (
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une commande" />
                </SelectTrigger>
                <SelectContent>
                  {availableOrders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.order_number} — {format(new Date(o.order_date), 'dd/MM/yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Aucune commande ouverte trouvée pour ce fournisseur
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogRecord(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleLinkOrder}
              disabled={!selectedOrderId || linkOrderMutation.isPending}
            >
              Associer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
