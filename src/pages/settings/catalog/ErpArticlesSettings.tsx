import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Power, Upload } from 'lucide-react';
import { useErpArticles, useErpArticleMutations, useFamilies } from '@/hooks/useProductCatalog';
import { ErpArticleDialog } from '@/components/settings/catalog/ErpArticleDialog';
import { ErpCsvImportDialog } from '@/components/settings/catalog/ErpCsvImportDialog';

export default function ErpArticlesSettings() {
  const { data: articles = [], isLoading } = useErpArticles();
  const { data: families = [] } = useFamilies();
  const { setActive } = useErpArticleMutations();
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [tempFilter, setTempFilter] = useState('all');
  const [packFilter, setPackFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [editing, setEditing] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return articles.filter((a: any) => {
      if (q && !a.erp_code.toLowerCase().includes(q) && !a.erp_label.toLowerCase().includes(q) && !a.product?.sku_base?.toLowerCase().includes(q)) return false;
      if (familyFilter !== 'all' && a.product?.family?.code !== familyFilter) return false;
      if (tempFilter !== 'all' && a.temperature_state !== tempFilter) return false;
      if (packFilter !== 'all' && a.packaging_code !== packFilter) return false;
      if (activeFilter === 'active' && !a.active) return false;
      if (activeFilter === 'inactive' && a.active) return false;
      return true;
    });
  }, [articles, search, familyFilter, tempFilter, packFilter, activeFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Articles ERP</h1>
          <p className="text-muted-foreground mt-1">Références vendables importées depuis EBP</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Importer CSV
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nouvel article
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">{filtered.length} article(s)</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:col-span-2"
            />
            <Select value={familyFilter} onValueChange={setFamilyFilter}>
              <SelectTrigger><SelectValue placeholder="Famille" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes familles</SelectItem>
                {families.map((f: any) => (
                  <SelectItem key={f.id} value={f.code}>{f.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tempFilter} onValueChange={setTempFilter}>
              <SelectTrigger><SelectValue placeholder="Température" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes températures</SelectItem>
                <SelectItem value="FR">FR</SelectItem>
                <SelectItem value="FZ">FZ</SelectItem>
              </SelectContent>
            </Select>
            <Select value={packFilter} onValueChange={setPackFilter}>
              <SelectTrigger><SelectValue placeholder="Conditionnement" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous conditionnements</SelectItem>
                <SelectItem value="U01">U01</SelectItem>
                <SelectItem value="C05">C05</SelectItem>
                <SelectItem value="C24">C24</SelectItem>
                <SelectItem value="PAL">PAL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="active">Actifs uniquement</SelectItem>
              <SelectItem value="inactive">Inactifs uniquement</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code ERP</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Produit maître</TableHead>
                  <TableHead>Temp.</TableHead>
                  <TableHead>Découpe</TableHead>
                  <TableHead>Cond.</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.erp_code}</TableCell>
                    <TableCell className="text-sm">{a.erp_label}</TableCell>
                    <TableCell className="text-sm">{a.product?.sku_base}</TableCell>
                    <TableCell><Badge variant="outline">{a.temperature_state}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{a.slicing_state}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{a.packaging_code}</Badge></TableCell>
                    <TableCell className="text-xs">{a.templates?.[0]?.template?.template_code || <span className="text-destructive">manquant</span>}</TableCell>
                    <TableCell>
                      {a.active ? <Badge>Actif</Badge> : <Badge variant="secondary">Inactif</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setActive.mutate({ id: a.id, active: !a.active })}>
                        <Power className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Aucun article
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ErpArticleDialog open={dialogOpen} onOpenChange={setDialogOpen} article={editing} />
      <ErpCsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} />
    </div>
  );
}
