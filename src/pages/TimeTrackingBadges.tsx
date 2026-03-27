import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, Trash2, Scan } from 'lucide-react';
import { toast } from 'sonner';

export default function TimeTrackingBadges() {
  const queryClient = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [scanMode, setScanMode] = useState(false);

  // All profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles-badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, badge_id, photo_url, avatar_url, is_active')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const assignBadge = useMutation({
    mutationFn: async ({ userId, badgeId }: { userId: string; badgeId: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ badge_id: badgeId })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles-badges'] });
      queryClient.invalidateQueries({ queryKey: ['employees-badges'] });
      toast.success('Badge assigné avec succès');
      setShowAssign(false);
      setSelectedUser('');
      setBadgeId('');
    },
    onError: (error: any) => {
      if (error?.message?.includes('unique') || error?.message?.includes('duplicate')) {
        toast.error('Ce badge est déjà assigné à un autre employé');
      } else {
        toast.error("Erreur lors de l'assignation du badge");
      }
    },
  });

  const removeBadge = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ badge_id: null })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles-badges'] });
      queryClient.invalidateQueries({ queryKey: ['employees-badges'] });
      toast.success('Badge retiré');
    },
  });

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const usersWithBadges = profiles.filter((p) => p.badge_id);
  const usersWithoutBadges = profiles.filter((p) => !p.badge_id && p.is_active);

  // Handle scan input for badge assignment
  const handleBadgeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && badgeId.trim()) {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des badges</h1>
          <p className="text-sm text-muted-foreground">Associer des badges RFID aux employés</p>
        </div>
        <Button onClick={() => setShowAssign(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Assigner un badge
        </Button>
      </div>

      {/* Badges Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Badges assignés ({usersWithBadges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Chargement...</p>
          ) : usersWithBadges.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun badge assigné</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Badge ID</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersWithBadges.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.photo_url || profile.avatar_url || ''} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{profile.full_name}</span>
                          <span className="block text-xs text-muted-foreground">{profile.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{profile.badge_id}</TableCell>
                    <TableCell>
                      <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                        {profile.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => removeBadge.mutate(profile.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Badge Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un badge RFID</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Employé</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {usersWithoutBadges.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Badge ID (scannez le badge ou saisissez l'ID)
              </label>
              <Input
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                onKeyDown={handleBadgeInput}
                placeholder="Scannez le badge RFID..."
                autoFocus
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Approchez le badge du lecteur RFID pour capturer l'ID automatiquement
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (!selectedUser || !badgeId.trim()) {
                  toast.error('Sélectionnez un employé et scannez un badge');
                  return;
                }
                assignBadge.mutate({ userId: selectedUser, badgeId: badgeId.trim() });
              }}
              disabled={assignBadge.isPending}
            >
              Assigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
