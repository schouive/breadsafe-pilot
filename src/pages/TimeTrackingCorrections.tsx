import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import {
  useTimeCorrections,
  useReviewCorrection,
  useTimeEntries,
  useCreateCorrection,
  useEmployeesWithBadges,
  TimeCorrection,
} from '@/hooks/useTimeTracking';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle2, XCircle, Plus, FileEdit } from 'lucide-react';
import { toast } from 'sonner';

const EVENT_LABELS: Record<string, string> = {
  clock_in: 'Entrée',
  clock_out: 'Sortie',
  break_start: 'Début pause',
  break_end: 'Fin pause',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Rejetée',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

export default function TimeTrackingCorrections() {
  const { user, hasRole } = useAuth();
  const isManager = hasRole('admin') || hasRole('quality_assistant');
  const [filter, setFilter] = useState<string>('pending');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    entryId: '',
    reason: '',
    correctedEventType: '',
    correctedDateTime: '',
  });

  const { data: corrections = [], isLoading } = useTimeCorrections(filter === 'all' ? undefined : filter);
  const reviewMutation = useReviewCorrection();
  const createMutation = useCreateCorrection();
  const { data: employees = [] } = useEmployeesWithBadges();
  // Fenêtre de correction : les 2 derniers mois
  const correctionWindowStart = useMemo(() => subMonths(new Date(), 2).toISOString(), []);
  const { data: recentEntries = [] } = useTimeEntries({
    employeeId: createForm.employeeId || undefined,
    dateFrom: correctionWindowStart,
    limit: 2000,
  });


  const handleReview = async (correctionId: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    await reviewMutation.mutateAsync({
      correctionId,
      status,
      reviewerId: user.id,
      comment: reviewComment,
    });
    setReviewingId(null);
    setReviewComment('');
  };

  const handleCreate = async () => {
    if (!user || !createForm.entryId || !createForm.reason) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }

    const entry = recentEntries.find((e) => e.id === createForm.entryId);
    if (!entry) return;

    await createMutation.mutateAsync({
      time_entry_id: createForm.entryId,
      requested_by: user.id,
      original_event_type: entry.event_type,
      corrected_event_type: createForm.correctedEventType || undefined,
      original_recorded_at: entry.recorded_at,
      corrected_recorded_at: createForm.correctedDateTime
        ? new Date(createForm.correctedDateTime).toISOString()
        : undefined,
      reason: createForm.reason,
    });

    setShowCreate(false);
    setCreateForm({ employeeId: '', entryId: '', reason: '', correctedEventType: '', correctedDateTime: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Corrections de pointage</h1>
          <p className="text-sm text-muted-foreground">Demandes de modification des événements</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="approved">Approuvées</SelectItem>
              <SelectItem value="rejected">Rejetées</SelectItem>
              <SelectItem value="all">Toutes</SelectItem>
            </SelectContent>
          </Select>
          {isManager && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle correction
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Chargement...</p>
          ) : corrections.length === 0 ? (
            <div className="text-center py-12">
              <FileEdit className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune correction</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type original</TableHead>
                    <TableHead>Correction</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead>Statut</TableHead>
                    {isManager && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {corrections.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="tabular-nums">
                        {format(new Date(c.original_recorded_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{EVENT_LABELS[c.original_event_type] || c.original_event_type}</TableCell>
                      <TableCell>
                        {c.corrected_event_type
                          ? EVENT_LABELS[c.corrected_event_type] || c.corrected_event_type
                          : '-'}
                        {c.corrected_recorded_at && (
                          <span className="block text-xs text-muted-foreground">
                            → {format(new Date(c.corrected_recorded_at), 'dd/MM HH:mm')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{c.reason}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                      </TableCell>
                      {isManager && (
                        <TableCell>
                          {c.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600"
                                onClick={() => setReviewingId(c.id)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleReview(c.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewingId} onOpenChange={() => setReviewingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approuver la correction</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Commentaire (optionnel)"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingId(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => reviewingId && handleReview(reviewingId, 'approved')}
              disabled={reviewMutation.isPending}
            >
              Approuver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Correction Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle correction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Employé</label>
              <Select
                value={createForm.employeeId}
                onValueChange={(v) => setCreateForm((p) => ({ ...p, employeeId: v, entryId: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {createForm.employeeId && (
              <div>
                <label className="text-sm font-medium">Événement à corriger</label>
                <Select
                  value={createForm.entryId}
                  onValueChange={(v) => {
                    const sel = recentEntries.find((e) => e.id === v);
                    setCreateForm((p) => ({
                      ...p,
                      entryId: v,
                      correctedDateTime: sel
                        ? format(new Date(sel.recorded_at), "yyyy-MM-dd'T'HH:mm")
                        : p.correctedDateTime,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un événement" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {recentEntries.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {format(new Date(e.recorded_at), 'EEE dd/MM/yyyy HH:mm', { locale: fr })} —{' '}
                        {EVENT_LABELS[e.event_type]}
                      </SelectItem>
                    ))}
                    {recentEntries.length === 0 && (
                      <div className="px-2 py-3 text-sm text-muted-foreground">
                        Aucun pointage sur les 2 derniers mois
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Pointages des 2 derniers mois
                </p>
              </div>
            )}


            <div>
              <label className="text-sm font-medium">Nouveau type (optionnel)</label>
              <Select
                value={createForm.correctedEventType}
                onValueChange={(v) => setCreateForm((p) => ({ ...p, correctedEventType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Garder le type original" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clock_in">Entrée</SelectItem>
                  <SelectItem value="clock_out">Sortie</SelectItem>
                  <SelectItem value="break_start">Début pause</SelectItem>
                  <SelectItem value="break_end">Fin pause</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Nouvelle date/heure (optionnel)</label>
              <Input
                type="datetime-local"
                value={createForm.correctedDateTime}
                onChange={(e) => setCreateForm((p) => ({ ...p, correctedDateTime: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Raison *</label>
              <Textarea
                placeholder="Raison de la correction..."
                value={createForm.reason}
                onChange={(e) => setCreateForm((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
