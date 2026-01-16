import { useState, useEffect } from 'react';
import { ControlPoint, ControlStatus } from '@/types/haccp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Info,
  CalendarIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, startOfDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TemperatureInput } from '@/components/ui/TemperatureInput';
import { useAllRawMaterials } from '@/hooks/useSuppliers';

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
    dlcDate?: string;
  }) => void;
}

const statusOptions = [
  { value: 'conforme', label: 'Conforme', icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/10 border-success/30' },
  { value: 'acceptable', label: 'Acceptable', icon: AlertCircle, color: 'text-warning', bgColor: 'bg-warning/10 border-warning/30' },
  { value: 'nonconforme', label: 'Non-conforme', icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/30' },
];

// Calculate CP8 status based on DLC date
const calculateCP8Status = (dlcDate: Date | undefined): ControlStatus => {
  if (!dlcDate) return 'conforme';
  
  const today = startOfDay(new Date());
  const dlc = startOfDay(dlcDate);
  const todayPlus2 = addDays(today, 2);
  
  // DLC > today + 2 days → conforme
  if (dlc > todayPlus2) {
    return 'conforme';
  }
  // DLC between today and today + 2 days (inclusive) → acceptable
  if (dlc >= today && dlc <= todayPlus2) {
    return 'acceptable';
  }
  // DLC < today → nonconforme
  return 'nonconforme';
};

export function ControlForm({ controlPoint, isOpen, onClose, onSubmit }: ControlFormProps) {
  const [status, setStatus] = useState<ControlStatus>('conforme');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [product, setProduct] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [dlcDate, setDlcDate] = useState<Date | undefined>(undefined);
  const [dlcPopoverOpen, setDlcPopoverOpen] = useState(false);

  const { data: allMaterials } = useAllRawMaterials();
  
  // Filter materials that require DLC check for CP8
  const dlcMaterials = allMaterials?.filter(m => m.requires_dlc_check && m.is_active) || [];

  const isTemperatureControl = controlPoint?.code.includes('TEMPERATURE') || 
    controlPoint?.code.includes('STOCKAGE');
  
  const isCP8Control = controlPoint?.code === 'CP8_DLC_PERIMEE';

  // Auto-calculate status when DLC date changes for CP8
  useEffect(() => {
    if (isCP8Control && dlcDate) {
      const calculatedStatus = calculateCP8Status(dlcDate);
      setStatus(calculatedStatus);
    }
  }, [dlcDate, isCP8Control]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isTemperatureControl && !temperature) {
      toast.error('Veuillez saisir la température');
      return;
    }

    // For CP8, get the product name from selected material
    const productName = isCP8Control 
      ? dlcMaterials.find(m => m.id === selectedMaterialId)?.name 
      : product;

    onSubmit({
      status,
      value: isTemperatureControl ? parseFloat(temperature) : undefined,
      notes: notes || undefined,
      lotNumber: lotNumber || undefined,
      supplier: isCP8Control ? undefined : (supplier || undefined),
      product: productName || undefined,
      dlcDate: isCP8Control && dlcDate ? format(dlcDate, 'yyyy-MM-dd') : undefined,
    });

    // Reset form
    setStatus('conforme');
    setTemperature('');
    setNotes('');
    setLotNumber('');
    setSupplier('');
    setProduct('');
    setSelectedMaterialId('');
    setDlcDate(undefined);
    
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
              <Label className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Température mesurée (°C)
              </Label>
              <TemperatureInput
                value={temperature}
                onChange={setTemperature}
                placeholder="Ex: -18.5"
                inputClassName="text-lg h-12"
              />
            </div>
          )}

          {/* Product info - different for CP8 */}
          {isCP8Control ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="material">Matière première</Label>
                <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                  <SelectTrigger id="material">
                    <SelectValue placeholder="Sélectionnez une matière première" />
                  </SelectTrigger>
                  <SelectContent>
                    {dlcMaterials.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Aucune matière première configurée pour le contrôle DLC
                      </SelectItem>
                    ) : (
                      dlcMaterials.map(material => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name} {material.suppliers?.name && `(${material.suppliers.name})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date de péremption (DLC)</Label>
                <Popover open={dlcPopoverOpen} onOpenChange={setDlcPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dlcDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dlcDate ? format(dlcDate, 'dd MMMM yyyy', { locale: fr }) : "Sélectionnez une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dlcDate}
                      onSelect={(date) => {
                        setDlcDate(date);
                        setDlcPopoverOpen(false);
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
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
          )}

          <div className="space-y-2">
            <Label htmlFor="lot">N° de lot</Label>
            <Input
              id="lot"
              placeholder="Ex: LOT2025-0704"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
            />
          </div>

          {/* Status selection - hidden for CP8 since it's auto-calculated */}
          {!isCP8Control && (
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
          )}

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
