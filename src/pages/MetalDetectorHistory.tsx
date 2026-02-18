import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Magnet, Search, Filter, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMetalDetectorControls, MetalDetectorControl } from '@/hooks/useMetalDetector';
import { useOperatorNames } from '@/hooks/useOperatorNames';
import { MetalDetectorStatusBadge } from '@/components/metal-detector/MetalDetectorStatusBadge';
import { cn } from '@/lib/utils';

export default function MetalDetectorHistory() {
  const [filterDate, setFilterDate] = useState('');
  const [filterLot, setFilterLot] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters = useMemo(() => ({
    date: filterDate || undefined,
    lot_number: filterLot || undefined,
    product_reference: filterProduct || undefined,
  }), [filterDate, filterLot, filterProduct]);

  const { data: controls, isLoading } = useMetalDetectorControls(filters);

  const operatorIds = useMemo(() => {
    if (!controls) return [];
    const ids = new Set<string>();
    controls.forEach(c => { ids.add(c.operator_id); if (c.supervisor_id) ids.add(c.supervisor_id); });
    return [...ids];
  }, [controls]);
  const { data: operatorNames } = useOperatorNames(operatorIds);
  const getName = (id: string) => operatorNames?.[id] || id.slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Magnet className="h-6 w-6" />
          Historique CCP — Détecteur de Métaux
        </h1>
        <p className="text-muted-foreground mt-1">
          Traçabilité complète de tous les contrôles du détecteur de métaux
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="space-y-1 flex-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs text-muted-foreground">N° de lot</Label>
              <Input placeholder="Rechercher..." value={filterLot} onChange={e => setFilterLot(e.target.value)} />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs text-muted-foreground">Produit</Label>
              <Input placeholder="Rechercher..." value={filterProduct} onChange={e => setFilterProduct(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => { setFilterDate(''); setFilterLot(''); setFilterProduct(''); }}>
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Enregistrements</span>
            <Badge variant="outline">{controls?.length || 0} résultats</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Chargement...</p>
          ) : !controls?.length ? (
            <p className="text-center text-muted-foreground py-8">Aucun enregistrement trouvé</p>
          ) : (
            <div className="space-y-2">
              {controls.map(control => {
                const isExpanded = expandedId === control.id;
                const tests = control.metal_detector_tests || [];
                const deviations = control.metal_detector_deviations || [];

                return (
                  <div key={control.id} className="border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => setExpandedId(isExpanded ? null : control.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MetalDetectorStatusBadge status={control.status} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {format(parseISO(control.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })} — {control.product_reference}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            Lot: {control.lot_number} — {getName(control.operator_id)} — {control.production_line}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {control.production_blocked && <Badge variant="destructive" className="text-xs">BLOQUÉ</Badge>}
                        {control.is_validated && <Shield className="h-4 w-4 text-success" />}
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t bg-muted/20 space-y-3 pt-3">
                        {/* Test results */}
                        <div className="grid grid-cols-3 gap-2">
                          {tests.map(test => (
                            <div key={test.id} className={cn(
                              "p-2 rounded border text-center text-sm",
                              test.result === 'OK' ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'
                            )}>
                              <p className="font-bold">{test.test_piece_type}</p>
                              <p className="text-xs">⌀ {test.diameter_mm} mm</p>
                              <p className={cn("font-bold", test.result === 'OK' ? 'text-success' : 'text-destructive')}>{test.result}</p>
                              <p className="text-xs text-muted-foreground">{format(parseISO(test.tested_at), 'HH:mm')}</p>
                            </div>
                          ))}
                        </div>

                        {/* Deviations */}
                        {deviations.map(dev => (
                          <div key={dev.id} className="p-3 rounded border border-destructive/30 bg-destructive/5 text-sm space-y-1">
                            <div className="flex items-center justify-between">
                              <Badge variant="destructive">{dev.supervisor_validated ? 'Validée' : 'En attente'}</Badge>
                              <span className="text-xs">
                                {dev.product_decision === 'isolate' && 'Isoler'}
                                {dev.product_decision === 'recheck' && 'Repasser'}
                                {dev.product_decision === 'destroy' && 'Détruire'}
                                {dev.product_decision === 'release' && 'Libérer'}
                              </span>
                            </div>
                            <p><strong>Cause :</strong> {dev.cause_description}</p>
                            <p><strong>Action :</strong> {dev.corrective_action}</p>
                            {dev.release_justification && <p><strong>Justification :</strong> {dev.release_justification}</p>}
                            <p className="text-xs text-muted-foreground">Superviseur : {getName(dev.supervisor_id)}</p>
                          </div>
                        ))}

                        {/* Metadata */}
                        <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
                          <p>Moment : {
                            control.control_moment === 'start_production' ? 'Début production' :
                            control.control_moment === 'interval' ? 'Périodique' :
                            control.control_moment === 'line_restart' ? 'Reprise ligne' : 'Fin production'
                          }</p>
                          <p>Détecteur : {control.metal_detectors?.name || '—'}</p>
                          {control.test_kit_reference && <p>Kit test : {control.test_kit_reference}</p>}
                          {control.calibration_date && <p>Calibration : {control.calibration_date}</p>}
                          {control.is_validated && <p className="text-success col-span-2">✓ Enregistrement validé — Non modifiable</p>}
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
    </div>
  );
}
