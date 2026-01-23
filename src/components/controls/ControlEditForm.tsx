import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TemperatureInput } from '@/components/ui/TemperatureInput';
import { ControlRecordFromDB, useUpdateControlRecord } from '@/hooks/useControlRecords';
import { ControlStatus, CONTROL_POINTS } from '@/types/haccp';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ControlEditFormProps {
  record: ControlRecordFromDB | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusOptions = [
  { value: 'conforme', label: 'Conforme', icon: CheckCircle, color: 'text-success' },
  { value: 'acceptable', label: 'Acceptable', icon: AlertTriangle, color: 'text-warning' },
  { value: 'nonconforme', label: 'Non-conforme', icon: XCircle, color: 'text-destructive' },
];

// Calculate CP8 status based on DLC date
const calculateCP8Status = (dlcDateStr: string | null): ControlStatus => {
  if (!dlcDateStr) return 'pending';
  
  const dlcDate = new Date(dlcDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((dlcDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'nonconforme';
  if (diffDays <= 2) return 'acceptable';
  return 'conforme';
};

export function ControlEditForm({ record, isOpen, onClose }: ControlEditFormProps) {
  const [status, setStatus] = useState<ControlStatus>('conforme');
  const [temperatureStr, setTemperatureStr] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [product, setProduct] = useState('');
  const [dlcDate, setDlcDate] = useState<Date | undefined>(undefined);
  const [temperatureConforme, setTemperatureConforme] = useState<boolean | null>(null);
  const [integriteConforme, setIntegriteConforme] = useState<boolean | null>(null);
  const [integriteNotes, setIntegriteNotes] = useState('');
  const [dlcConforme, setDlcConforme] = useState<boolean | null>(null);
  const [dlcNotes, setDlcNotes] = useState('');
  const [allergenesConformes, setAllergenesConformes] = useState<boolean | null>(null);
  const [allergenesNotes, setAllergenesNotes] = useState('');

  const updateRecord = useUpdateControlRecord();

  // Determine control type
  const isReceptionControl = record?.control_point_code === 'CP_RECEPTION';
  const isCP8Control = record?.control_point_code === 'CP8_DLC_PERIMEE';
  const isTemperatureControl = isReceptionControl || record?.control_point_code === 'CP5_CORPS_ETRANGER';

  // Populate form with record data
  useEffect(() => {
    if (record) {
      setStatus(record.status);
      setTemperatureStr(record.temperature !== null ? String(record.temperature) : '');
      setNotes(record.notes || '');
      setLotNumber(record.lot_number || '');
      setSupplier(record.supplier || '');
      setProduct(record.product || '');
      setDlcDate(record.dlc_date ? new Date(record.dlc_date) : undefined);
      setTemperatureConforme(record.temperature_conforme);
      setIntegriteConforme(record.integrite_conforme);
      setIntegriteNotes(record.integrite_notes || '');
      setDlcConforme(record.dlc_conforme);
      setDlcNotes(record.dlc_notes || '');
      setAllergenesConformes(record.allergenes_conformes);
      setAllergenesNotes(record.allergenes_notes || '');
    }
  }, [record]);

  // Auto-calculate CP8 status when DLC date changes
  useEffect(() => {
    if (isCP8Control && dlcDate) {
      const newStatus = calculateCP8Status(dlcDate.toISOString().split('T')[0]);
      setStatus(newStatus);
    }
  }, [dlcDate, isCP8Control]);

  const handleSubmit = async () => {
    if (!record) return;

    const tempValue = temperatureStr !== '' ? parseFloat(temperatureStr) : null;

    await updateRecord.mutateAsync({
      recordId: record.id,
      data: {
        status,
        temperature: tempValue,
        notes: notes || null,
        lot_number: lotNumber || null,
        supplier: supplier || null,
        product: product || null,
        dlc_date: dlcDate ? dlcDate.toISOString().split('T')[0] : null,
        temperature_conforme: temperatureConforme,
        integrite_conforme: integriteConforme,
        integrite_notes: integriteNotes || null,
        dlc_conforme: dlcConforme,
        dlc_notes: dlcNotes || null,
        allergenes_conformes: allergenesConformes,
        allergenes_notes: allergenesNotes || null,
      },
    });
    onClose();
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le contrôle</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          {!isCP8Control && (
            <div className="space-y-2">
              <Label>Statut</Label>
              <RadioGroup
                value={status}
                onValueChange={(v) => setStatus(v as ControlStatus)}
                className="flex gap-2"
              >
                {statusOptions.map((option) => (
                  <div key={option.value} className="flex-1">
                    <RadioGroupItem
                      value={option.value}
                      id={`edit-${option.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`edit-${option.value}`}
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
          )}

          {/* Temperature */}
          {(isTemperatureControl || record.temperature !== null) && (
            <div className="space-y-2">
              <Label>Température (°C)</Label>
              <TemperatureInput
                value={temperatureStr}
                onChange={setTemperatureStr}
                showUnit
              />
            </div>
          )}

          {/* Product */}
          <div className="space-y-2">
            <Label>Produit(s)</Label>
            <Input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="Nom du produit"
            />
          </div>

          {/* Supplier */}
          {(isReceptionControl || record.supplier) && (
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Nom du fournisseur"
              />
            </div>
          )}

          {/* Lot Number */}
          <div className="space-y-2">
            <Label>Numéro de lot</Label>
            <Input
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="Numéro de lot"
            />
          </div>

          {/* DLC Date for CP8 or reception */}
          {(isCP8Control || isReceptionControl || record.dlc_date) && (
            <div className="space-y-2">
              <Label>Date limite de consommation (DLC)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dlcDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dlcDate ? format(dlcDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dlcDate}
                    onSelect={setDlcDate}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
              {isCP8Control && dlcDate && (
                <p className="text-xs text-muted-foreground">
                  Statut calculé automatiquement : {
                    status === 'conforme' ? '✅ Conforme (>2 jours)' :
                    status === 'acceptable' ? '⚠️ Acceptable (≤2 jours)' :
                    '❌ Non-conforme (périmé)'
                  }
                </p>
              )}
            </div>
          )}

          {/* Reception control fields */}
          {isReceptionControl && (
            <>
              {/* Temperature conforme */}
              <div className="space-y-2">
                <Label>Température conforme ?</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={temperatureConforme === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTemperatureConforme(true)}
                  >
                    Oui
                  </Button>
                  <Button
                    type="button"
                    variant={temperatureConforme === false ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setTemperatureConforme(false)}
                  >
                    Non
                  </Button>
                </div>
              </div>

              {/* Intégrité */}
              <div className="space-y-2">
                <Label>Intégrité emballage conforme ?</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={integriteConforme === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIntegriteConforme(true)}
                  >
                    Oui
                  </Button>
                  <Button
                    type="button"
                    variant={integriteConforme === false ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setIntegriteConforme(false)}
                  >
                    Non
                  </Button>
                </div>
                {integriteConforme === false && (
                  <Textarea
                    value={integriteNotes}
                    onChange={(e) => setIntegriteNotes(e.target.value)}
                    placeholder="Détails de la non-conformité..."
                    className="mt-2"
                  />
                )}
              </div>

              {/* DLC conforme */}
              <div className="space-y-2">
                <Label>DLC conforme ?</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={dlcConforme === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDlcConforme(true)}
                  >
                    Oui
                  </Button>
                  <Button
                    type="button"
                    variant={dlcConforme === false ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setDlcConforme(false)}
                  >
                    Non
                  </Button>
                </div>
                {dlcConforme === false && (
                  <Textarea
                    value={dlcNotes}
                    onChange={(e) => setDlcNotes(e.target.value)}
                    placeholder="Détails de la non-conformité..."
                    className="mt-2"
                  />
                )}
              </div>

              {/* Allergènes */}
              <div className="space-y-2">
                <Label>Allergènes conformes ?</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={allergenesConformes === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAllergenesConformes(true)}
                  >
                    Oui
                  </Button>
                  <Button
                    type="button"
                    variant={allergenesConformes === false ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setAllergenesConformes(false)}
                  >
                    Non
                  </Button>
                </div>
                {allergenesConformes === false && (
                  <Textarea
                    value={allergenesNotes}
                    onChange={(e) => setAllergenesNotes(e.target.value)}
                    placeholder="Détails de la non-conformité..."
                    className="mt-2"
                  />
                )}
              </div>
            </>
          )}

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
          <Button onClick={handleSubmit} disabled={updateRecord.isPending}>
            {updateRecord.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
