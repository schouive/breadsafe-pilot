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
import { useFamilies } from '@/hooks/useProductCatalog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function FamiliesSettings() {
  const { data: families = [], isLoading } = useFamilies();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: '', label: '', active: true });

  const openNew = () => {
    setEditing(null);
    setForm({ code: '', label: '', active: true });
    setOpen(true);
  };
  const openEdit = (f: any) => {
    setEditing(f);
    setForm({ code: f.code, label: f.label, active: f.active });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { code: form.code.trim().toUpperCase(), label: form.label.trim(), active: form.active };
    const { error } = editing
      ? await supabase.from('product_families').update(payload).eq('id', editing.id)
      : await supabase.from('product_families').insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? 'Famille mise à jour' : 'Famille créée');
    qc.invalidateQueries({ queryKey: ['product_families'] });
    setOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Familles de produits</h1>
          <p className="text-muted-foreground mt-1">Catégories : BUN, BAG, HDG, PDM, PLQ, SPC...</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nouvelle famille</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{families.length} famille(s)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Chargement...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {families.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono">{f.code}</TableCell>
                    <TableCell>{f.label}</TableCell>
                    <TableCell>{f.active ? <Badge>Actif</Badge> : <Badge variant="secondary">Inactif</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(f)}>
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
            <DialogTitle>{editing ? 'Modifier la famille' : 'Nouvelle famille'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label>Code *</Label>
              <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BUN" />
            </div>
            <div>
              <Label>Libellé *</Label>
              <Input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Buns" />
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
