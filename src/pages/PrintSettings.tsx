import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Search, Layers, AlertTriangle, Package, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import {
  useProductFamilies, useAllergens, usePackagingTypes, useLabelTemplates,
  useUpsertEntity, useDeleteEntity,
} from '@/hooks/usePrintAdmin';

function CrudTable<T extends { id: string; active?: boolean }>({
  rows, columns, onSave, onDelete, newRow, search, onSearch,
}: {
  rows: T[];
  columns: { key: keyof T & string; label: string; type?: 'text' | 'number' }[];
  onSave: (row: Partial<T>) => void;
  onDelete: (id: string) => void;
  newRow: Partial<T>;
  search: string;
  onSearch: (s: string) => void;
}) {
  const [draft, setDraft] = useState<Partial<T>>(newRow);
  const [editing, setEditing] = useState<Record<string, Partial<T>>>({});

  const filtered = rows.filter(r =>
    columns.some(c => String((r as any)[c.key] ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher…" value={search} onChange={e => onSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(c => <TableHead key={c.key}>{c.label}</TableHead>)}
              <TableHead>Statut</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-muted/30">
              {columns.map(c => (
                <TableCell key={c.key}>
                  <Input
                    type={c.type ?? 'text'}
                    value={(draft as any)[c.key] ?? ''}
                    onChange={e => setDraft({ ...draft, [c.key]: c.type === 'number' ? Number(e.target.value) : e.target.value })}
                    placeholder={c.label}
                  />
                </TableCell>
              ))}
              <TableCell>—</TableCell>
              <TableCell>
                <Button size="sm" onClick={() => { onSave(draft); setDraft(newRow); }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
            {filtered.map(row => {
              const draftRow = editing[row.id] ?? row;
              return (
                <TableRow key={row.id} className={row.active === false ? 'opacity-50' : ''}>
                  {columns.map(c => (
                    <TableCell key={c.key}>
                      <Input
                        type={c.type ?? 'text'}
                        value={(draftRow as any)[c.key] ?? ''}
                        onChange={e => setEditing({ ...editing, [row.id]: { ...draftRow, [c.key]: c.type === 'number' ? Number(e.target.value) : e.target.value } })}
                        onBlur={() => {
                          if (editing[row.id]) {
                            onSave({ ...editing[row.id], id: row.id } as Partial<T>);
                            const next = { ...editing }; delete next[row.id]; setEditing(next);
                          }
                        }}
                        className="border-0 bg-transparent"
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    {row.active === false ? <Badge variant="outline">Inactif</Badge> : <Badge>Actif</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(row.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function PrintSettings() {
  const [tab, setTab] = useState('families');
  const [search, setSearch] = useState('');

  const families = useProductFamilies();
  const allergens = useAllergens();
  const packaging = usePackagingTypes();
  const templates = useLabelTemplates();

  const saveFamily = useUpsertEntity('product_families');
  const delFamily = useDeleteEntity('product_families');
  const saveAllergen = useUpsertEntity('allergens');
  const delAllergen = useDeleteEntity('allergens');
  const savePackaging = useUpsertEntity('packaging_types');
  const delPackaging = useDeleteEntity('packaging_types');
  const saveTemplate = useUpsertEntity('label_templates');
  const delTemplate = useDeleteEntity('label_templates');

  const handle = (mut: any, payload: any, requiredKey: string) => {
    if (!payload[requiredKey]) return toast.error(`${requiredKey} obligatoire`);
    mut.mutate(payload, {
      onSuccess: () => toast.success('Enregistré'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-primary">Paramétrage Produits</h1>
        <p className="text-muted-foreground mt-1">
          Gérez les référentiels utilisés pour l'impression d'étiquettes Zebra.
        </p>
      </div>

      <Tabs value={tab} onValueChange={v => { setTab(v); setSearch(''); }}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="families"><Layers className="h-4 w-4 mr-2" />Familles</TabsTrigger>
          <TabsTrigger value="allergens"><AlertTriangle className="h-4 w-4 mr-2" />Allergènes</TabsTrigger>
          <TabsTrigger value="packaging"><Package className="h-4 w-4 mr-2" />Conditionnements</TabsTrigger>
          <TabsTrigger value="templates"><FileCode className="h-4 w-4 mr-2" />Templates Zebra</TabsTrigger>
        </TabsList>

        <TabsContent value="families">
          <Card>
            <CardHeader><CardTitle>Familles de produits</CardTitle></CardHeader>
            <CardContent>
              <CrudTable
                rows={families.data ?? []}
                columns={[{ key: 'code', label: 'Code' }, { key: 'label', label: 'Libellé' }]}
                onSave={(p) => handle(saveFamily, p, 'code')}
                onDelete={(id) => delFamily.mutate(id)}
                newRow={{ code: '', label: '', active: true }}
                search={search} onSearch={setSearch}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allergens">
          <Card>
            <CardHeader><CardTitle>Allergènes</CardTitle></CardHeader>
            <CardContent>
              <CrudTable
                rows={allergens.data ?? []}
                columns={[{ key: 'code', label: 'Code' }, { key: 'label', label: 'Libellé' }]}
                onSave={(p) => handle(saveAllergen, p, 'code')}
                onDelete={(id) => delAllergen.mutate(id)}
                newRow={{ code: '', label: '' }}
                search={search} onSearch={setSearch}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packaging">
          <Card>
            <CardHeader><CardTitle>Types de conditionnement</CardTitle></CardHeader>
            <CardContent>
              <CrudTable
                rows={packaging.data ?? []}
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'label', label: 'Libellé' },
                  { key: 'quantity', label: 'Quantité', type: 'number' },
                ]}
                onSave={(p) => handle(savePackaging, p, 'code')}
                onDelete={(id) => delPackaging.mutate(id)}
                newRow={{ code: '', label: '', quantity: 1, active: true }}
                search={search} onSearch={setSearch}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader><CardTitle>Templates d'étiquettes Zebra</CardTitle></CardHeader>
            <CardContent>
              <CrudTable
                rows={templates.data ?? []}
                columns={[
                  { key: 'template_code', label: 'Code' },
                  { key: 'template_name', label: 'Nom' },
                  { key: 'zpl_filename', label: 'Fichier ZPL' },
                ]}
                onSave={(p) => handle(saveTemplate, p, 'template_code')}
                onDelete={(id) => delTemplate.mutate(id)}
                newRow={{ template_code: '', template_name: '', zpl_filename: '', active: true }}
                search={search} onSearch={setSearch}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
