import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { CheckCircle2, DoorOpen, AlertTriangle, Phone, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CorrectiveAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CORRECTIVE_ACTIONS: CorrectiveAction[] = [
  { id: 'door_reopened', label: 'Porte ouverte puis refermée', icon: DoorOpen },
  { id: 'equipment_broken', label: 'Enceinte HS', icon: AlertTriangle },
  { id: 'technician_called', label: "Appel d'un technicien", icon: Phone },
  { id: 'defrosting', label: 'Enceinte en cours de dégivrage', icon: Snowflake },
];

interface CorrectiveActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (actionId: string, actionLabel: string) => void;
  roomName: string;
  temperature: number;
}

export function CorrectiveActionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  roomName,
  temperature 
}: CorrectiveActionModalProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedAction) {
      const action = CORRECTIVE_ACTIONS.find(a => a.id === selectedAction);
      if (action) {
        onConfirm(action.id, action.label);
      }
    }
  };

  const handleClose = () => {
    setSelectedAction(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Action corrective
          </DialogTitle>
          <DialogDescription className="text-base">
            <span className="font-semibold">{roomName}</span> — Température non conforme : <span className="font-semibold text-destructive">{temperature}°C</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            Sélectionnez l'action corrective appliquée :
          </p>
          
          {CORRECTIVE_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isSelected = selectedAction === action.id;
            
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => setSelectedAction(action.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn(
                  "flex-1 font-medium",
                  isSelected && "text-primary"
                )}>
                  {action.label}
                </span>
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <DialogFooter className="flex-col gap-2">
          <Button 
            type="button" 
            className="w-full h-12"
            disabled={!selectedAction}
            onClick={handleConfirm}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Valider l'action
          </Button>
          <Button type="button" variant="ghost" onClick={handleClose} className="w-full">
            Annuler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
