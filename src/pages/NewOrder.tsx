import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Plus, Minus } from 'lucide-react';
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
  { value: 'kg', label: 'kg' },
  { value: 'litre', label: 'Litre' },
  { value: 'palette', label: 'Palette' },
  { value: 'piece', label: 'Pièce' },
  { value: 'ramette', label: 'Ramette' },
  { value: 'sac', label: 'Sac' },
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

  // Available materials (not already added)
  const availableMaterials = useMemo(() => {
    if (!rawMaterials) return [];
    const addedIds = new Set(lines.map((l) => l.raw_material_id));
    return rawMaterials.filter((m) => !addedIds.has(m.id));
  }, [rawMaterials, lines]);

  const addMaterial = (materialId: string) => {
    const material = rawMaterials?.find((m) => m.id === materialId);
    if (!material) return;

    setLines((prev) => [
      ...prev,
      {
        raw_material_id: material.id,
        name: material.name,
        quantity: 0,
        unit: (material as any).order_unit || material.purchase_unit || material.unit || 'kg',
      },
    ]);
  };

  const updateQuantity = (index: number, quantity: number) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, quantity } : line))
    );
  };

  const updateUnit = (index: number, unit: string) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, unit } : line))
    );
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const validLines = lines.filter((l) => l.quantity > 0);

  const handleSubmit = async () => {
    if (!selectedSupplierId || validLines.length === 0) return;

    await createOrder.mutateAsync({
      supplier_id: selectedSupplierId,
      expected_delivery_date: expectedDate || null,
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">2. Matières premières</CardTitle>
              {availableMaterials.length > 0 && (
                <Select onValueChange={addMaterial}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Ajouter une matière..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMaterials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {lines.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Sélectionnez les matières premières à commander
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div
                    key={line.raw_material_id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{line.name}</p>
                      <p className="text-xs text-muted-foreground">{line.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={line.quantity || ''}
                        onChange={(e) =>
                          updateQuantity(index, parseFloat(e.target.value) || 0)
                        }
                        className="w-24 text-center"
                        placeholder="Qté"
                      />
                      <Select value={line.unit} onValueChange={(v) => updateUnit(index, v)}>
                        <SelectTrigger className="w-28">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeLine(index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Options */}
      {lines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Informations complémentaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Date de réception prévue</Label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
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
            disabled={createOrder.isPending}
            className="min-w-[160px]"
          >
            {createOrder.isPending ? 'Création...' : `Créer la commande (${validLines.length} MP)`}
          </Button>
        </div>
      )}
    </div>
  );
}
