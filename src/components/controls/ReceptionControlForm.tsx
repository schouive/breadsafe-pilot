import { useState } from 'react';
import { ControlPoint, ControlStatus } from '@/types/haccp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
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
  Package, 
  Calendar,
  AlertTriangle,
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PhotoCapture } from './PhotoCapture';
import { useAuth } from '@/hooks/useAuth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

interface ReceptionControlFormProps {
  controlPoint: ControlPoint | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReceptionFormData) => void;
}

export interface ReceptionFormData {
  status: ControlStatus;
  // Product info
  product: string;
  supplier: string;
  lotNumber: string;
  // CP1 - Temperature
  temperature?: number;
  temperatureConforme: boolean;
  // CP2 - Integrity
  integriteConforme: boolean;
  integriteNotes?: string;
  // CP3 - DLC
  dlcDate?: string;
  dlcConforme: boolean;
  dlcNotes?: string;
  // CP4 - Allergens
  allergenesConformes: boolean;
  allergenesNotes?: string;
  // Common
  notes?: string;
  photos: string[];
}

const statusOptions = [
  { value: 'conforme', label: 'Conforme', icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/10 border-success/30' },
  { value: 'acceptable', label: 'Acceptable', icon: AlertCircle, color: 'text-warning', bgColor: 'bg-warning/10 border-warning/30' },
  { value: 'nonconforme', label: 'Non-conforme', icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/30' },
];

export function ReceptionControlForm({ controlPoint, isOpen, onClose, onSubmit }: ReceptionControlFormProps) {
  const { user } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>('cp1');
  
  // Form state
  const [product, setProduct] = useState('');
  const [supplier, setSupplier] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  
  // CP1 - Temperature
  const [temperature, setTemperature] = useState('');
  const [temperatureConforme, setTemperatureConforme] = useState(true);
  
  // CP2 - Integrity
  const [integriteConforme, setIntegriteConforme] = useState(true);
  const [integriteNotes, setIntegriteNotes] = useState('');
  
  // CP3 - DLC
  const [dlcDate, setDlcDate] = useState('');
  const [dlcConforme, setDlcConforme] = useState(true);
  const [dlcNotes, setDlcNotes] = useState('');
  
  // CP4 - Allergens
  const [allergenesConformes, setAllergenesConformes] = useState(true);
  const [allergenesNotes, setAllergenesNotes] = useState('');
  
  // Common
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // Calculate overall status
  const calculateStatus = (): ControlStatus => {
    const allConforme = temperatureConforme && integriteConforme && dlcConforme && allergenesConformes;
    const anyNonConforme = !temperatureConforme || !integriteConforme || !dlcConforme || !allergenesConformes;
    
    if (allConforme) return 'conforme';
    if (anyNonConforme) return 'nonconforme';
    return 'acceptable';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product || !supplier) {
      toast.error('Veuillez renseigner le produit et le fournisseur');
      return;
    }

    const status = calculateStatus();

    onSubmit({
      status,
      product,
      supplier,
      lotNumber,
      temperature: temperature ? parseFloat(temperature) : undefined,
      temperatureConforme,
      integriteConforme,
      integriteNotes: integriteNotes || undefined,
      dlcDate: dlcDate || undefined,
      dlcConforme,
      dlcNotes: dlcNotes || undefined,
      allergenesConformes,
      allergenesNotes: allergenesNotes || undefined,
      notes: notes || undefined,
      photos,
    });

    // Reset form
    resetForm();
    toast.success('Contrôle réception enregistré');
    onClose();
  };

  const resetForm = () => {
    setProduct('');
    setSupplier('');
    setLotNumber('');
    setTemperature('');
    setTemperatureConforme(true);
    setIntegriteConforme(true);
    setIntegriteNotes('');
    setDlcDate('');
    setDlcConforme(true);
    setDlcNotes('');
    setAllergenesConformes(true);
    setAllergenesNotes('');
    setNotes('');
    setPhotos([]);
    setExpandedSection('cp1');
  };

  if (!controlPoint) return null;

  const subControls = controlPoint.subControls || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {controlPoint.name}
          </DialogTitle>
          <DialogDescription>
            {controlPoint.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product info section */}
          <div className="bg-accent/50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Informations Produit
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="product">Produit *</Label>
                <Input
                  id="product"
                  placeholder="Ex: Beurre AOP"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Fournisseur *</Label>
                <Input
                  id="supplier"
                  placeholder="Ex: Lactalis"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  required
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
          </div>

          <Separator />

          {/* CP1 - Temperature */}
          <Collapsible 
            open={expandedSection === 'cp1'} 
            onOpenChange={() => setExpandedSection(expandedSection === 'cp1' ? null : 'cp1')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <Thermometer className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">CP1 - Température</p>
                  <p className="text-xs text-muted-foreground">Contrôle température à réception</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {temperatureConforme ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {expandedSection === 'cp1' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Température mesurée (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 3.5"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="text-lg h-12"
                />
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border">
                <Checkbox 
                  id="temp-conforme"
                  checked={temperatureConforme}
                  onCheckedChange={(checked) => setTemperatureConforme(checked as boolean)}
                />
                <Label htmlFor="temp-conforme" className="flex-1 cursor-pointer">
                  Température conforme à l'étiquetage
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Acceptable: jusqu'à 3°C de plus en surface pour réfrigéré
              </p>
            </CollapsibleContent>
          </Collapsible>

          {/* CP2 - Integrity */}
          <Collapsible 
            open={expandedSection === 'cp2'} 
            onOpenChange={() => setExpandedSection(expandedSection === 'cp2' ? null : 'cp2')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">CP2 - Intégrité</p>
                  <p className="text-xs text-muted-foreground">Vérification emballages</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {integriteConforme ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {expandedSection === 'cp2' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="flex items-center space-x-3 p-3 rounded-lg border">
                <Checkbox 
                  id="integrite-conforme"
                  checked={integriteConforme}
                  onCheckedChange={(checked) => setIntegriteConforme(checked as boolean)}
                />
                <Label htmlFor="integrite-conforme" className="flex-1 cursor-pointer">
                  Emballage propre et non percé
                </Label>
              </div>
              {!integriteConforme && (
                <div className="space-y-2">
                  <Label htmlFor="integrite-notes">Observations</Label>
                  <Textarea
                    id="integrite-notes"
                    placeholder="Décrivez le problème..."
                    value={integriteNotes}
                    onChange={(e) => setIntegriteNotes(e.target.value)}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* CP3 - DLC */}
          <Collapsible 
            open={expandedSection === 'cp3'} 
            onOpenChange={() => setExpandedSection(expandedSection === 'cp3' ? null : 'cp3')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">CP3 - DLC</p>
                  <p className="text-xs text-muted-foreground">Dates limites de consommation</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {dlcConforme ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {expandedSection === 'cp3' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dlc-date">Date limite de consommation</Label>
                <Input
                  id="dlc-date"
                  type="date"
                  value={dlcDate}
                  onChange={(e) => setDlcDate(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border">
                <Checkbox 
                  id="dlc-conforme"
                  checked={dlcConforme}
                  onCheckedChange={(checked) => setDlcConforme(checked as boolean)}
                />
                <Label htmlFor="dlc-conforme" className="flex-1 cursor-pointer">
                  DLC suffisante (≥2 sem œuf/beurre, ≥1 mois margarine/levure)
                </Label>
              </div>
              {!dlcConforme && (
                <div className="space-y-2">
                  <Label htmlFor="dlc-notes">Observations</Label>
                  <Textarea
                    id="dlc-notes"
                    placeholder="Produit consommable avant péremption ?"
                    value={dlcNotes}
                    onChange={(e) => setDlcNotes(e.target.value)}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* CP4 - Allergens */}
          <Collapsible 
            open={expandedSection === 'cp4'} 
            onOpenChange={() => setExpandedSection(expandedSection === 'cp4' ? null : 'cp4')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">CP4 - Allergènes</p>
                  <p className="text-xs text-muted-foreground">Vérification composition</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {allergenesConformes ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {expandedSection === 'cp4' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="flex items-center space-x-3 p-3 rounded-lg border">
                <Checkbox 
                  id="allergenes-conforme"
                  checked={allergenesConformes}
                  onCheckedChange={(checked) => setAllergenesConformes(checked as boolean)}
                />
                <Label htmlFor="allergenes-conforme" className="flex-1 cursor-pointer">
                  Composition conforme à la référence
                </Label>
              </div>
              {!allergenesConformes && (
                <div className="space-y-2">
                  <Label htmlFor="allergenes-notes">Observations</Label>
                  <Textarea
                    id="allergenes-notes"
                    placeholder="Détaillez le changement de composition..."
                    value={allergenesNotes}
                    onChange={(e) => setAllergenesNotes(e.target.value)}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observations générales (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Remarques supplémentaires..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Photo capture */}
          {user && (
            <PhotoCapture
              photos={photos}
              onPhotosChange={setPhotos}
              userId={user.id}
            />
          )}

          {/* Status summary */}
          <div className={cn(
            "p-4 rounded-lg border-2",
            calculateStatus() === 'conforme' && "bg-success/10 border-success/30",
            calculateStatus() === 'acceptable' && "bg-warning/10 border-warning/30",
            calculateStatus() === 'nonconforme' && "bg-destructive/10 border-destructive/30"
          )}>
            <div className="flex items-center gap-3">
              {calculateStatus() === 'conforme' && <CheckCircle2 className="h-6 w-6 text-success" />}
              {calculateStatus() === 'acceptable' && <AlertCircle className="h-6 w-6 text-warning" />}
              {calculateStatus() === 'nonconforme' && <XCircle className="h-6 w-6 text-destructive" />}
              <div>
                <p className="font-medium">
                  Statut: {calculateStatus() === 'conforme' ? 'Conforme' : 
                           calculateStatus() === 'acceptable' ? 'Acceptable' : 'Non-conforme'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {calculateStatus() === 'conforme' && 'Tous les contrôles sont conformes'}
                  {calculateStatus() === 'acceptable' && 'Certains contrôles nécessitent une attention'}
                  {calculateStatus() === 'nonconforme' && 'Action corrective requise'}
                </p>
              </div>
            </div>
          </div>

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
