import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Copy, Edit, Power } from 'lucide-react';
import { useProductsMaster, useProductMasterMutations } from '@/hooks/useProductCatalog';
import { MasterProductDialog } from '@/components/settings/catalog/MasterProductDialog';

export default function MasterProductsSettings() {
  const { data: products = [], isLoading } = useProductsMaster();
  const { duplicate, setActive } = useProductMasterMutations();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(
      (p: any) =>
        p.sku_base.toLowerCase().includes(q) ||
        p.label.toLowerCase().includes(q) ||
        p.family?.code?.toLowerCase().includes(q)
    );
  }, [products, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Produits maîtres</h1>
          <p className="text-muted-foreground mt-1">
            Produits génériques liés à une recette
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau produit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{filtered.length} produit(s)</CardTitle>
          <Input
            placeholder="Rechercher par SKU, libellé, famille..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU base</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Famille</TableHead>
                  <TableHead>Recette</TableHead>
                  
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.sku_base}</TableCell>
                    <TableCell>{p.label}</TableCell>
                    <TableCell>{p.family ? <Badge variant="outline">{p.family.code}</Badge> : '—'}</TableCell>
                    <TableCell className="text-sm">{p.recipe?.name || '—'}</TableCell>
                    
                    <TableCell>
                      {p.active ? <Badge>Actif</Badge> : <Badge variant="secondary">Inactif</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => duplicate.mutate(p.id)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setActive.mutate({ id: p.id, active: !p.active })}>
                        <Power className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Aucun produit
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MasterProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} />
    </div>
  );
}
