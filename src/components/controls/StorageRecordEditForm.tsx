import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TemperatureInput } from '@/components/ui/TemperatureInput';
import { StorageTemperatureRecordWithRoom, useColdRooms, useUpdateStorageTemperatureRecord } from '@/hooks/useColdRooms';
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StorageRecordEditFormProps {
  record: StorageTemperatureRecordWithRoom | null;
  isOpen: boolean;
  onClose: () => void;
}

type StorageStatus = 'conforme' | 'acceptable' | 'nonconforme';

const statusOptions = [
  { value: 'conforme', label: 'Conforme', icon: CheckCircle, color: 'text-success' },
  { value: 'acceptable', label: 'Acceptable', icon: AlertTriangle, color: 'text-warning' },
  { value: 'nonconforme', label: 'Non-conforme', icon: XCircle, color: 'text-destructive' },
];

export function StorageRecordEditForm({ record, isOpen, onClose }: StorageRecordEditFormProps) {
  const [status, setStatus] = useState<StorageStatus>('conforme');
  const [temperatureStr, setTemperatureStr] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [coldRoomId, setColdRoomId] = useState('');

  const { data: coldRooms } = useColdRooms();
  const updateRecord = useUpdateStorageTemperatureRecord();

  // Populate form with record data
  useEffect(() => {
    if (record) {
      setStatus(record.status);
      setTemperatureStr(String(record.temperature));
      setNotes(record.notes || '');
      setColdRoomId(record.cold_room_id);
    }
  }, [record]);

  // Auto-calculate status based on temperature and cold room limits
  useEffect(() => {
    if (!temperatureStr || !coldRoomId || !coldRooms) return;
    
    const temp = parseFloat(temperatureStr);
    if (isNaN(temp)) return;
    
    const coldRoom = coldRooms.find(cr => cr.id === coldRoomId);
    if (!coldRoom) return;
    
    const isWithinLimits = temp >= coldRoom.temp_min && temp <= coldRoom.temp_max;
    const acceptableMin = coldRoom.temp_min - 3;
    const acceptableMax = coldRoom.temp_max + 3;
    const isAcceptable = temp >= acceptableMin && temp <= acceptableMax;
    
    if (isWithinLimits) {
      setStatus('conforme');
    } else if (isAcceptable) {
      setStatus('acceptable');
    } else {
      setStatus('nonconforme');
    }
  }, [temperatureStr, coldRoomId, coldRooms]);

  const handleSubmit = async () => {
    if (!record) return;

    const temp = parseFloat(temperatureStr);
    const coldRoom = coldRooms?.find(cr => cr.id === coldRoomId);
    const isConforme = coldRoom ? temp >= coldRoom.temp_min && temp <= coldRoom.temp_max : status === 'conforme';

    await updateRecord.mutateAsync({
      id: record.id,
      data: {
        temperature: temp,
        status,
        is_conforme: isConforme,
        notes: notes || null,
        cold_room_id: coldRoomId,
      },
    });
    onClose();
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le relevé de température</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cold Room Selection */}
          <div className="space-y-2">
            <Label>Chambre froide</Label>
            <Select value={coldRoomId} onValueChange={setColdRoomId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une chambre froide" />
              </SelectTrigger>
              <SelectContent>
                {coldRooms?.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name} ({room.temp_min}°C à {room.temp_max}°C)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <Label>Température (°C)</Label>
            <TemperatureInput
              value={temperatureStr}
              onChange={setTemperatureStr}
              showUnit
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Statut (calculé automatiquement)</Label>
            <RadioGroup
              value={status}
              onValueChange={(v) => setStatus(v as StorageStatus)}
              className="flex gap-2"
            >
              {statusOptions.map((option) => (
                <div key={option.value} className="flex-1">
                  <RadioGroupItem
                    value={option.value}
                    id={`storage-edit-${option.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`storage-edit-${option.value}`}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer",
                      status === option.value && "border-primary"
                    )}
                  >
                    <option.icon className={cn("h-5 w-5 mb-1", option.color)} />
                    <span className="text-xs">{option.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes supplémentaires..."
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={updateRecord.isPending || !temperatureStr}>
            {updateRecord.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
