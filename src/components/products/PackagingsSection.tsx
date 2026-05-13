import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Plus, Package } from 'lucide-react';
import {
  useProductSheetPackagings, useUpsertPackaging, useDeletePackaging,
  ProductSheetPackaging,
} from '@/hooks/useProductSheetPackagings';
import { useLabelTemplates } from '@/hooks/useProductCatalog';

const PACKAGING_CODES = ['U01', 'C04', 'C05', 'C18', 'C24', 'PAL'] as const;
const TEMPERATURE_STATES = [
  { value: 'FR', label: 'FR — Frais' },
  { value: 'FZ', label: 'FZ — Surgelé' },
];
const SLICING_STATES = [
  { value: 'WHO', label: 'WHO — Entier' },
  { value: 'SLI', label: 'SLI — Tranché' },
];

interface Props {
  productSheetId: string;
}

const empty = (sheetId: string): Partial<ProductSheetPackaging> => ({
  product_sheet_id: sheetId,
  packaging_code: 'U01',
  erp_code: '',
  erp_label: '',
  barcode_value: '',
  temperature_state: 'FR',
  slicing_state: 'WHO',
  active: true,
  print_order: 0,
});

export function PackagingsSection({ productSheetId }: Props) {
  const { data: rows = [], isLoading } = useProductSheetPackagings(productSheetId);
  const { data: templates = [] } = useLabelTemplates();
  const upsert = useUpsertPackaging();
  const remove = useDeletePackaging();

  const [editing, setEditing] = useState<Partial<ProductSheetPackaging> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProductSheetPackaging | null>(null);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.erp_code?.trim() || !editing.erp_label?.trim()) return;
    await upsert.mutateAsync(editing as any);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-sm uppercase tracking-wider">
            Conditionnements (étiquetage)
          </h4>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setEditing(empty(productSheetId))}
        >
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Aucun conditionnement. Ajoutez U01 / C04 / C05… pour générer les étiquettes du catalogue d'impression.
        </p>
      ) : (
        <div className="rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Code</TableHead>
                <TableHead>Code ERP</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>EAN</TableHead>
                <TableHead className="w-[80px]">État</TableHead>
                <TableHead className="w-[80px]">Trch.</TableHead>
                <TableHead className="w-[70px]">Actif</TableHead>
                <TableHead className="w-[90px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="secondary">{r.packaging_code}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.erp_code}</TableCell>
                  <TableCell className="text-sm">{r.erp_label}</TableCell>
                  <TableCell className="font-mono text-xs">{r.barcode_value || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{r.temperature_state}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{r.slicing_state}</Badge></TableCell>
                  <TableCell>{r.active ? 'Oui' : 'Non'}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" size="icon" variant="ghost"
                      onClick={() => setEditing(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost"
                      onClick={() => setConfirmDelete(r)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Modifier' : 'Ajouter'} un conditionnement</DialogTitle>
            <DialogDescription>
              Une ligne par variante d'emballage (U01 unité, C04 carton de 4, etc.).
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code conditionnement *</Label>
                <Select
                  value={editing.packaging_code}
                  onValueChange={(v) => setEditing({ ...editing, packaging_code: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PACKAGING_CODES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Code ERP *</Label>
                <Input
                  value={editing.erp_code || ''}
                  onChange={(e) => setEditing({ ...editing, erp_code: e.target.value })}
                  placeholder="ex: BAG-C04-FR-WHO"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Libellé ERP *</Label>
                <Input
                  value={editing.erp_label || ''}
                  onChange={(e) => setEditing({ ...editing, erp_label: e.target.value })}
                  placeholder="Libellé commercial"
                />
              </div>

              <div className="space-y-2">
                <Label>Code-barres (EAN)</Label>
                <Input
                  value={editing.barcode_value || ''}
                  onChange={(e) => setEditing({ ...editing, barcode_value: e.target.value })}
                  placeholder="3401234567890"
                />
              </div>

              <div className="space-y-2">
                <Label>Template ZPL</Label>
                <Select
                  value={editing.template_id || 'none'}
                  onValueChange={(v) => setEditing({ ...editing, template_id: v === 'none' ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucun —</SelectItem>
                    {templates.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>État température</Label>
                <Select
                  value={editing.temperature_state}
                  onValueChange={(v) => setEditing({ ...editing, temperature_state: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPERATURE_STATES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>État tranchage</Label>
                <Select
                  value={editing.slicing_state}
                  onValueChange={(v) => setEditing({ ...editing, slicing_state: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SLICING_STATES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pièces / carton</Label>
                <Input type="number" min="0"
                  value={editing.pieces_per_carton ?? ''}
                  onChange={(e) => setEditing({ ...editing, pieces_per_carton: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>

              <div className="space-y-2">
                <Label>Poids carton (kg)</Label>
                <Input type="number" step="0.01" min="0"
                  value={editing.carton_weight ?? ''}
                  onChange={(e) => setEditing({ ...editing, carton_weight: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Dimensions carton</Label>
                <Input
                  value={editing.carton_dimensions || ''}
                  onChange={(e) => setEditing({ ...editing, carton_dimensions: e.target.value })}
                  placeholder="L x l x H (cm)"
                />
              </div>

              <div className="flex items-center gap-3 col-span-2">
                <Switch
                  checked={editing.active ?? true}
                  onCheckedChange={(c) => setEditing({ ...editing, active: c })}
                />
                <Label>Actif (disponible pour impression)</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button type="button" onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce conditionnement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprime aussi les liens vers les programmes d'impression utilisant ce code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDelete) {
                  await remove.mutateAsync({ id: confirmDelete.id, product_sheet_id: confirmDelete.product_sheet_id });
                  setConfirmDelete(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
