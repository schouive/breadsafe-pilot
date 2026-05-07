import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Printer, Plus, Edit2, Trash2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { usePrintProducts, type PrintProduct, type PrintVariant } from '@/hooks/usePrintLabels';

const FAMILIES = ['BUN', 'BAG', 'HDG', 'PDM', 'PLQ', 'SPC'];
const TEMPS: PrintVariant['temperature'][] = ['FR', 'FZ'];
const SLICINGS: PrintVariant['slicing'][] = ['SLI', 'WHO'];
const PACKS: PrintVariant['packaging'][] = ['U01', 'C05', 'C24', 'PAL'];

function useAllPrintProducts() {
  return useQuery({
    queryKey: ['print_products_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_products').select('*').order('label');
      if (error) throw error;
      return (data ?? []) as PrintProduct[];
    },
  });
}

function useProductVariants(productId?: string) {
  return useQuery({
    queryKey: ['print_variants_all', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_product_variants').select('*').eq('product_id', productId!).order('temperature');
      if (error) throw error;
      return (data ?? []) as PrintVariant[];
    },
  });
}

export function PrintCatalogManagement() {
  const qc = useQueryClient();
  const { data: products, isLoading } = useAllPrintProducts();
  const [editing, setEditing] = useState<Partial<PrintProduct> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [variantsOf, setVariantsOf] = useState<PrintProduct | null>(null);

  const saveProduct = useMutation({
    mutationFn: async (p: Partial<PrintProduct>) => {
      if (p.id) {
        const { error } = await supabase.from('print_products').update({
          label: p.label, family: p.family, sku_base: p.sku_base,
          old_code: p.old_code || null, active: p.active ?? true,
        }).eq('id', p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('print_products').insert({
          label: p.label!, family: p.family!, sku_base: p.sku_base!,
          old_code: p.old_code || null, active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['print_products_all'] });
      qc.invalidateQueries({ queryKey: ['print_products'] });
      toast.success('Produit enregistré');
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('print_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['print_products_all'] });
      qc.invalidateQueries({ queryKey: ['print_products'] });
      toast.success('Produit supprimé');
      setDeletingId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Printer className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Catalogue Impression</CardTitle>
              <CardDescription>Produits & variantes pour les étiquettes Zebra</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => setEditing({})}>
            <Plus className="h-4 w-4 mr-2" /> Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : !products?.length ? (
          <div className="text-center py-8">
            <Printer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun produit dans le catalogue</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="outline">{p.family}</Badge>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.label}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {p.sku_base}{p.old_code ? ` · ancien: ${p.old_code}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!p.active && <Badge variant="secondary">Inactif</Badge>}
                  <Button variant="ghost" size="icon" onClick={() => setVariantsOf(p)}>
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditing(p)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletingId(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Product dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Modifier' : 'Ajouter'} un produit</DialogTitle>
            <DialogDescription>Référencer un produit imprimable</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Libellé *</Label>
                <Input value={editing.label ?? ''}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Famille *</Label>
                  <Select value={editing.family ?? ''}
                    onValueChange={(v) => setEditing({ ...editing, family: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {FAMILIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>SKU base *</Label>
                  <Input value={editing.sku_base ?? ''}
                    onChange={(e) => setEditing({ ...editing, sku_base: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ancien code</Label>
                <Input value={editing.old_code ?? ''}
                  onChange={(e) => setEditing({ ...editing, old_code: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button
              onClick={() => saveProduct.mutate(editing!)}
              disabled={!editing?.label || !editing?.family || !editing?.sku_base || saveProduct.isPending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>Les variantes associées seront aussi supprimées.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteProduct.mutate(deletingId)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Variants manager */}
      {variantsOf && (
        <VariantsDialog product={variantsOf} onClose={() => setVariantsOf(null)} />
      )}
    </Card>
  );
}

function VariantsDialog({ product, onClose }: { product: PrintProduct; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: variants, isLoading } = useProductVariants(product.id);
  const [draft, setDraft] = useState<Partial<PrintVariant>>({
    temperature: 'FR', slicing: 'WHO', packaging: 'U01', template_name: '',
  });

  const addVariant = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('print_product_variants').insert({
        product_id: product.id,
        temperature: draft.temperature!,
        slicing: draft.slicing!,
        packaging: draft.packaging!,
        template_name: draft.template_name!,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['print_variants_all', product.id] });
      qc.invalidateQueries({ queryKey: ['print_variants', product.id] });
      toast.success('Variante ajoutée');
      setDraft({ temperature: 'FR', slicing: 'WHO', packaging: 'U01', template_name: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteVariant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('print_product_variants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['print_variants_all', product.id] });
      qc.invalidateQueries({ queryKey: ['print_variants', product.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Variantes — {product.label}</DialogTitle>
          <DialogDescription>Combinaisons autorisées (température / découpe / conditionnement / template)</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Chargement...</p>
          ) : !variants?.length ? (
            <p className="text-muted-foreground text-sm">Aucune variante</p>
          ) : (
            <div className="space-y-2">
              {variants.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-2 rounded border text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{v.temperature}</Badge>
                    <Badge variant="outline">{v.slicing}</Badge>
                    <Badge variant="outline">{v.packaging}</Badge>
                    <span className="text-muted-foreground">{v.template_name}</span>
                  </div>
                  <Button variant="ghost" size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteVariant.mutate(v.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-medium">Ajouter une variante</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select value={draft.temperature} onValueChange={(v: any) => setDraft({ ...draft, temperature: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TEMPS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={draft.slicing} onValueChange={(v: any) => setDraft({ ...draft, slicing: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SLICINGS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={draft.packaging} onValueChange={(v: any) => setDraft({ ...draft, packaging: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PACKS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Template Zebra"
              value={draft.template_name ?? ''}
              onChange={(e) => setDraft({ ...draft, template_name: e.target.value })} />
          </div>
          <Button size="sm" onClick={() => addVariant.mutate()}
            disabled={!draft.template_name || addVariant.isPending}>
            <Plus className="h-4 w-4 mr-2" /> Ajouter la variante
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
