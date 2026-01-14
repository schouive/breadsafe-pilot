import { useState, useEffect } from 'react';
import { ControlPoint, ControlStatus } from '@/types/haccp';
import { Button } from '@/components/ui/button';
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
import { TemperatureInput } from '@/components/ui/TemperatureInput';
import { CorrectiveActionModal } from './CorrectiveActionModal';

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
  correctiveAction?: string;
}

interface RoomTemperatureInput {
  temperature: string;
  notes: string;
  correctiveAction?: string;
}

export function StorageControlForm({ controlPoint, isOpen, onClose, onSubmit }: StorageControlFormProps) {
  const { user } = useAuth();
  const { data: coldRooms, isLoading: loadingRooms } = useColdRooms();
  const recordTemperature = useRecordTemperature();
  
  const [roomInputs, setRoomInputs] = useState<Record<string, RoomTemperatureInput>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for corrective action modal
  const [correctiveActionModal, setCorrectiveActionModal] = useState<{
    isOpen: boolean;
    roomId: string;
    roomName: string;
    temperature: number;
  } | null>(null);

  // Initialize room inputs when cold rooms are loaded
  useEffect(() => {
    if (coldRooms) {
      const initialInputs: Record<string, RoomTemperatureInput> = {};
      coldRooms.forEach(room => {
        initialInputs[room.id] = { temperature: '', notes: '', correctiveAction: undefined };
      });
      setRoomInputs(initialInputs);
    }
  }, [coldRooms]);

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
    const room = coldRooms?.find(r => r.id === roomId);
    
    setRoomInputs(prev => ({
      ...prev,
      [roomId]: { ...prev[roomId], temperature: value, correctiveAction: undefined }
    }));
    
    // Check if we need to show corrective action modal
    if (room && value && value.trim() !== '') {
      const temp = parseFloat(value);
      if (!isNaN(temp)) {
        const { status } = checkConformity(temp, room);
        if (status === 'nonconforme') {
          // Show corrective action modal
          setCorrectiveActionModal({
            isOpen: true,
            roomId: room.id,
            roomName: room.name,
            temperature: temp,
          });
        }
      }
    }
  };
  
  const handleCorrectiveActionConfirm = (actionId: string, actionLabel: string) => {
    if (correctiveActionModal) {
      setRoomInputs(prev => ({
        ...prev,
        [correctiveActionModal.roomId]: { 
          ...prev[correctiveActionModal.roomId], 
          correctiveAction: actionLabel 
        }
      }));
      setCorrectiveActionModal(null);
    }
  };
  
  const handleCorrectiveActionClose = () => {
    setCorrectiveActionModal(null);
  };

  const resetForm = () => {
    if (coldRooms) {
      const initialInputs: Record<string, RoomTemperatureInput> = {};
      coldRooms.forEach(room => {
        initialInputs[room.id] = { temperature: '', notes: '', correctiveAction: undefined };
      });
      setRoomInputs(initialInputs);
    }
    setCorrectiveActionModal(null);
  };

  if (!controlPoint) return null;

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

        // Include corrective action in notes if present
        const notesWithAction = input.correctiveAction 
          ? `${input.notes ? input.notes + ' | ' : ''}Action corrective: ${input.correctiveAction}`
          : (input.notes || undefined);

        await recordTemperature.mutateAsync({
          cold_room_id: room.id,
          operator_id: user.id,
          temperature: tempValue,
          is_conforme: isConforme,
          notes: notesWithAction,
        });

        onSubmit({
          status,
          coldRoomId: room.id,
          coldRoomName: room.name,
          temperature: tempValue,
          isConforme,
          notes: notesWithAction,
          correctiveAction: input.correctiveAction,
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
    <>
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
                    className="p-5 border-2 rounded-2xl"
                  >
                    {/* Room header with icon */}
                    <div className="flex items-center gap-2 mb-4">
                      <Snowflake className={cn(
                        "h-5 w-5",
                        room.type === 'negatif' ? 'text-cyan-500' : 'text-blue-600'
                      )} />
                      <span className="font-semibold text-lg">{room.name}</span>
                    </div>

                    {/* Temperature display and input */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center text-4xl font-light tracking-tight">
                          <TemperatureInput
                            value={input.temperature}
                            onChange={(val) => handleTemperatureChange(room.id, val)}
                            placeholder="--"
                            inputClassName={cn(
                              "w-28 h-14 text-4xl font-light border-2 rounded-xl",
                              hasTemp && conformityInfo?.status === 'conforme' && "text-success border-success",
                              hasTemp && conformityInfo?.status === 'acceptable' && "text-warning border-warning",
                              hasTemp && conformityInfo?.status === 'nonconforme' && "text-destructive border-destructive"
                            )}
                            showUnit
                          />
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Max: {room.temp_max}°C
                        </div>
                      </div>

                      {/* Status badge - only show when temperature is entered */}
                      {hasTemp && conformityInfo && (
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
                      )}
                    </div>
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
      </DialogContent>
    </Dialog>
    
    {/* Corrective Action Modal */}
    {correctiveActionModal && (
      <CorrectiveActionModal
        isOpen={correctiveActionModal.isOpen}
        onClose={handleCorrectiveActionClose}
        onConfirm={handleCorrectiveActionConfirm}
        roomName={correctiveActionModal.roomName}
        temperature={correctiveActionModal.temperature}
      />
    )}
    </>
  );
}
