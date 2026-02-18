import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Magnet, Plus, AlertTriangle, CheckCircle2, Clock, XCircle, 
  Shield, Timer, ChevronDown, ChevronUp, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import {
  useMetalDetectors,
  useTestConfigs,
  useTodayMetalDetectorControls,
  useMetalDetectorSettings,
  MetalDetectorControl as MDControl,
} from '@/hooks/useMetalDetector';
import { useOperatorNames } from '@/hooks/useOperatorNames';
import { MetalDetectorControlForm } from '@/components/metal-detector/MetalDetectorControlForm';
import { MetalDetectorDeviationForm } from '@/components/metal-detector/MetalDetectorDeviationForm';
import { MetalDetectorStatusBadge } from '@/components/metal-detector/MetalDetectorStatusBadge';
import { cn } from '@/lib/utils';

export default function MetalDetectorControl() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: detectors } = useMetalDetectors();
  const { data: testConfigs } = useTestConfigs();
  const { data: settings } = useMetalDetectorSettings();
  const activeDetectors = detectors?.filter(d => d.is_active) || [];
  const [selectedDetectorId, setSelectedDetectorId] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deviationControlId, setDeviationControlId] = useState<string | null>(null);
  const [expandedControlId, setExpandedControlId] = useState<string | null>(null);

  // Auto-select first detector
  const detectorId = selectedDetectorId || activeDetectors[0]?.id || '';
  const { data: todayControls } = useTodayMetalDetectorControls(detectorId);

  const operatorIds = useMemo(() => {
    if (!todayControls) return [];
    return [...new Set(todayControls.map(c => c.operator_id))];
  }, [todayControls]);
  const { data: operatorNames } = useOperatorNames(operatorIds);

  // Check if next verification is due
  const intervalMinutes = (settings?.check_interval_hours || 2) * 60;
  const lastValidControl = useMemo(() => {
    if (!todayControls?.length) return null;
    const valid = todayControls.filter(c => c.status === 'valid');
    return valid.length > 0 ? valid[valid.length - 1] : null;
  }, [todayControls]);

  const minutesSinceLastCheck = lastValidControl 
    ? differenceInMinutes(new Date(), parseISO(lastValidControl.created_at))
    : null;
  
  const isOverdue = minutesSinceLastCheck !== null && minutesSinceLastCheck >= intervalMinutes;
  const hasActiveDeviation = todayControls?.some(c => c.status === 'deviation' && c.production_blocked) || false;

  // Determine which control moments have been completed today
  const completedMoments = useMemo(() => {
    if (!todayControls) return new Set<string>();
    return new Set(todayControls.filter(c => c.status === 'valid').map(c => c.control_moment));
  }, [todayControls]);

  const hasStartProduction = completedMoments.has('start_production');

  const getOperatorName = (id: string) => operatorNames?.[id] || 'Opérateur inconnu';

  if (!detectors?.length) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Magnet className="h-6 w-6" />
            CCP – Détecteur de Métaux
          </h1>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Aucun détecteur configuré</AlertTitle>
          <AlertDescription>
            Veuillez configurer au moins un détecteur de métaux dans les Paramètres avant de pouvoir enregistrer des contrôles.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Magnet className="h-6 w-6" />
            CCP – Détecteur de Métaux
          </h1>
          <p className="text-muted-foreground mt-1">
            Corps étrangers métalliques — Contrôle en production
          </p>
        </div>
      </div>

      {/* Active deviation banner */}
      {hasActiveDeviation && (
        <Alert variant="destructive" className="border-2 animate-pulse">
          <XCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">⚠️ PRODUCTION BLOQUÉE</AlertTitle>
          <AlertDescription className="text-base">
            Une déviation est en cours. La production ne peut pas reprendre tant que l'action corrective n'est pas validée et qu'un nouveau test complet n'est pas réussi.
          </AlertDescription>
        </Alert>
      )}

      {/* Overdue alert */}
      {isOverdue && !hasActiveDeviation && (
        <Alert className="border-warning/50 bg-warning/10">
          <Timer className="h-5 w-5 text-warning" />
          <AlertTitle className="text-warning">Vérification du détecteur de métaux requise</AlertTitle>
          <AlertDescription>
            Le dernier contrôle valide date de {minutesSinceLastCheck} minutes. L'intervalle configuré est de {settings?.check_interval_hours || 2}h.
          </AlertDescription>
        </Alert>
      )}

      {/* Detector selector + New control button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {activeDetectors.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Détecteur :</span>
            <div className="flex gap-2">
              {activeDetectors.map(d => (
                <Button
                  key={d.id}
                  variant={detectorId === d.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDetectorId(d.id)}
                >
                  {d.name}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/haccp/metal-detector/history')}>
            <History className="h-4 w-4 mr-2" />
            Historique
          </Button>
          <Button onClick={() => setIsFormOpen(true)} disabled={hasActiveDeviation}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contrôle
          </Button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{todayControls?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Contrôles aujourd'hui</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">{todayControls?.filter(c => c.status === 'valid').length || 0}</div>
            <div className="text-sm text-muted-foreground">Valides</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive">{todayControls?.filter(c => c.status === 'deviation').length || 0}</div>
            <div className="text-sm text-muted-foreground">Déviations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={cn("text-2xl font-bold", hasStartProduction ? 'text-success' : 'text-warning')}>
              {hasStartProduction ? '✓' : '✗'}
            </div>
            <div className="text-sm text-muted-foreground">Test début prod.</div>
          </CardContent>
        </Card>
      </div>

      {/* Today's controls timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contrôles du jour</CardTitle>
        </CardHeader>
        <CardContent>
          {!todayControls?.length ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun contrôle enregistré aujourd'hui. Commencez par un test de début de production.
            </p>
          ) : (
            <div className="space-y-3">
              {todayControls.map((control) => {
                const isExpanded = expandedControlId === control.id;
                const tests = control.metal_detector_tests || [];
                const deviations = control.metal_detector_deviations || [];
                const hasUnvalidatedDeviation = deviations.some(d => !d.supervisor_validated);

                return (
                  <div key={control.id} className="border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedControlId(isExpanded ? null : control.id)}
                    >
                      <div className="flex items-center gap-3">
                        <MetalDetectorStatusBadge status={control.status} />
                        <div className="text-left">
                          <p className="font-medium text-sm">
                            {control.control_moment === 'start_production' && 'Début de production'}
                            {control.control_moment === 'interval' && 'Vérification périodique'}
                            {control.control_moment === 'line_restart' && 'Reprise de ligne'}
                            {control.control_moment === 'end_production' && 'Fin de production'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(control.created_at), 'HH:mm', { locale: fr })} — {getOperatorName(control.operator_id)} — Lot: {control.lot_number}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {control.production_blocked && (
                          <Badge variant="destructive" className="text-xs">BLOQUÉ</Badge>
                        )}
                        {hasUnvalidatedDeviation && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={(e) => { e.stopPropagation(); setDeviationControlId(control.id); }}
                          >
                            Traiter déviation
                          </Button>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t bg-muted/20">
                        <div className="pt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">RÉSULTATS DES TESTS</p>
                          <div className="grid grid-cols-3 gap-2">
                            {tests.map(test => (
                              <div key={test.id} className={cn(
                                "p-3 rounded-lg border text-center",
                                test.result === 'OK' ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'
                              )}>
                                <p className="text-sm font-bold">{test.test_piece_type}</p>
                                <p className="text-xs text-muted-foreground">⌀ {test.diameter_mm} mm</p>
                                <p className={cn("text-sm font-bold mt-1", test.result === 'OK' ? 'text-success' : 'text-destructive')}>
                                  {test.result}
                                </p>
                                <p className="text-xs text-muted-foreground">{format(parseISO(test.tested_at), 'HH:mm')}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {deviations.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">DÉVIATIONS</p>
                            {deviations.map(dev => (
                              <div key={dev.id} className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Badge variant="destructive">
                                    {dev.supervisor_validated ? 'Validée' : 'En attente validation'}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Décision: {dev.product_decision === 'isolate' && 'Isoler'}
                                    {dev.product_decision === 'recheck' && 'Repasser au détecteur'}
                                    {dev.product_decision === 'destroy' && 'Détruire'}
                                    {dev.product_decision === 'release' && 'Libérer avec justification'}
                                  </span>
                                </div>
                                <p className="text-sm"><strong>Cause :</strong> {dev.cause_description}</p>
                                <p className="text-sm"><strong>Action corrective :</strong> {dev.corrective_action}</p>
                                {dev.release_justification && (
                                  <p className="text-sm"><strong>Justification :</strong> {dev.release_justification}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Produit : {control.product_reference} | Ligne : {control.production_line}</p>
                          {control.test_kit_reference && <p>Réf. kit test : {control.test_kit_reference}</p>}
                          {control.calibration_date && <p>Dernière calibration : {control.calibration_date}</p>}
                          {control.is_validated && <p className="text-success flex items-center gap-1"><Shield className="h-3 w-3" /> Validé (non modifiable)</p>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Control Form */}
      {isFormOpen && testConfigs && (
        <MetalDetectorControlForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          detectors={activeDetectors}
          testConfigs={testConfigs}
          defaultDetectorId={detectorId}
          hasActiveDeviation={hasActiveDeviation}
        />
      )}

      {/* Deviation Form */}
      {deviationControlId && (
        <MetalDetectorDeviationForm
          isOpen={!!deviationControlId}
          onClose={() => setDeviationControlId(null)}
          controlId={deviationControlId}
        />
      )}
    </div>
  );
}
