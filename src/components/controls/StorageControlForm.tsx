import { useState } from 'react';
import { ControlPoint, ControlStatus } from '@/types/haccp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Thermometer, 
  CheckCircle2, 
  XCircle,
  Snowflake,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useColdRooms, useRecordTemperature, ColdRoom } from '@/hooks/useColdRooms';
import { Separator } from '@/components/ui/separator';

interface StorageControlFormProps {
  controlPoint: ControlPoint | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StorageFormData) => void;
}

export interface StorageFormData {
  status: ControlStatus;
  coldRoomId: string;
  coldRoomName: string;
  temperature: number;
  isConforme: boolean;
  notes?: string;
}

export function StorageControlForm({ controlPoint, isOpen, onClose, onSubmit }: StorageControlFormProps) {
  const { user } = useAuth();
  const { data: coldRooms, isLoading: loadingRooms } = useColdRooms();
  const recordTemperature = useRecordTemperature();
  
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');

  const selectedRoom = coldRooms?.find(r => r.id === selectedRoomId);

  const checkConformity = (temp: number, room: ColdRoom): { isConforme: boolean; status: ControlStatus } => {
    if (temp >= room.temp_min && temp <= room.temp_max) {
      return { isConforme: true, status: 'conforme' };
    }
    
    // Vérifier si acceptable (écart de 3°C max)
    const acceptableMin = room.temp_min - 3;
    const acceptableMax = room.temp_max + 3;
    
    if (temp >= acceptableMin && temp <= acceptableMax) {
      return { isConforme: false, status: 'acceptable' };
    }
    
    return { isConforme: false, status: 'nonconforme' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRoomId || !temperature || !selectedRoom || !user) {
      toast.error('Veuillez renseigner tous les champs obligatoires');
      return;
    }

    const tempValue = parseFloat(temperature);
    const { isConforme, status } = checkConformity(tempValue, selectedRoom);

    try {
      await recordTemperature.mutateAsync({
        cold_room_id: selectedRoomId,
        operator_id: user.id,
        temperature: tempValue,
        is_conforme: isConforme,
        notes: notes || undefined,
      });

      onSubmit({
        status,
        coldRoomId: selectedRoomId,
        coldRoomName: selectedRoom.name,
        temperature: tempValue,
        isConforme,
        notes: notes || undefined,
      });

      resetForm();
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
    setSelectedRoomId('');
    setTemperature('');
    setNotes('');
  };

  if (!controlPoint) return null;

  const tempValue = temperature ? parseFloat(temperature) : null;
  const conformityInfo = tempValue !== null && selectedRoom 
    ? checkConformity(tempValue, selectedRoom) 
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-primary" />
            {controlPoint.name}
          </DialogTitle>
          <DialogDescription>
            Relevé de température des chambres froides
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cold room selection */}
          <div className="space-y-2">
            <Label htmlFor="cold-room">Chambre froide *</Label>
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger id="cold-room">
                <SelectValue placeholder="Sélectionner une chambre" />
              </SelectTrigger>
              <SelectContent>
                {loadingRooms ? (
                  <SelectItem value="loading" disabled>Chargement...</SelectItem>
                ) : coldRooms?.length === 0 ? (
                  <SelectItem value="none" disabled>Aucune chambre configurée</SelectItem>
                ) : (
                  coldRooms?.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      <div className="flex items-center gap-2">
                        <Snowflake className={cn(
                          "h-4 w-4",
                          room.type === 'negatif' ? 'text-blue-500' : 'text-cyan-500'
                        )} />
                        {room.name} ({room.temp_min}°C à {room.temp_max}°C)
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedRoom && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm">
                <Snowflake className={cn(
                  "h-4 w-4",
                  selectedRoom.type === 'negatif' ? 'text-blue-500' : 'text-cyan-500'
                )} />
                <span className="font-medium">
                  {selectedRoom.type === 'negatif' ? 'Stockage négatif' : 'Stockage réfrigéré'}
                </span>
                <span className="text-muted-foreground">
                  • Plage: {selectedRoom.temp_min}°C à {selectedRoom.temp_max}°C
                </span>
              </div>
            </div>
          )}

          <Separator />

          {/* Temperature input */}
          <div className="space-y-2">
            <Label htmlFor="temperature">Température relevée (°C) *</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              placeholder="Ex: -18.5"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="text-lg h-12"
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observations (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Remarques..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Status summary */}
          {conformityInfo && (
            <div className={cn(
              "p-4 rounded-lg border-2",
              conformityInfo.status === 'conforme' && "bg-success/10 border-success/30",
              conformityInfo.status === 'acceptable' && "bg-warning/10 border-warning/30",
              conformityInfo.status === 'nonconforme' && "bg-destructive/10 border-destructive/30"
            )}>
              <div className="flex items-center gap-3">
                {conformityInfo.status === 'conforme' && <CheckCircle2 className="h-6 w-6 text-success" />}
                {conformityInfo.status === 'acceptable' && <XCircle className="h-6 w-6 text-warning" />}
                {conformityInfo.status === 'nonconforme' && <XCircle className="h-6 w-6 text-destructive" />}
                <div>
                  <p className="font-medium">
                    {conformityInfo.status === 'conforme' && 'Température conforme'}
                    {conformityInfo.status === 'acceptable' && 'Écart acceptable'}
                    {conformityInfo.status === 'nonconforme' && 'Non-conforme'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {conformityInfo.status === 'conforme' && 'Dans la plage définie'}
                    {conformityInfo.status === 'acceptable' && 'Surveillance renforcée recommandée'}
                    {conformityInfo.status === 'nonconforme' && 'Action corrective requise'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={recordTemperature.isPending || !selectedRoomId || !temperature}
            >
              {recordTemperature.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
