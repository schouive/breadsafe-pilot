import { useState, useEffect } from 'react';
import { ControlPoint, ControlStatus } from '@/types/haccp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Keyboard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useColdRooms, useRecordTemperature, ColdRoom } from '@/hooks/useColdRooms';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NumericKeypad } from './NumericKeypad';
import { Switch } from '@/components/ui/switch';

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
  const [quickMode, setQuickMode] = useState(false);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);

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

  // Reset current room index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentRoomIndex(0);
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

  const handleQuickModeConfirm = () => {
    if (coldRooms && currentRoomIndex < coldRooms.length - 1) {
      setCurrentRoomIndex(prev => prev + 1);
    }
  };

  const goToPreviousRoom = () => {
    if (currentRoomIndex > 0) {
      setCurrentRoomIndex(prev => prev - 1);
    }
  };

  const goToNextRoom = () => {
    if (coldRooms && currentRoomIndex < coldRooms.length - 1) {
      setCurrentRoomIndex(prev => prev + 1);
    }
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
    setCurrentRoomIndex(0);
  };

  if (!controlPoint) return null;

  const filledCount = getFilledRooms().length;
  const totalCount = coldRooms?.length || 0;
  const currentRoom = coldRooms?.[currentRoomIndex];
  const currentInput = currentRoom ? roomInputs[currentRoom.id] : null;
  const currentConformity = currentRoom ? getConformityInfo(currentRoom.id) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "flex flex-col",
        quickMode ? "max-w-md max-h-[95vh]" : "max-w-2xl max-h-[90vh]"
      )}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-primary" />
              {controlPoint.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-muted-foreground" />
              <Switch 
                checked={quickMode} 
                onCheckedChange={setQuickMode}
                aria-label="Mode saisie rapide"
              />
              <span className="text-sm text-muted-foreground">Rapide</span>
            </div>
          </div>
          <DialogDescription>
            {quickMode 
              ? "Mode saisie rapide avec clavier numérique" 
              : "Saisissez les températures pour chaque chambre froide"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {quickMode && currentRoom && currentInput ? (
            // Quick mode with numeric keypad
            <div className="flex flex-col flex-1 space-y-4">
              {/* Room navigation */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousRoom}
                  disabled={currentRoomIndex === 0}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div className="text-center flex-1">
                  <div className="flex items-center justify-center gap-2">
                    <Snowflake className={cn(
                      "h-5 w-5",
                      currentRoom.type === 'negatif' ? 'text-blue-500' : 'text-cyan-500'
                    )} />
                    <span className="font-semibold">{currentRoom.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentRoom.temp_min}°C à {currentRoom.temp_max}°C
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentRoomIndex + 1} / {totalCount}
                  </p>
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={goToNextRoom}
                  disabled={!coldRooms || currentRoomIndex >= coldRooms.length - 1}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Conformity status */}
              {currentConformity && (
                <div className={cn(
                  "flex items-center justify-center gap-2 py-2 px-4 rounded-lg",
                  currentConformity.status === 'conforme' && "bg-success/10 text-success",
                  currentConformity.status === 'acceptable' && "bg-warning/10 text-warning",
                  currentConformity.status === 'nonconforme' && "bg-destructive/10 text-destructive"
                )}>
                  {currentConformity.status === 'conforme' && <CheckCircle2 className="h-5 w-5" />}
                  {currentConformity.status === 'acceptable' && <AlertTriangle className="h-5 w-5" />}
                  {currentConformity.status === 'nonconforme' && <XCircle className="h-5 w-5" />}
                  <span className="font-medium">
                    {currentConformity.status === 'conforme' && 'Conforme'}
                    {currentConformity.status === 'acceptable' && 'Acceptable'}
                    {currentConformity.status === 'nonconforme' && 'Non conforme'}
                  </span>
                </div>
              )}

              {/* Numeric keypad */}
              <NumericKeypad
                value={currentInput.temperature}
                onChange={(value) => handleTemperatureChange(currentRoom.id, value)}
                onConfirm={handleQuickModeConfirm}
                allowNegative={true}
                allowDecimal={true}
              />

              {/* Quick status overview */}
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {coldRooms?.map((room, index) => {
                  const conformity = getConformityInfo(room.id);
                  const isFilled = roomInputs[room.id]?.temperature?.trim() !== '';
                  const isCurrent = index === currentRoomIndex;
                  
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setCurrentRoomIndex(index)}
                      className={cn(
                        "w-8 h-8 rounded-full text-xs font-medium transition-all",
                        isCurrent && "ring-2 ring-primary ring-offset-2",
                        !isFilled && "bg-muted text-muted-foreground",
                        conformity?.status === 'conforme' && "bg-success text-success-foreground",
                        conformity?.status === 'acceptable' && "bg-warning text-warning-foreground",
                        conformity?.status === 'nonconforme' && "bg-destructive text-destructive-foreground"
                      )}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // Standard mode with all rooms
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
          )}

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
