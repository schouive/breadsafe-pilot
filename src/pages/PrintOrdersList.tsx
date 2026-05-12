import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, ListOrdered, Printer, Loader2 } from 'lucide-react';
import { usePrintBatches, useCreatePrintBatch, useDeletePrintBatch, type BatchStatus } from '@/hooks/usePrintBatches';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABEL: Record<BatchStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Brouillon', variant: 'outline' },
  ready: { label: 'Prêt', variant: 'secondary' },
  printing: { label: 'En cours', variant: 'default' },
  completed: { label: 'Terminé', variant: 'default' },
  partial: { label: 'Partiel', variant: 'destructive' },
  failed: { label: 'Échoué', variant: 'destructive' },
};

export default function PrintOrdersList() {
  const navigate = useNavigate();
  const { data: batches = [], isLoading } = usePrintBatches();
  const createBatch = useCreatePrintBatch();
  const deleteBatch = useDeletePrintBatch();

  const handleNew = async () => {
    try {
      const batch = await createBatch.mutateAsync({});
      navigate(`/print/orders/${batch.id}`);
    } catch (e: any) {
      toast.error(e?.message || 'Impossible de créer l\'ordre');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <ListOrdered className="h-8 w-8" />
            Ordres d'impression
          </h1>
          <p className="text-muted-foreground mt-1">
            Sessions multi-produits pour impression Zebra
          </p>
        </div>
        <Button size="lg" onClick={handleNew} disabled={createBatch.isPending}>
          {createBatch.isPending ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <PlusCircle className="h-5 w-5 mr-2" />
          )}
          Nouvel ordre
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des ordres</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun ordre. Cliquez sur « Nouvel ordre ».
            </div>
          ) : (
            <div className="divide-y">
              {batches.map(b => {
                const s = STATUS_LABEL[b.status];
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/40 px-2 -mx-2 rounded"
                    onClick={() => navigate(`/print/orders/${b.id}`)}
                  >
                    <Printer className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-semibold">{b.batch_number}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {b.name || '— Sans nom —'} · {format(new Date(b.created_at), 'PPp', { locale: fr })}
                      </div>
                    </div>
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Supprimer l'ordre ${b.batch_number} ?`)) {
                          deleteBatch.mutate(b.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
