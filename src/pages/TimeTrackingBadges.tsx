import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Edit2, Trash2, Scan, UserCheck, UserX, LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useBadgeScan } from '@/hooks/useBadgeScan';

interface Employee {
  id: string;
  full_name: string;
  badge_id: string | null;
  photo_url: string | null;
  position: string | null;
  email: string | null;
  hire_date: string | null;
  is_active: boolean;
  user_id: string | null;
}

const emptyForm: Omit<Employee, 'id'> = {
  full_name: '',
  badge_id: '',
  photo_url: '',
  position: '',
  email: '',
  hire_date: '',
  is_active: true,
  user_id: null,
};

export default function TimeTrackingBadges() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Employee, 'id'>>(emptyForm);

  // Capture RFID scans while the form dialog is open so the stored badge_id
  // matches exactly what the OS keyboard layout produces at the kiosk.
  useBadgeScan({
    enabled: showForm,
    cooldownMs: 500,
    onScan: ({ badgeId }) => {
      setForm((f) => ({ ...f, badge_id: badgeId }));
      toast.success(`Badge capturé : ${badgeId}`);
    },
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return (data || []) as Employee[];
    },
  });

  const saveEmployee = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: form.full_name.trim(),
        badge_id: form.badge_id?.trim() || null,
        photo_url: form.photo_url?.trim() || null,
        position: form.position?.trim() || null,
        email: form.email?.trim() || null,
        hire_date: form.hire_date || null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('employees').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employees').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees-badges'] });
      toast.success(editing ? 'Employé mis à jour' : 'Employé créé');
      closeForm();
    },
    onError: (error: any) => {
      if (error?.message?.includes('unique') || error?.message?.includes('duplicate')) {
        toast.error('Ce badge est déjà assigné à un autre employé');
      } else {
        toast.error('Erreur : ' + (error?.message || 'inconnue'));
      }
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees-badges'] });
      toast.success('Employé supprimé');
    },
    onError: (e: any) => toast.error('Suppression impossible : ' + (e?.message || '')),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      full_name: emp.full_name,
      badge_id: emp.badge_id || '',
      photo_url: emp.photo_url || '',
      position: emp.position || '',
      email: emp.email || '',
      hire_date: emp.hire_date || '',
      is_active: emp.is_active,
      user_id: emp.user_id,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const active = employees.filter((e) => e.is_active);
  const inactive = employees.filter((e) => !e.is_active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employés & badges</h1>
          <p className="text-sm text-muted-foreground">
            Gérez tous les employés (avec ou sans compte app) et leurs badges RFID
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel employé
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employés actifs ({active.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Chargement...</p>
          ) : active.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun employé actif</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Compte app</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={emp.photo_url || ''} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(emp.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{emp.full_name}</span>
                          {emp.email && (
                            <span className="block text-xs text-muted-foreground">{emp.email}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{emp.position || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {emp.badge_id || <span className="text-muted-foreground italic">Aucun</span>}
                    </TableCell>
                    <TableCell>
                      {emp.user_id ? (
                        <Badge variant="outline" className="text-xs">
                          <LinkIcon className="h-3 w-3 mr-1" /> Lié
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Badge seul</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(emp)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {!emp.user_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Supprimer ${emp.full_name} ?`)) deleteEmployee.mutate(emp.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {inactive.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
              <UserX className="h-5 w-5" />
              Employés inactifs ({inactive.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inactive.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                  <span className="text-sm">{emp.full_name}</span>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(emp)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier l\'employé' : 'Nouvel employé'}</DialogTitle>
            <DialogDescription>
              {editing?.user_id
                ? 'Cet employé a un compte app — les modifications ne synchronisent pas le compte.'
                : 'Employé badge-only (pas de compte app nécessaire pour pointer).'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Nom complet *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Jean Dupont"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Poste</Label>
                <Input
                  value={form.position || ''}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="Boulanger"
                />
              </div>
              <div>
                <Label>Date d'embauche</Label>
                <Input
                  type="date"
                  value={form.hire_date || ''}
                  onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Email (optionnel)</Label>
              <Input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jean@exemple.fr"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Badge RFID
              </Label>
              <Input
                value={form.badge_id || ''}
                onChange={(e) => setForm({ ...form, badge_id: e.target.value })}
                placeholder="Scannez le badge ici..."
                className="font-mono"
                data-badge-scanner="true"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Approchez le badge du lecteur — l'ID sera capturé automatiquement (recommandé plutôt que la saisie manuelle).
              </p>
            </div>

            <div>
              <Label>Photo (URL)</Label>
              <Input
                value={form.photo_url || ''}
                onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Employé actif</Label>
                <p className="text-xs text-muted-foreground">Désactivez pour bloquer le pointage</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Annuler</Button>
            <Button
              onClick={() => {
                if (!form.full_name.trim()) {
                  toast.error('Le nom est obligatoire');
                  return;
                }
                saveEmployee.mutate();
              }}
              disabled={saveEmployee.isPending}
            >
              {saveEmployee.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
