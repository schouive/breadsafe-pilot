import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCreateMetalDetectorControl, MetalDetector, TestConfig } from '@/hooks/useMetalDetector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  detectors: MetalDetector[];
  testConfigs: TestConfig[];
  defaultDetectorId: string;
  hasActiveDeviation: boolean;
}

type TestResult = { test_piece_type: string; diameter_mm: number; result: 'OK' | 'NOK' | ''; tested_at: string };

export function MetalDetectorControlForm({ isOpen, onClose, detectors, testConfigs, defaultDetectorId, hasActiveDeviation }: Props) {
  const createControl = useCreateMetalDetectorControl();
  
  const [detectorId, setDetectorId] = useState(defaultDetectorId);
  const [controlMoment, setControlMoment] = useState('');
  const [productReference, setProductReference] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [productionLine, setProductionLine] = useState('');
  const [testKitRef, setTestKitRef] = useState('');
  const [calibrationDate, setCalibrationDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // Initialize tests from configs
  const [tests, setTests] = useState<TestResult[]>(() =>
    testConfigs.map(tc => ({
      test_piece_type: tc.test_piece_type,
      diameter_mm: tc.diameter_mm,
      result: '' as const,
      tested_at: new Date().toISOString(),
    }))
  );

  const selectedDetector = detectors.find(d => d.id === detectorId);
  const allTestsFilled = tests.every(t => t.result !== '');
  const allTestsOK = tests.every(t => t.result === 'OK');
  const hasNOK = tests.some(t => t.result === 'NOK');

  const setTestResult = (index: number, result: 'OK' | 'NOK') => {
    setTests(prev => prev.map((t, i) => 
      i === index ? { ...t, result, tested_at: new Date().toISOString() } : t
    ));
  };

  const handleSubmit = async () => {
    if (!controlMoment) { toast.error('Sélectionnez le moment du contrôle'); return; }
    if (!productReference) { toast.error('Renseignez la référence produit'); return; }
    if (!lotNumber) { toast.error('Renseignez le numéro de lot'); return; }
    if (!productionLine) { toast.error('Renseignez la ligne de production'); return; }
    if (!allTestsFilled) { toast.error('Tous les tests (Fe, Al, Inox) doivent être renseignés'); return; }

    try {
      await createControl.mutateAsync({
        metal_detector_id: detectorId,
        control_moment: controlMoment,
        product_reference: productReference,
        lot_number: lotNumber,
        production_date: format(new Date(), 'yyyy-MM-dd'),
        production_line: productionLine,
        test_kit_reference: testKitRef || undefined,
        calibration_date: calibrationDate || undefined,
        notes: notes || undefined,
        tests: tests.map(t => ({ ...t, result: t.result as string })),
      });

      if (allTestsOK) {
        toast.success('Contrôle CCP validé — tous les tests OK');
      } else {
        toast.error('DÉVIATION DÉTECTÉE — Production bloquée. Veuillez traiter la déviation.');
      }
      onClose();
    } catch {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            Contrôle CCP — Détecteur de Métaux
          </DialogTitle>
          <DialogDescription>
            Enregistrez les résultats des 3 tests obligatoires (Fe, Al, Inox)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Detector */}
          {detectors.length > 1 && (
            <div className="space-y-2">
              <Label>Détecteur</Label>
              <Select value={detectorId} onValueChange={setDetectorId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {detectors.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name} ({d.production_line})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Control moment */}
          <div className="space-y-2">
            <Label>Moment du contrôle *</Label>
            <Select value={controlMoment} onValueChange={setControlMoment}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="start_production">Début de production</SelectItem>
                <SelectItem value="interval">Vérification périodique</SelectItem>
                <SelectItem value="line_restart">Reprise de ligne</SelectItem>
                <SelectItem value="end_production">Fin de production</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Product / Lot / Line */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Référence produit *</Label>
              <Input value={productReference} onChange={e => setProductReference(e.target.value)} placeholder="Ex: BAGUETTE-T65" />
            </div>
            <div className="space-y-2">
              <Label>N° de lot *</Label>
              <Input value={lotNumber} onChange={e => setLotNumber(e.target.value)} placeholder="Ex: LOT-2026-0218" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ligne de production *</Label>
            <Input 
              value={productionLine} 
              onChange={e => setProductionLine(e.target.value)} 
              placeholder={selectedDetector?.production_line || "Ex: Ligne 1"}
              defaultValue={selectedDetector?.production_line}
            />
          </div>

          {/* Test kit & calibration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Réf. kit de test</Label>
              <Input value={testKitRef} onChange={e => setTestKitRef(e.target.value)} placeholder="Ex: KIT-001" />
            </div>
            <div className="space-y-2">
              <Label>Date calibration</Label>
              <Input type="date" value={calibrationDate} onChange={e => setCalibrationDate(e.target.value)} />
            </div>
          </div>

          {/* 3 Mandatory Tests */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Tests obligatoires</Label>
            <p className="text-xs text-muted-foreground">Les 3 éprouvettes doivent être testées. Un seul NOK = Déviation + Blocage production.</p>
            
            {tests.map((test, idx) => (
              <div key={test.test_piece_type} className={cn(
                "p-4 rounded-lg border-2 space-y-3",
                test.result === 'OK' ? 'border-success/30 bg-success/5' :
                test.result === 'NOK' ? 'border-destructive/30 bg-destructive/5' :
                'border-border'
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      {test.test_piece_type === 'Fe' && '🔴 Ferreux (Fe)'}
                      {test.test_piece_type === 'Al' && '🔵 Non-ferreux (Al)'}
                      {test.test_piece_type === 'Inox' && '⚪ Inox (SUS 304)'}
                    </p>
                    <p className="text-xs text-muted-foreground">Diamètre : {test.diameter_mm} mm</p>
                  </div>
                  {test.result && (
                    <Badge variant="outline" className={cn(
                      test.result === 'OK' ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'
                    )}>
                      {test.result}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={test.result === 'OK' ? 'default' : 'outline'}
                    className={cn("flex-1", test.result === 'OK' && 'bg-success hover:bg-success/90 text-white')}
                    onClick={() => setTestResult(idx, 'OK')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    OK — Détecté
                  </Button>
                  <Button
                    type="button"
                    variant={test.result === 'NOK' ? 'default' : 'outline'}
                    className={cn("flex-1", test.result === 'NOK' && 'bg-destructive hover:bg-destructive/90 text-white')}
                    onClick={() => setTestResult(idx, 'NOK')}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    NOK — Non détecté
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Warning if NOK */}
          {hasNOK && (
            <div className="p-4 rounded-lg border-2 border-destructive bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive font-bold">
                <AlertTriangle className="h-5 w-5" />
                DÉVIATION — TEST NON CONFORME
              </div>
              <p className="text-sm text-destructive mt-1">
                La production sera automatiquement bloquée. Vous devrez remplir un formulaire de déviation après l'enregistrement.
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observations</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Remarques éventuelles..." />
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-0 mt-4">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!allTestsFilled || !controlMoment || !productReference || !lotNumber || !productionLine || createControl.isPending}
          >
            {createControl.isPending ? 'Enregistrement...' : 'Enregistrer le contrôle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
