import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackageCheck,
  ArrowLeft,
  ArrowRight,
  Truck,
  ClipboardList,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSuppliers, useRawMaterials } from '@/hooks/useSuppliers';
import {
  useOpenOrdersBySupplier,
  SupplierOrder,
  OrderLineWithMaterial,
} from '@/hooks/useSupplierOrders';
import {
  useReceivedQuantitiesByOrder,
  useCreateReception,
} from '@/hooks/useSupplierReceptions';

type ReceptionStep =
  | 'select_supplier'
  | 'select_mode'
  | 'order_reception'
  | 'free_reception';

interface ReceptionLine {
  raw_material_id: string;
  name: string;
  quantity_received: number;
  unit: string;
  order_line_id?: string;
  quantity_ordered?: number;
  quantity_remaining?: number;
}

const STATUS_LABELS: Record<string, string> = {
  sent: 'Envoyée',
  partially_received: 'Partiellement reçue',
};

export default function OrderReception() {
  const navigate = useNavigate();
  const { data: suppliers } = useSuppliers();
  const createReception = useCreateReception();

  const [step, setStep] = useState<ReceptionStep>('select_supplier');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<
    (SupplierOrder & { supplier_order_lines: OrderLineWithMaterial[] }) | null
  >(null);
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receptionLines, setReceptionLines] = useState<ReceptionLine[]>([]);

  const { data: openOrders } = useOpenOrdersBySupplier(
    selectedSupplierId || undefined
  );
  const { data: receivedQtys } = useReceivedQuantitiesByOrder(
    selectedOrder?.id
  );
  const { data: rawMaterials } = useRawMaterials(
    step === 'free_reception' ? selectedSupplierId : undefined
  );

  // Step 1 → Step 2
  const handleSupplierSelected = () => {
    if (!selectedSupplierId) return;
    setStep('select_mode');
  };

  // Select an order → load lines
  const handleSelectOrder = (
    order: SupplierOrder & { supplier_order_lines: OrderLineWithMaterial[] }
  ) => {
    setSelectedOrder(order);
    const lines: ReceptionLine[] = order.supplier_order_lines.map((ol) => {
      const alreadyReceived = receivedQtys?.[ol.id] || 0;
      const remaining = ol.quantity_ordered - alreadyReceived;
      return {
        raw_material_id: ol.raw_material_id,
        name: ol.raw_materials?.name || '—',
        quantity_received: 0,
        unit: ol.unit,
        order_line_id: ol.id,
        quantity_ordered: ol.quantity_ordered,
        quantity_remaining: Math.max(0, remaining),
      };
    });
    setReceptionLines(lines);
    setStep('order_reception');
  };

  // Free reception: init with all materials from supplier
  const handleFreeReception = () => {
    if (rawMaterials) {
      setReceptionLines(
        rawMaterials.map((m) => ({
          raw_material_id: m.id,
          name: m.name,
          quantity_received: 0,
          unit: m.purchase_unit || m.unit || 'kg',
        }))
      );
    }
    setStep('free_reception');
  };

  const updateLineQuantity = (index: number, value: number) => {
    setReceptionLines((prev) =>
      prev.map((line, i) =>
        i === index ? { ...line, quantity_received: value } : line
      )
    );
  };

  const validLines = receptionLines.filter((l) => l.quantity_received > 0);
  const canSubmit = deliveryNoteNumber.trim() && validLines.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    await createReception.mutateAsync({
      supplier_id: selectedSupplierId,
      order_id: selectedOrder?.id || null,
      delivery_note_number: deliveryNoteNumber.trim(),
      notes: notes.trim() || null,
      lines: validLines.map((l) => ({
        raw_material_id: l.raw_material_id,
        quantity_received: l.quantity_received,
        unit: l.unit,
        order_line_id: l.order_line_id || null,
      })),
    });

    // Reset
    setStep('select_supplier');
    setSelectedSupplierId('');
    setSelectedOrder(null);
    setDeliveryNoteNumber('');
    setNotes('');
    setReceptionLines([]);
  };

  const handleBack = () => {
    if (step === 'select_mode') {
      setStep('select_supplier');
      setSelectedSupplierId('');
    } else if (step === 'order_reception' || step === 'free_reception') {
      setStep('select_mode');
      setSelectedOrder(null);
      setReceptionLines([]);
      setDeliveryNoteNumber('');
      setNotes('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {step !== 'select_supplier' && (
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Réception marchandises
          </h1>
          <p className="text-muted-foreground mt-1">
            {step === 'select_supplier' && 'Sélectionnez le fournisseur'}
            {step === 'select_mode' && 'Choisissez le mode de réception'}
            {step === 'order_reception' &&
              `Réception commande ${selectedOrder?.order_number}`}
            {step === 'free_reception' && 'Réception sans commande'}
          </p>
        </div>
      </div>

      {/* Step 1: Select supplier */}
      {step === 'select_supplier' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Fournisseur
            </CardTitle>
            <CardDescription>
              Sélectionnez le fournisseur pour cette réception
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={selectedSupplierId}
              onValueChange={setSelectedSupplierId}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Sélectionner un fournisseur..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleSupplierSelected}
              disabled={!selectedSupplierId}
            >
              Continuer
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select mode */}
      {step === 'select_mode' && (
        <div className="space-y-4">
          {/* Open orders */}
          {openOrders && openOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Commandes en cours
                </CardTitle>
                <CardDescription>
                  Sélectionnez une commande pour la réception
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {openOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className="w-full flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                    >
                      <div>
                        <p className="font-mono font-medium text-sm">
                          {order.order_number}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(order.order_date), 'dd/MM/yyyy', {
                            locale: fr,
                          })}{' '}
                          · {order.supplier_order_lines?.length || 0} MP
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            order.status === 'sent'
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'bg-[hsl(var(--status-acceptable-light))] text-[hsl(38,92%,25%)] border-[hsl(var(--status-acceptable)/0.3)]'
                          }
                        >
                          {STATUS_LABELS[order.status]}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Free reception option */}
          <Card>
            <CardContent className="p-4">
              <button
                onClick={handleFreeReception}
                className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-dashed hover:border-primary/50 hover:bg-accent/30 transition-colors"
              >
                <div className="p-3 rounded-xl bg-muted">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium">Réception sans commande</p>
                  <p className="text-sm text-muted-foreground">
                    Livraison automatique ou hors application
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>

          {openOrders && openOrders.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Aucune commande en cours pour ce fournisseur
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 3a: Order reception */}
      {step === 'order_reception' && (
        <ReceptionFormContent
          lines={receptionLines}
          onUpdateQuantity={updateLineQuantity}
          deliveryNoteNumber={deliveryNoteNumber}
          onDeliveryNoteChange={setDeliveryNoteNumber}
          notes={notes}
          onNotesChange={setNotes}
          canSubmit={canSubmit}
          isPending={createReception.isPending}
          onSubmit={handleSubmit}
          showRemaining
        />
      )}

      {/* Step 3b: Free reception */}
      {step === 'free_reception' && (
        <ReceptionFormContent
          lines={receptionLines}
          onUpdateQuantity={updateLineQuantity}
          deliveryNoteNumber={deliveryNoteNumber}
          onDeliveryNoteChange={setDeliveryNoteNumber}
          notes={notes}
          onNotesChange={setNotes}
          canSubmit={canSubmit}
          isPending={createReception.isPending}
          onSubmit={handleSubmit}
          showRemaining={false}
        />
      )}
    </div>
  );
}

// Shared reception form
interface ReceptionFormContentProps {
  lines: ReceptionLine[];
  onUpdateQuantity: (index: number, value: number) => void;
  deliveryNoteNumber: string;
  onDeliveryNoteChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  canSubmit: boolean;
  isPending: boolean;
  onSubmit: () => void;
  showRemaining: boolean;
}

function ReceptionFormContent({
  lines,
  onUpdateQuantity,
  deliveryNoteNumber,
  onDeliveryNoteChange,
  notes,
  onNotesChange,
  canSubmit,
  isPending,
  onSubmit,
  showRemaining,
}: ReceptionFormContentProps) {
  const validCount = lines.filter((l) => l.quantity_received > 0).length;

  return (
    <div className="space-y-4">
      {/* BL Number - required */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              N° de bon de livraison (BL) *
            </Label>
            <Input
              value={deliveryNoteNumber}
              onChange={(e) => onDeliveryNoteChange(e.target.value)}
              placeholder="Ex: BL-2026-001"
              className="max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Material lines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Quantités reçues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div
                key={line.raw_material_id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{line.name}</p>
                  {showRemaining && (
                    <p className="text-xs text-muted-foreground">
                      Commandé : {line.quantity_ordered} {line.unit} · Restant :{' '}
                      {line.quantity_remaining} {line.unit}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={line.quantity_received || ''}
                    onChange={(e) =>
                      onUpdateQuantity(index, parseFloat(e.target.value) || 0)
                    }
                    className="w-24 text-center"
                    placeholder="Qté"
                  />
                  <span className="text-sm text-muted-foreground w-8">
                    {line.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-1.5">
            <Label className="text-sm">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Observations éventuelles..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          onClick={onSubmit}
          disabled={!canSubmit || isPending}
          size="lg"
          className="min-w-[200px]"
        >
          {isPending
            ? 'Enregistrement...'
            : `Valider la réception (${validCount} MP)`}
        </Button>
      </div>
    </div>
  );
}
