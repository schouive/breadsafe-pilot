import { useState } from 'react';
import { Plus, Edit2, X, Check, Trash2, Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAllColdRooms, useCreateColdRoom, useUpdateColdRoom, useDeleteColdRoom, ColdRoom } from '@/hooks/useColdRooms';
import { TemperatureInput } from '@/components/ui/TemperatureInput';
import { cn } from '@/lib/utils';

export default function ColdRoomsSettings() {
  const { data: coldRooms, isLoading } = useAllColdRooms();
  const createColdRoom = useCreateColdRoom();
  const updateColdRoom = useUpdateColdRoom();
  const deleteColdRoom = useDeleteColdRoom();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<ColdRoom | null>(null);
  const [deleting, setDeleting] = useState<ColdRoom | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('refrigere');
  const [tempMin, setTempMin] = useState('');
  const [tempMax, setTempMax] = useState('');

  const reset = () => { setName(''); setType('refrigere'); setTempMin(''); setTempMax(''); };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Chambres froides</h1>
        <p className="text-muted-foreground mt-1">Équipements de stockage réfrigéré</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Snowflake className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Chambres froides</CardTitle>
                <CardDescription>Gérez les équipements de stockage</CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Chargement...</p> :
           !coldRooms?.length ? (
            <div className="text-center py-8">
              <Snowflake className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune chambre froide</p>
            </div>
           ) : (
            <div className="space-y-4">
              {coldRooms.map((room) => (
                <div key={room.id} className={cn(
                  "flex items-center justify-between p-4 rounded-lg border",
                  room.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      room.type === 'negatif' ? 'bg-cyan-100 text-cyan-500' : 'bg-blue-100 text-blue-600'
                    )}>
                      <Snowflake className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{room.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {room.type === 'negatif' ? 'Stockage négatif' : 'Stockage réfrigéré'} • {room.temp_min}°C à {room.temp_max}°C
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={room.is_active ? 'bg-success/10 text-success border-success/30' : ''}>
                      {room.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(room)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => updateColdRoom.mutateAsync({ id: room.id, is_active: !room.is_active })}>
                      {room.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleting(room)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
           )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une chambre froide</DialogTitle>
            <DialogDescription>Configurez une nouvelle chambre froide</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nom *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="refrigere">Stockage réfrigéré (positif)</SelectItem>
                  <SelectItem value="negatif">Stockage négatif (congélateur)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Temp min (°C) *</Label><TemperatureInput value={tempMin} onChange={setTempMin} /></div>
              <div className="space-y-2"><Label>Temp max (°C) *</Label><TemperatureInput value={tempMax} onChange={setTempMax} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
            <Button onClick={async () => {
              await createColdRoom.mutateAsync({ name, type, temp_min: parseFloat(tempMin), temp_max: parseFloat(tempMax) });
              setIsAddOpen(false); reset();
            }} disabled={!name || !tempMin || !tempMax || createColdRoom.isPending}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier la chambre froide</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nom *</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="refrigere">Stockage réfrigéré (positif)</SelectItem>
                    <SelectItem value="negatif">Stockage négatif (congélateur)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Temp min (°C) *</Label>
                  <TemperatureInput value={String(editing.temp_min)} onChange={(v) => setEditing({ ...editing, temp_min: parseFloat(v) || 0 })} /></div>
                <div className="space-y-2"><Label>Temp max (°C) *</Label>
                  <TemperatureInput value={String(editing.temp_max)} onChange={(v) => setEditing({ ...editing, temp_max: parseFloat(v) || 0 })} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={async () => {
              if (!editing) return;
              await updateColdRoom.mutateAsync(editing);
              setEditing(null);
            }} disabled={updateColdRoom.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette chambre froide ?</AlertDialogTitle>
            <AlertDialogDescription>Action irréversible. Les enregistrements associés seront aussi supprimés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (deleting) await deleteColdRoom.mutateAsync(deleting.id);
              setDeleting(null);
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
