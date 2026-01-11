import { useState } from 'react';
import { User, Bell, Shield, Database, Users, Building, Snowflake, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAllColdRooms, useCreateColdRoom, useUpdateColdRoom, ColdRoom } from '@/hooks/useColdRooms';
import { cn } from '@/lib/utils';
import { SupplierManagement } from '@/components/settings/SupplierManagement';
import { RawMaterialManagement } from '@/components/settings/RawMaterialManagement';
import { TemperatureInput } from '@/components/ui/TemperatureInput';

export default function Settings() {
  const { data: coldRooms, isLoading: loadingRooms } = useAllColdRooms();
  const createColdRoom = useCreateColdRoom();
  const updateColdRoom = useUpdateColdRoom();
  
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ColdRoom | null>(null);
  
  // New room form state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState('refrigere');
  const [newRoomTempMin, setNewRoomTempMin] = useState('');
  const [newRoomTempMax, setNewRoomTempMax] = useState('');

  const handleAddRoom = async () => {
    if (!newRoomName || !newRoomTempMin || !newRoomTempMax) return;
    
    await createColdRoom.mutateAsync({
      name: newRoomName,
      type: newRoomType,
      temp_min: parseFloat(newRoomTempMin),
      temp_max: parseFloat(newRoomTempMax),
    });
    
    setIsAddRoomOpen(false);
    resetNewRoomForm();
  };

  const handleUpdateRoom = async () => {
    if (!editingRoom) return;
    
    await updateColdRoom.mutateAsync({
      id: editingRoom.id,
      name: editingRoom.name,
      type: editingRoom.type,
      temp_min: editingRoom.temp_min,
      temp_max: editingRoom.temp_max,
    });
    
    setEditingRoom(null);
  };

  const handleToggleRoomActive = async (room: ColdRoom) => {
    await updateColdRoom.mutateAsync({
      id: room.id,
      is_active: !room.is_active,
    });
  };

  const resetNewRoomForm = () => {
    setNewRoomName('');
    setNewRoomType('refrigere');
    setNewRoomTempMin('');
    setNewRoomTempMax('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">
          Configuration de l'application HACCP
        </p>
      </div>

      {/* Cold Rooms Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Snowflake className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Chambres Froides</CardTitle>
                <CardDescription>Gérez les équipements de stockage réfrigéré</CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={() => setIsAddRoomOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRooms ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : coldRooms?.length === 0 ? (
            <div className="text-center py-8">
              <Snowflake className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune chambre froide configurée</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsAddRoomOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une chambre
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {coldRooms?.map((room) => (
                <div 
                  key={room.id} 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    room.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                  )}
                >
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
                    <Badge 
                      variant="outline" 
                      className={room.is_active ? 'bg-success/10 text-success border-success/30' : ''}
                    >
                      {room.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setEditingRoom(room)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleToggleRoomActive(room)}
                    >
                      {room.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suppliers Management */}
      <SupplierManagement />

      {/* Raw Materials Management */}
      <RawMaterialManagement />

      {/* Company info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Informations entreprise</CardTitle>
              <CardDescription>Détails de votre établissement</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Raison sociale</Label>
              <Input id="company" defaultValue="Breadshop SAS" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <Input id="siret" defaultValue="123 456 789 00012" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" defaultValue="Zone Industrielle, 75000 Paris" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="certification">Certification visée</Label>
            <div className="flex items-center gap-2">
              <Input id="certification" defaultValue="IFS Food v8" className="flex-1" />
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                En préparation
              </Badge>
            </div>
          </div>
          <Button>Enregistrer</Button>
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Utilisateurs</CardTitle>
                <CardDescription>Gérez les accès à l'application</CardDescription>
              </div>
            </div>
            <Button size="sm">Ajouter</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'Direction Générale', email: 'dg@breadshop.fr', role: 'admin', status: 'active' },
              { name: 'Assistant Qualité', email: 'qualite@breadshop.fr', role: 'quality_assistant', status: 'active' },
              { name: 'Marie Dupont', email: 'marie.d@breadshop.fr', role: 'operator', status: 'active' },
              { name: 'Jean Pierre', email: 'jean.p@breadshop.fr', role: 'operator', status: 'active' },
            ].map((user, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {user.role === 'admin' ? 'Administrateur' : 
                     user.role === 'quality_assistant' ? 'Assistant Qualité' : 'Opérateur'}
                  </Badge>
                  <Button variant="ghost" size="sm">Modifier</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configurez les alertes et rappels</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Rappels de contrôles</p>
              <p className="text-sm text-muted-foreground">Notifications push pour les contrôles planifiés</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Alertes température</p>
              <p className="text-sm text-muted-foreground">Notification immédiate en cas de non-conformité</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Alertes DLC</p>
              <p className="text-sm text-muted-foreground">Rappel 48h avant péremption des stocks</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Résumé quotidien</p>
              <p className="text-sm text-muted-foreground">Email récapitulatif chaque soir à 18h</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Data & Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Données & Sécurité</CardTitle>
              <CardDescription>Gestion des données et conformité</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Durée de conservation</p>
                <p className="text-sm text-muted-foreground">Les enregistrements sont conservés 5 ans (IFS)</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              Conforme
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Sauvegarde automatique</p>
              <p className="text-sm text-muted-foreground">Dernière sauvegarde: Aujourd'hui à 06:00</p>
            </div>
            <Button variant="outline" size="sm">Configurer</Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Export des données</p>
              <p className="text-sm text-muted-foreground">Téléchargez toutes vos données HACCP</p>
            </div>
            <Button variant="outline" size="sm">Exporter</Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Cold Room Dialog */}
      <Dialog open={isAddRoomOpen} onOpenChange={setIsAddRoomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une chambre froide</DialogTitle>
            <DialogDescription>
              Configurez une nouvelle chambre froide pour le suivi des températures
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Nom *</Label>
              <Input
                id="room-name"
                placeholder="Ex: Chambre froide principale"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-type">Type</Label>
              <Select value={newRoomType} onValueChange={setNewRoomType}>
                <SelectTrigger id="room-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refrigere">Stockage réfrigéré (positif)</SelectItem>
                  <SelectItem value="negatif">Stockage négatif (congélateur)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Température min (°C) *</Label>
                <TemperatureInput
                  value={newRoomTempMin}
                  onChange={setNewRoomTempMin}
                  placeholder={newRoomType === 'negatif' ? '-22' : '0'}
                />
              </div>
              <div className="space-y-2">
                <Label>Température max (°C) *</Label>
                <TemperatureInput
                  value={newRoomTempMax}
                  onChange={setNewRoomTempMax}
                  placeholder={newRoomType === 'negatif' ? '-18' : '4'}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRoomOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleAddRoom}
              disabled={createColdRoom.isPending || !newRoomName || !newRoomTempMin || !newRoomTempMax}
            >
              {createColdRoom.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Cold Room Dialog */}
      <Dialog open={!!editingRoom} onOpenChange={(open) => !open && setEditingRoom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la chambre froide</DialogTitle>
            <DialogDescription>
              Modifiez les paramètres de cette chambre froide
            </DialogDescription>
          </DialogHeader>
          {editingRoom && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-room-name">Nom *</Label>
                <Input
                  id="edit-room-name"
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-room-type">Type</Label>
                <Select 
                  value={editingRoom.type} 
                  onValueChange={(value) => setEditingRoom({ ...editingRoom, type: value })}
                >
                  <SelectTrigger id="edit-room-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="refrigere">Stockage réfrigéré (positif)</SelectItem>
                    <SelectItem value="negatif">Stockage négatif (congélateur)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Température min (°C) *</Label>
                  <TemperatureInput
                    value={String(editingRoom.temp_min)}
                    onChange={(val) => {
                      const numVal = val === '' || val === '-' ? 0 : parseFloat(val);
                      setEditingRoom({ ...editingRoom, temp_min: isNaN(numVal) ? 0 : numVal });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Température max (°C) *</Label>
                  <TemperatureInput
                    value={String(editingRoom.temp_max)}
                    onChange={(val) => {
                      const numVal = val === '' || val === '-' ? 0 : parseFloat(val);
                      setEditingRoom({ ...editingRoom, temp_max: isNaN(numVal) ? 0 : numVal });
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoom(null)}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpdateRoom}
              disabled={updateColdRoom.isPending}
            >
              {updateColdRoom.isPending ? 'Mise à jour...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
