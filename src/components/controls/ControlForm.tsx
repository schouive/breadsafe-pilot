import { useState } from 'react';
import { ControlPoint, ControlStatus } from '@/types/haccp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ControlFormProps {
  controlPoint: ControlPoint | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    status: ControlStatus;
    value?: number;
    notes?: string;
    lotNumber?: string;
    supplier?: string;
    product?: string;
  }) => void;
}

const statusOptions = [
  { value: 'conforme', label: 'Conforme', icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/10 border-success/30' },
  { value: 'acceptable', label: 'Acceptable', icon: AlertCircle, color: 'text-warning', bgColor: 'bg-warning/10 border-warning/30' },
  { value: 'nonconforme', label: 'Non-conforme', icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/30' },
];

export function ControlForm({ controlPoint, isOpen, onClose, onSubmit }: ControlFormProps) {
  const [status, setStatus] = useState<ControlStatus>('conforme');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [product, setProduct] = useState('');

  const isTemperatureControl = controlPoint?.code.includes('TEMPERATURE') || 
    controlPoint?.code.includes('STOCKAGE');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isTemperatureControl && !temperature) {
      toast.error('Veuillez saisir la température');
      return;
    }

    onSubmit({
      status,
      value: isTemperatureControl ? parseFloat(temperature) : undefined,
      notes: notes || undefined,
      lotNumber: lotNumber || undefined,
      supplier: supplier || undefined,
      product: product || undefined,
    });

    // Reset form
    setStatus('conforme');
    setTemperature('');
    setNotes('');
    setLotNumber('');
    setSupplier('');
    setProduct('');
    
    toast.success('Contrôle enregistré avec succès');
    onClose();
  };

  if (!controlPoint) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{controlPoint.name}</DialogTitle>
          <DialogDescription>
            {controlPoint.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Criteria reminder */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Critères de conformité:</p>
                <p className="text-muted-foreground">{controlPoint.conformeCriteria}</p>
              </div>
            </div>
            {controlPoint.acceptableCriteria && (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Acceptable si:</p>
                  <p className="text-muted-foreground">{controlPoint.acceptableCriteria}</p>
                </div>
              </div>
            )}
          </div>

          {/* Temperature input */}
          {isTemperatureControl && (
            <div className="space-y-2">
              <Label htmlFor="temperature" className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Température mesurée (°C)
              </Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                placeholder="Ex: -18.5"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="text-lg h-12"
              />
            </div>
          )}

          {/* Product info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product">Produit</Label>
              <Input
                id="product"
                placeholder="Ex: Beurre AOP"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Fournisseur</Label>
              <Input
                id="supplier"
                placeholder="Ex: Lactalis"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lot">N° de lot</Label>
            <Input
              id="lot"
              placeholder="Ex: LOT2025-0704"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
            />
          </div>

          {/* Status selection */}
          <div className="space-y-3">
            <Label>Résultat du contrôle</Label>
            <RadioGroup value={status} onValueChange={(v) => setStatus(v as ControlStatus)}>
              <div className="grid gap-3">
                {statusOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = status === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all touch-target",
                        isSelected ? option.bgColor : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <RadioGroupItem value={option.value} className="sr-only" />
                      <Icon className={cn("h-6 w-6", option.color)} />
                      <span className={cn("font-medium", isSelected && option.color)}>
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observations (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Ajoutez des remarques si nécessaire..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Photo button */}
          <Button type="button" variant="outline" className="w-full touch-target">
            <Camera className="mr-2 h-5 w-5" />
            Ajouter une photo
          </Button>

          <DialogFooter className="gap-3 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="touch-target">
              Annuler
            </Button>
            <Button type="submit" className="touch-target">
              Enregistrer le contrôle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
