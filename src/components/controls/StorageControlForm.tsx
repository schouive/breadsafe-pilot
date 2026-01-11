import { useState, useEffect } from 'react';
import { ControlPoint, ControlStatus } from '@/types/haccp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useColdRooms, useRecordTemperature, ColdRoom } from '@/hooks/useColdRooms';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NumericKeypad } from './NumericKeypad';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
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

  // Reset active room when opening
  useEffect(() => {
    if (isOpen) {
      setActiveRoomId(null);
    }
  }, [isOpen]);

  const checkConformity = (temp: number, room: ColdRoom): { isConforme: boolean; status: ControlStatus } => {
    if (temp >= room.temp_min && temp <= room.temp_max) {
      return { isConforme: true, status: 'conforme' };
    }
    
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

  const handleSingleRoomSubmit = async (room: ColdRoom) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    const input = roomInputs[room.id];
    if (!input?.temperature) {
      toast.error('Veuillez saisir une température');
      return;
    }

    const tempValue = parseFloat(input.temperature);
    if (isNaN(tempValue)) {
      toast.error('Température invalide');
      return;
    }

    setIsSubmitting(true);

    try {
      const { isConforme, status } = checkConformity(tempValue, room);

      await recordTemperature.mutateAsync({
        cold_room_id: room.id,
        operator_id: user.id,
        temperature: tempValue,
        is_conforme: isConforme,
        notes: input.notes || undefined,
      });

      toast.success(`Température enregistrée pour ${room.name}`);

      // Reset this room's input
      setRoomInputs(prev => ({
        ...prev,
        [room.id]: { temperature: '', notes: '' }
      }));
      setActiveRoomId(null);

      onSubmit({
        status,
        coldRoomId: room.id,
        coldRoomName: room.name,
        temperature: tempValue,
        isConforme,
        notes: input.notes || undefined,
      });
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHistoryClick = (room: ColdRoom) => {
    onClose();
    navigate('/storage-temperatures', { state: { selectedRoom: room.id } });
  };

  const resetForm = () => {
    if (coldRooms) {
      const initialInputs: Record<string, RoomTemperatureInput> = {};
      coldRooms.forEach(room => {
        initialInputs[room.id] = { temperature: '', notes: '' };
      });
      setRoomInputs(initialInputs);
    }
    setActiveRoomId(null);
  };

  if (!controlPoint) return null;

  const activeRoom = coldRooms?.find(r => r.id === activeRoomId);
  const activeInput = activeRoomId ? roomInputs[activeRoomId] : null;
  const activeConformity = activeRoomId ? getConformityInfo(activeRoomId) : null;

  // Count filled rooms for validation button
  const filledRoomsCount = Object.entries(roomInputs).filter(
    ([_, input]) => input.temperature && input.temperature.trim() !== ''
  ).length;

  const handleSubmitAll = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    const filledRooms = coldRooms?.filter(room => {
      const input = roomInputs[room.id];
      return input?.temperature && input.temperature.trim() !== '';
    }) || [];

    if (filledRooms.length === 0) {
      toast.error('Veuillez saisir au moins une température');
      return;
    }

    setIsSubmitting(true);

    try {
      for (const room of filledRooms) {
        const input = roomInputs[room.id];
        const tempValue = parseFloat(input.temperature);
        
        if (isNaN(tempValue)) continue;

        const { isConforme, status } = checkConformity(tempValue, room);

        await recordTemperature.mutateAsync({
          cold_room_id: room.id,
          operator_id: user.id,
          temperature: tempValue,
          is_conforme: isConforme,
          notes: input.notes || undefined,
        });

        onSubmit({
          status,
          coldRoomId: room.id,
          coldRoomName: room.name,
          temperature: tempValue,
          isConforme,
          notes: input.notes || undefined,
        });
      }

      toast.success(`${filledRooms.length} température(s) enregistrée(s)`);
      resetForm();
      onClose();
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-primary" />
            {controlPoint.name}
          </DialogTitle>
          <DialogDescription>
            {coldRooms?.length || 0} équipements surveillés
          </DialogDescription>
        </DialogHeader>

        {activeRoomId && activeRoom && activeInput ? (
          // Temperature input mode for a specific room
          <div className="flex flex-col flex-1 p-6 space-y-4">
            {/* Room header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Snowflake className={cn(
                  "h-6 w-6",
                  activeRoom.type === 'negatif' ? 'text-blue-500' : 'text-cyan-500'
                )} />
                <div>
                  <h3 className="font-semibold text-lg">{activeRoom.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Max: {activeRoom.temp_max}°C
                  </p>
                </div>
              </div>
              <Badge 
                variant="outline"
                className="text-primary border-primary"
              >
                {activeRoom.type === 'negatif' ? 'Négatif' : 'Positif'}
              </Badge>
            </div>

            {/* Conformity status */}
            {activeConformity && (
              <div className={cn(
                "flex items-center justify-center gap-2 py-3 px-4 rounded-full",
                activeConformity.status === 'conforme' && "bg-success/10 text-success",
                activeConformity.status === 'acceptable' && "bg-warning/10 text-warning",
                activeConformity.status === 'nonconforme' && "bg-destructive/10 text-destructive"
              )}>
                {activeConformity.status === 'conforme' && <CheckCircle2 className="h-5 w-5" />}
                {activeConformity.status === 'acceptable' && <AlertTriangle className="h-5 w-5" />}
                {activeConformity.status === 'nonconforme' && <XCircle className="h-5 w-5" />}
                <span className="font-medium">
                  {activeConformity.status === 'conforme' && 'Conforme'}
                  {activeConformity.status === 'acceptable' && 'Acceptable'}
                  {activeConformity.status === 'nonconforme' && 'Non conforme'}
                </span>
              </div>
            )}

            {/* Numeric keypad */}
            <NumericKeypad
              value={activeInput.temperature}
              onChange={(value) => handleTemperatureChange(activeRoomId, value)}
              onConfirm={() => setActiveRoomId(null)}
              allowNegative={activeRoom.type === 'negatif'}
              allowDecimal={true}
            />

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  // Clear this room's temperature if cancelled
                  setRoomInputs(prev => ({
                    ...prev,
                    [activeRoomId]: { temperature: '', notes: '' }
                  }));
                  setActiveRoomId(null);
                }}
              >
                Annuler
              </Button>
              <Button 
                type="button"
                className="flex-1"
                disabled={!activeInput.temperature}
                onClick={() => setActiveRoomId(null)}
              >
                Confirmer
              </Button>
            </div>
          </div>
        ) : (
          // Room list mode
          <>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
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
                    const hasTemp = input.temperature && input.temperature.trim() !== '';
                    
                    return (
                      <Card 
                        key={room.id} 
                        className="p-5 border-2 border-dashed rounded-2xl"
                      >
                        {/* Room header with icon and type badge */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Snowflake className={cn(
                              "h-5 w-5",
                              room.type === 'negatif' ? 'text-blue-500' : 'text-cyan-500'
                            )} />
                            <span className="font-semibold text-lg">{room.name}</span>
                          </div>
                          <Badge 
                            variant="outline"
                            className="text-primary border-primary rounded-full px-3"
                          >
                            {room.type === 'negatif' ? 'Négatif' : 'Positif'}
                          </Badge>
                        </div>

                        {/* Temperature display and input */}
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <Thermometer className="h-8 w-8 text-muted-foreground" />
                            <div>
                              <div className="flex items-center text-4xl font-light tracking-tight">
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="--"
                                  value={input.temperature}
                                  onChange={(e) => handleTemperatureChange(room.id, e.target.value)}
                                  className={cn(
                                    "w-24 h-14 text-4xl font-light text-center border-2 rounded-xl p-0",
                                    !hasTemp && "border-dashed",
                                    hasTemp && conformityInfo?.status === 'conforme' && "text-success border-success",
                                    hasTemp && conformityInfo?.status === 'acceptable' && "text-warning border-warning",
                                    hasTemp && conformityInfo?.status === 'nonconforme' && "text-destructive border-destructive"
                                  )}
                                />
                                <span className="ml-1 text-muted-foreground">°C</span>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                Max: {room.temp_max}°C
                              </div>
                            </div>
                          </div>

                          {/* Status badge */}
                          {hasTemp && conformityInfo ? (
                            <Badge 
                              variant="outline"
                              className={cn(
                                "flex items-center gap-1.5 rounded-full px-3 py-1",
                                conformityInfo.status === 'conforme' && "border-success text-success bg-success/10",
                                conformityInfo.status === 'acceptable' && "border-warning text-warning bg-warning/10",
                                conformityInfo.status === 'nonconforme' && "border-destructive text-destructive bg-destructive/10"
                              )}
                            >
                              {conformityInfo.status === 'conforme' && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {conformityInfo.status === 'acceptable' && <AlertTriangle className="h-3.5 w-3.5" />}
                              {conformityInfo.status === 'nonconforme' && <XCircle className="h-3.5 w-3.5" />}
                              {conformityInfo.status === 'conforme' && 'Conforme'}
                              {conformityInfo.status === 'acceptable' && 'Acceptable'}
                              {conformityInfo.status === 'nonconforme' && 'Non conforme'}
                            </Badge>
                          ) : (
                            <Badge 
                              variant="outline"
                              className="flex items-center gap-1.5 rounded-full px-3 py-1 border-warning text-warning bg-warning/10"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Aucun relevé
                            </Badge>
                          )}
                        </div>

                        {/* History button */}
                        <Button 
                          type="button"
                          variant="outline"
                          className="w-full h-11"
                          onClick={() => handleHistoryClick(room)}
                        >
                          <History className="h-4 w-4 mr-2" />
                          Historique
                        </Button>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Footer with validation button */}
            <DialogFooter className="px-6 py-4 border-t flex-col gap-3">
              <Button 
                type="button" 
                className="w-full h-12 text-base"
                disabled={filledRoomsCount === 0 || isSubmitting}
                onClick={handleSubmitAll}
              >
                {isSubmitting ? (
                  'Enregistrement...'
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Valider {filledRoomsCount > 0 && `(${filledRoomsCount} relevé${filledRoomsCount > 1 ? 's' : ''})`}
                  </>
                )}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose} className="w-full">
                Fermer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
