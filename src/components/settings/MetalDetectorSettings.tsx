import { useState } from 'react';
import { Magnet, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useMetalDetectors,
  useCreateMetalDetector,
  useUpdateMetalDetector,
  useTestConfigs,
  useUpdateTestConfig,
  useMetalDetectorSettings,
  useUpdateMetalDetectorSettings,
  MetalDetector,
} from '@/hooks/useMetalDetector';

export function MetalDetectorSettings() {
  const { data: detectors } = useMetalDetectors();
  const createDetector = useCreateMetalDetector();
  const updateDetector = useUpdateMetalDetector();
  const { data: testConfigs } = useTestConfigs();
  const updateTestConfig = useUpdateTestConfig();
  const { data: settings } = useMetalDetectorSettings();
  const updateSettings = useUpdateMetalDetectorSettings();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDetector, setEditingDetector] = useState<MetalDetector | null>(null);
  const [newName, setNewName] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newLine, setNewLine] = useState('');
  const [newCalibDate, setNewCalibDate] = useState('');
  const [newKitRef, setNewKitRef] = useState('');

  // Test config editing
  const [editingConfig, setEditingConfig] = useState<{ id: string; diameter_mm: string } | null>(null);
  
  // Interval editing
  const [editingInterval, setEditingInterval] = useState(false);
  const [intervalValue, setIntervalValue] = useState('');

  const resetForm = () => {
    setNewName(''); setNewSerial(''); setNewLine(''); setNewCalibDate(''); setNewKitRef('');
  };

  const handleAdd = async () => {
    if (!newName || !newLine) { toast.error('Nom et ligne sont obligatoires'); return; }
    await createDetector.mutateAsync({
      name: newName,
      serial_number: newSerial || null,
      production_line: newLine,
      last_calibration_date: newCalibDate || null,
      test_kit_reference: newKitRef || null,
    });
    setIsAddOpen(false);
    resetForm();
  };

  const handleToggleActive = async (d: MetalDetector) => {
    await updateDetector.mutateAsync({ id: d.id, is_active: !d.is_active });
  };

  const handleSaveConfig = async () => {
    if (!editingConfig) return;
    const val = parseFloat(editingConfig.diameter_mm);
    if (isNaN(val) || val <= 0) { toast.error('Diamètre invalide'); return; }
    await updateTestConfig.mutateAsync({ id: editingConfig.id, diameter_mm: val });
    setEditingConfig(null);
  };

  const handleSaveInterval = async () => {
    if (!settings) return;
    const val = parseFloat(intervalValue);
    if (isNaN(val) || val <= 0) { toast.error('Intervalle invalide'); return; }
    await updateSettings.mutateAsync({ id: settings.id, check_interval_hours: val });
    setEditingInterval(false);
  };

  return (
    <>
      {/* Metal Detectors */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Magnet className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Détecteurs de Métaux</CardTitle>
                <CardDescription>Gérez les machines et la configuration CCP</CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Machines */}
          {!detectors?.length ? (
            <p className="text-center text-muted-foreground py-4">Aucun détecteur configuré</p>
          ) : (
            <div className="space-y-3">
              {detectors.map(d => (
                <div key={d.id} className={cn(
                  "flex items-center justify-between p-4 rounded-lg border",
                  d.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                )}>
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Ligne: {d.production_line}
                      {d.serial_number && ` • S/N: ${d.serial_number}`}
                      {d.last_calibration_date && ` • Calibration: ${d.last_calibration_date}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={d.is_active ? 'bg-success/10 text-success border-success/30' : ''}>
                      {d.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleActive(d)}>
                      {d.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Test piece configs */}
          <div className="pt-4 border-t">
            <p className="text-sm font-semibold mb-3">Éprouvettes de test (diamètres configurables)</p>
            <div className="grid grid-cols-3 gap-3">
              {testConfigs?.map(tc => (
                <div key={tc.id} className="p-3 rounded-lg border text-center">
                  <p className="font-bold text-sm">
                    {tc.test_piece_type === 'Fe' && '🔴 Fe'}
                    {tc.test_piece_type === 'Al' && '🔵 Al'}
                    {tc.test_piece_type === 'Inox' && '⚪ Inox'}
                  </p>
                  {editingConfig?.id === tc.id ? (
                    <div className="flex items-center gap-1 mt-2">
                      <Input
                        className="h-8 text-center text-sm"
                        value={editingConfig.diameter_mm}
                        onChange={e => setEditingConfig({ ...editingConfig, diameter_mm: e.target.value })}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveConfig}>
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button 
                      className="text-lg font-bold mt-1 hover:text-primary transition-colors"
                      onClick={() => setEditingConfig({ id: tc.id, diameter_mm: String(tc.diameter_mm) })}
                    >
                      ⌀ {tc.diameter_mm} mm
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Interval setting */}
          <div className="pt-4 border-t">
            <p className="text-sm font-semibold mb-2">Intervalle de vérification</p>
            {editingInterval ? (
              <div className="flex items-center gap-2">
                <Input
                  className="w-24 h-8 text-sm"
                  value={intervalValue}
                  onChange={e => setIntervalValue(e.target.value)}
                  type="number"
                  step="0.5"
                  min="0.5"
                />
                <span className="text-sm text-muted-foreground">heures</span>
                <Button size="sm" variant="outline" onClick={handleSaveInterval}>Enregistrer</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingInterval(false)}>Annuler</Button>
              </div>
            ) : (
              <button
                className="text-sm hover:text-primary transition-colors"
                onClick={() => { setEditingInterval(true); setIntervalValue(String(settings?.check_interval_hours || 2)); }}
              >
                Toutes les <strong>{settings?.check_interval_hours || 2} heures</strong> — Cliquer pour modifier
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Detector Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un détecteur de métaux</DialogTitle>
            <DialogDescription>Configurez un nouveau détecteur pour le contrôle CCP</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Détecteur Ligne 1" />
            </div>
            <div className="space-y-2">
              <Label>Ligne de production *</Label>
              <Input value={newLine} onChange={e => setNewLine(e.target.value)} placeholder="Ex: Ligne 1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>N° de série</Label>
                <Input value={newSerial} onChange={e => setNewSerial(e.target.value)} placeholder="Optionnel" />
              </div>
              <div className="space-y-2">
                <Label>Réf. kit de test</Label>
                <Input value={newKitRef} onChange={e => setNewKitRef(e.target.value)} placeholder="Optionnel" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dernière calibration</Label>
              <Input type="date" value={newCalibDate} onChange={e => setNewCalibDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Annuler</Button>
            <Button onClick={handleAdd} disabled={createDetector.isPending || !newName || !newLine}>
              {createDetector.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
