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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Edit } from 'lucide-react';
import { useLabelTemplates } from '@/hooks/useProductCatalog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const TEMPLATE_CODES = ['PRODUCT_LABEL', 'CARTON_LABEL', 'PALETTE_LABEL'];

export default function TemplatesSettings() {
  const { data: templates = [], isLoading } = useLabelTemplates();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ template_code: 'PRODUCT_LABEL', template_name: '', zpl_filename: '', active: true });

  const openNew = () => {
    setEditing(null);
    setForm({ template_code: 'PRODUCT_LABEL', template_name: '', zpl_filename: '', active: true });
    setOpen(true);
  };
  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      template_code: t.template_code || 'PRODUCT_LABEL',
      template_name: t.template_name,
      zpl_filename: t.zpl_filename || '',
      active: t.active,
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      template_code: form.template_code,
      template_name: form.template_name.trim(),
      zpl_filename: form.zpl_filename.trim() || null,
      active: form.active,
    };
    const { error } = editing
      ? await supabase.from('label_templates').update(payload).eq('id', editing.id)
      : await supabase.from('label_templates').insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? 'Template mis à jour' : 'Template créé');
    qc.invalidateQueries({ queryKey: ['label_templates'] });
    setOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Templates Zebra</h1>
          <p className="text-muted-foreground mt-1">Modèles d'étiquettes ZPL associés aux articles ERP</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nouveau template</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{templates.length} template(s)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Chargement...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Fichier ZPL</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell><Badge variant="outline">{t.template_code}</Badge></TableCell>
                    <TableCell>{t.template_name}</TableCell>
                    <TableCell className="font-mono text-xs">{t.zpl_filename || '—'}</TableCell>
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
            <DialogTitle>{editing ? 'Modifier le template' : 'Nouveau template'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label>Type *</Label>
              <Select value={form.template_code} onValueChange={(v) => setForm({ ...form, template_code: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nom *</Label>
              <Input required value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })} />
            </div>
            <div>
              <Label>Fichier ZPL</Label>
              <Input value={form.zpl_filename} onChange={(e) => setForm({ ...form, zpl_filename: e.target.value })} placeholder="bun_fr_who_u01.zpl" />
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
