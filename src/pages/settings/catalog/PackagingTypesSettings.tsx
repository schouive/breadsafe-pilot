import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit } from 'lucide-react';
import { usePackagingTypes } from '@/hooks/useProductCatalog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function PackagingTypesSettings() {
  const { data: types = [], isLoading } = usePackagingTypes();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: '', label: '', quantity: 1, active: true });

  const openNew = () => {
    setEditing(null);
    setForm({ code: '', label: '', quantity: 1, active: true });
    setOpen(true);
  };
  const openEdit = (t: any) => {
    setEditing(t);
    setForm({ code: t.code, label: t.label, quantity: t.quantity || 1, active: t.active });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: form.code.trim().toUpperCase(),
      label: form.label.trim(),
      quantity: Number(form.quantity) || 1,
      active: form.active,
    };
    const { error } = editing
      ? await supabase.from('packaging_types').update(payload).eq('id', editing.id)
      : await supabase.from('packaging_types').insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? 'Conditionnement mis à jour' : 'Conditionnement créé');
    qc.invalidateQueries({ queryKey: ['packaging_types'] });
    setOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Conditionnements</h1>
          <p className="text-muted-foreground mt-1">Types de conditionnement disponibles pour les fiches techniques (U01, C04, C05, PAL...)</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nouveau conditionnement</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{types.length} conditionnement(s)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Chargement...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono font-semibold">{t.code}</TableCell>
                    <TableCell>{t.label}</TableCell>
                    <TableCell className="text-right">{t.quantity}</TableCell>
                    <TableCell>{t.active ? <Badge>Actif</Badge> : <Badge variant="secondary">Inactif</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le conditionnement' : 'Nouveau conditionnement'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label>Code *</Label>
              <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="C04" />
            </div>
            <div>
              <Label>Libellé *</Label>
              <Input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Carton de 4" />
            </div>
            <div>
              <Label>Quantité (pièces par unité) *</Label>
              <Input required type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Actif</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
