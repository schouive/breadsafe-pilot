import { useState, useEffect } from 'react';
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
  Thermometer, 
  CheckCircle2, 
  XCircle,
  Snowflake,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useColdRooms, useRecordTemperature, ColdRoom } from '@/hooks/useColdRooms';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface RoomTemperatureInput {
  temperature: string;
  notes: string;
}

export function StorageControlForm({ controlPoint, isOpen, onClose, onSubmit }: StorageControlFormProps) {
  const { user } = useAuth();
  const { data: coldRooms, isLoading: loadingRooms } = useColdRooms();
  const recordTemperature = useRecordTemperature();
  
  const [roomInputs, setRoomInputs] = useState<Record<string, RoomTemperatureInput>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize room inputs when cold rooms are loaded
  useEffect(() => {
    if (coldRooms) {
      const initialInputs: Record<string, RoomTemperatureInput> = {};
      coldRooms.forEach(room => {
        initialInputs[room.id] = { temperature: '', notes: '' };
      });
      setRoomInputs(initialInputs);
    }
  }, [coldRooms]);

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

  const getConformityInfo = (roomId: string) => {
    const room = coldRooms?.find(r => r.id === roomId);
    const input = roomInputs[roomId];
    
    if (!room || !input?.temperature) return null;
    
    const temp = parseFloat(input.temperature);
    if (isNaN(temp)) return null;
    
    return checkConformity(temp, room);
  };

  const handleTemperatureChange = (roomId: string, value: string) => {
    setRoomInputs(prev => ({
      ...prev,
      [roomId]: { ...prev[roomId], temperature: value }
    }));
  };

  const handleNotesChange = (roomId: string, value: string) => {
    setRoomInputs(prev => ({
      ...prev,
      [roomId]: { ...prev[roomId], notes: value }
    }));
  };

  const getFilledRooms = () => {
    return coldRooms?.filter(room => {
      const input = roomInputs[room.id];
      return input?.temperature && input.temperature.trim() !== '';
    }) || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    const filledRooms = getFilledRooms();
    
    if (filledRooms.length === 0) {
      toast.error('Veuillez saisir au moins une température');
      return;
    }

    setIsSubmitting(true);

    try {
      // Record all temperatures
      for (const room of filledRooms) {
        const input = roomInputs[room.id];
        const tempValue = parseFloat(input.temperature);
        const { isConforme } = checkConformity(tempValue, room);

        await recordTemperature.mutateAsync({
          cold_room_id: room.id,
          operator_id: user.id,
          temperature: tempValue,
          is_conforme: isConforme,
          notes: input.notes || undefined,
        });
      }

      // Notify with first room data for compatibility
      const firstRoom = filledRooms[0];
      const firstInput = roomInputs[firstRoom.id];
      const firstTemp = parseFloat(firstInput.temperature);
      const { isConforme, status } = checkConformity(firstTemp, firstRoom);

      toast.success(`${filledRooms.length} relevé(s) enregistré(s)`);

      onSubmit({
        status,
        coldRoomId: firstRoom.id,
        coldRoomName: firstRoom.name,
        temperature: firstTemp,
        isConforme,
        notes: firstInput.notes || undefined,
      });

      resetForm();
      onClose();
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    if (coldRooms) {
      const initialInputs: Record<string, RoomTemperatureInput> = {};
      coldRooms.forEach(room => {
        initialInputs[room.id] = { temperature: '', notes: '' };
      });
      setRoomInputs(initialInputs);
    }
  };

  if (!controlPoint) return null;

  const filledCount = getFilledRooms().length;
  const totalCount = coldRooms?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-primary" />
            {controlPoint.name}
          </DialogTitle>
          <DialogDescription>
            Saisissez les températures relevées pour chaque chambre froide
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {loadingRooms ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chargement des chambres froides...
                </div>
              ) : coldRooms?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune chambre froide configurée
                </div>
              ) : (
                coldRooms?.map((room) => {
                  const conformityInfo = getConformityInfo(room.id);
                  const input = roomInputs[room.id] || { temperature: '', notes: '' };
                  
                  return (
                    <Card 
                      key={room.id} 
                      className={cn(
                        "p-4 transition-all",
                        conformityInfo?.status === 'conforme' && "border-success/50 bg-success/5",
                        conformityInfo?.status === 'acceptable' && "border-warning/50 bg-warning/5",
                        conformityInfo?.status === 'nonconforme' && "border-destructive/50 bg-destructive/5"
                      )}
                    >
                      {/* Room header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            room.type === 'negatif' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-cyan-100 dark:bg-cyan-900/30'
                          )}>
                            <Snowflake className={cn(
                              "h-5 w-5",
                              room.type === 'negatif' ? 'text-blue-600 dark:text-blue-400' : 'text-cyan-600 dark:text-cyan-400'
                            )} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">{room.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Plage: {room.temp_min}°C à {room.temp_max}°C
                            </p>
                          </div>
                        </div>
                        
                        {/* Conformity badge */}
                        {conformityInfo && (
                          <Badge 
                            variant="outline"
                            className={cn(
                              "flex items-center gap-1.5",
                              conformityInfo.status === 'conforme' && "border-success text-success",
                              conformityInfo.status === 'acceptable' && "border-warning text-warning",
                              conformityInfo.status === 'nonconforme' && "border-destructive text-destructive"
                            )}
                          >
                            {conformityInfo.status === 'conforme' && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {conformityInfo.status === 'acceptable' && <AlertTriangle className="h-3.5 w-3.5" />}
                            {conformityInfo.status === 'nonconforme' && <XCircle className="h-3.5 w-3.5" />}
                            {conformityInfo.status === 'conforme' && 'Conforme'}
                            {conformityInfo.status === 'acceptable' && 'Acceptable'}
                            {conformityInfo.status === 'nonconforme' && 'Non conforme'}
                          </Badge>
                        )}
                      </div>

                      {/* Temperature input */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`temp-${room.id}`} className="text-sm">
                            Température (°C)
                          </Label>
                          <div className="relative">
                            <Input
                              id={`temp-${room.id}`}
                              type="number"
                              step="0.1"
                              placeholder={`Ex: ${room.type === 'negatif' ? '-18' : '4'}`}
                              value={input.temperature}
                              onChange={(e) => handleTemperatureChange(room.id, e.target.value)}
                              className={cn(
                                "h-12 text-lg font-medium pr-10",
                                conformityInfo?.status === 'conforme' && "border-success focus-visible:ring-success",
                                conformityInfo?.status === 'acceptable' && "border-warning focus-visible:ring-warning",
                                conformityInfo?.status === 'nonconforme' && "border-destructive focus-visible:ring-destructive"
                              )}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                              °C
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`notes-${room.id}`} className="text-sm">
                            Observations
                          </Label>
                          <Input
                            id={`notes-${room.id}`}
                            placeholder="Remarques..."
                            value={input.notes}
                            onChange={(e) => handleNotesChange(room.id, e.target.value)}
                            className="h-12"
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Summary and actions */}
          <div className="pt-4 mt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">
                {filledCount} / {totalCount} chambre(s) renseignée(s)
              </span>
              {filledCount > 0 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={resetForm}
                >
                  Effacer tout
                </Button>
              )}
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || filledCount === 0}
              >
                {isSubmitting ? 'Enregistrement...' : `Enregistrer (${filledCount})`}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
