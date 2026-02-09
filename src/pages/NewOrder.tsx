import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useSuppliers } from '@/hooks/useSuppliers';
import { useRawMaterials } from '@/hooks/useSuppliers';
import { useCreateSupplierOrder } from '@/hooks/useSupplierOrders';

const ORDER_UNITS = [
  { value: 'bidon', label: 'Bidon' },
  { value: 'carton', label: 'Carton' },
  { value: 'kg', label: 'kg' },
  { value: 'litre', label: 'Litre' },
  { value: 'palette', label: 'Palette' },
  { value: 'piece', label: 'Pièce' },
  { value: 'ramette', label: 'Ramette' },
  { value: 'sac', label: 'Sac' },
  { value: 'seau', label: 'Seau' },
];

interface OrderLine {
  raw_material_id: string;
  name: string;
  quantity: number;
  unit: string;
}

export default function NewOrder() {
  const navigate = useNavigate();
  const { data: suppliers } = useSuppliers();
  const createOrder = useCreateSupplierOrder();

  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [comment, setComment] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);

  const { data: rawMaterials } = useRawMaterials(selectedSupplierId || undefined);

  // When supplier changes, reset lines
  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setLines([]);
  };

  // Build lines from all raw materials when supplier changes
  const materialLines = useMemo(() => {
    if (!rawMaterials) return [];
    return rawMaterials.map((m) => {
      const existing = lines.find((l) => l.raw_material_id === m.id);
      return {
        raw_material_id: m.id,
        name: m.name,
        quantity: existing?.quantity ?? 0,
        unit: existing?.unit ?? ((m as any).order_unit || m.purchase_unit || m.unit || 'kg'),
      };
    });
  }, [rawMaterials, lines]);

  // Sync lines state when rawMaterials load
  const prevSupplierId = useMemo(() => selectedSupplierId, [selectedSupplierId]);

  const updateQuantity = (materialId: string, quantity: number) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.raw_material_id === materialId);
      if (idx >= 0) {
        return prev.map((l) => (l.raw_material_id === materialId ? { ...l, quantity } : l));
      }
      const mat = rawMaterials?.find((m) => m.id === materialId);
      if (!mat) return prev;
      return [...prev, { raw_material_id: mat.id, name: mat.name, quantity, unit: (mat as any).order_unit || mat.purchase_unit || mat.unit || 'kg' }];
    });
  };

  const updateUnit = (materialId: string, unit: string) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.raw_material_id === materialId);
      if (idx >= 0) {
        return prev.map((l) => (l.raw_material_id === materialId ? { ...l, unit } : l));
      }
      const mat = rawMaterials?.find((m) => m.id === materialId);
      if (!mat) return prev;
      return [...prev, { raw_material_id: mat.id, name: mat.name, quantity: 0, unit }];
    });
  };

  const validLines = materialLines.filter((l) => l.quantity > 0);

  const handleSubmit = async () => {
    if (!selectedSupplierId || validLines.length === 0 || !expectedDate) return;

    await createOrder.mutateAsync({
      supplier_id: selectedSupplierId,
      expected_delivery_date: expectedDate,
      comment: comment || null,
      lines: validLines,
    });

    navigate('/orders/list');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orders/list')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nouvelle commande</h1>
          <p className="text-muted-foreground mt-1">Créer une commande fournisseur</p>
        </div>
      </div>

      {/* Step 1: Select Supplier */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Fournisseur</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedSupplierId} onValueChange={handleSupplierChange}>
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
        </CardContent>
      </Card>

      {/* Step 2: Materials & Quantities */}
      {selectedSupplierId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Matières premières ({materialLines.length})</CardTitle>
            <p className="text-sm text-muted-foreground">Renseignez les quantités pour les matières à commander</p>
          </CardHeader>
          <CardContent>
            {materialLines.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Aucune matière première associée à ce fournisseur</p>
              </div>
            ) : (
              <div className="space-y-2">
                {materialLines.map((line) => (
                  <div
                    key={line.raw_material_id}
                    className={`p-3 rounded-lg border transition-colors ${line.quantity > 0 ? 'border-primary/40 bg-primary/5' : 'bg-card'}`}
                  >
                    <p className="font-medium text-sm mb-2 truncate">{line.name}</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={line.quantity || ''}
                        onChange={(e) =>
                          updateQuantity(line.raw_material_id, parseFloat(e.target.value) || 0)
                        }
                        className="flex-1 min-w-0 text-center"
                        placeholder="Qté"
                      />
                      <Select value={line.unit} onValueChange={(v) => updateUnit(line.raw_material_id, v)}>
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Options */}
      {selectedSupplierId && materialLines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Informations complémentaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Date de réception prévue <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Commentaire</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Commentaire libre..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      {validLines.length > 0 && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/orders/list')}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createOrder.isPending || !expectedDate}
            className="min-w-[160px]"
          >
            {createOrder.isPending ? 'Création...' : `Créer la commande (${validLines.length} MP)`}
          </Button>
        </div>
      )}
    </div>
  );
}
