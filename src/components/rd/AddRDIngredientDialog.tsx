import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Search } from 'lucide-react';
import { useFoodRawMaterials } from '@/hooks/useSuppliers';
import { useUpsertTrialIngredient } from '@/hooks/useRDTrials';

interface Props {
  trialId: string;
  orderIndex: number;
}

export function AddRDIngredientDialog({ trialId, orderIndex }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('catalog');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [manualName, setManualName] = useState('');
  const { data: materials } = useFoodRawMaterials();
  const upsert = useUpsertTrialIngredient();

  const filtered = useMemo(() => {
    const list = (materials ?? []).filter((m) => m.is_active);
    if (!search.trim()) return list.slice(0, 50);
    const s = search.toLowerCase();
    return list.filter((m) =>
      m.name.toLowerCase().includes(s) ||
      (m.suppliers?.name ?? '').toLowerCase().includes(s)
    ).slice(0, 50);
  }, [materials, search]);

  const reset = () => {
    setSelectedId(''); setManualName(''); setSearch(''); setTab('catalog');
  };

  const handleSubmit = async () => {
    if (tab === 'catalog') {
      const mat = materials?.find((m) => m.id === selectedId);
      if (!mat) return;
      await upsert.mutateAsync({
        trial_id: trialId,
        ingredient_name: mat.name,
        raw_material_id: mat.id,
        quantity: 0,
        unit: 'kg',
        order_index: orderIndex,
      });
    } else {
      if (!manualName.trim()) return;
      await upsert.mutateAsync({
        trial_id: trialId,
        ingredient_name: manualName.trim(),
        raw_material_id: null,
        quantity: 0,
        unit: 'kg',
        order_index: orderIndex,
      });
    }
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un ingrédient</DialogTitle>
          <DialogDescription>Choisissez une matière première référencée ou saisissez-la manuellement.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="catalog">Catalogue MP</TabsTrigger>
            <TabsTrigger value="manual">Saisie manuelle</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une matière première..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground p-3 text-center">Aucune matière première</p>
              )}
              {filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full text-left p-2 text-sm hover:bg-accent transition ${selectedId === m.id ? 'bg-accent' : ''}`}
                >
                  <div className="font-medium">{m.name}</div>
                  {m.suppliers?.name && <div className="text-xs text-muted-foreground">{m.suppliers.name}</div>}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-3 mt-3">
            <div>
              <Label>Nom de l'ingrédient *</Label>
              <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Ex: Levain liquide maison" />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            disabled={upsert.isPending || (tab === 'catalog' ? !selectedId : !manualName.trim())}
          >
            {upsert.isPending ? 'Ajout...' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
