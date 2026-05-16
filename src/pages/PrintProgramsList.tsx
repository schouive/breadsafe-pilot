import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle, ListOrdered, Loader2, Pencil, Copy, Trash2, Play, Users,
} from 'lucide-react';
import {
  usePrintPrograms, useProgramItemCounts,
  useDeletePrintProgram, useDuplicatePrintProgram, type PrintProgram,
} from '@/hooks/usePrintPrograms';
import { ProgramFormDialog } from '@/components/print/ProgramFormDialog';

export default function PrintProgramsList() {
  const navigate = useNavigate();
  const { data: programs = [], isLoading } = usePrintPrograms();
  const { data: counts = {} } = useProgramItemCounts();
  const del = useDeletePrintProgram();
  const dup = useDuplicatePrintProgram();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PrintProgram | null>(null);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: PrintProgram) => { setEditing(p); setDialogOpen(true); };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <ListOrdered className="h-8 w-8" />
            Programmes clients
          </h1>
          <p className="text-muted-foreground mt-1">
            Programmes d'impression réutilisables par client
          </p>
        </div>
        <Button size="lg" onClick={openCreate}>
          <PlusCircle className="h-5 w-5 mr-2" />
          Créer un programme
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : programs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Aucun programme. Créez votre premier programme client.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base truncate">{p.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      {p.customer_name || '—'}{p.customer_code ? ` (${p.customer_code})` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {counts[p.id] ?? 0} produit(s)
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/print/programs/${p.id}/run`)}
                  >
                    <Play className="h-4 w-4 mr-1" /> Ouvrir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4 mr-1" /> Modifier
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => dup.mutate(p.id)} disabled={dup.isPending}>
                    <Copy className="h-4 w-4 mr-1" /> Dupliquer
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => {
                      if (confirm(`Supprimer le programme « ${p.name} » ?`)) del.mutate(p.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProgramFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        program={editing}
      />
    </div>
  );
}
