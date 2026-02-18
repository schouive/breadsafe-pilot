import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateDeviation } from '@/hooks/useMetalDetector';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  controlId: string;
}

export function MetalDetectorDeviationForm({ isOpen, onClose, controlId }: Props) {
  const { user, hasRole } = useAuth();
  const createDeviation = useCreateDeviation();
  
  const [causeDescription, setCauseDescription] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [productDecision, setProductDecision] = useState('');
  const [releaseJustification, setReleaseJustification] = useState('');

  const isSupervisor = hasRole('admin') || hasRole('quality_assistant');

  const handleSubmit = async () => {
    if (!causeDescription.trim()) { toast.error('La description de la cause est obligatoire'); return; }
    if (!correctiveAction.trim()) { toast.error('L\'action corrective est obligatoire'); return; }
    if (!productDecision) { toast.error('La décision sur les produits affectés est obligatoire'); return; }
    if (productDecision === 'release' && !releaseJustification.trim()) { 
      toast.error('La justification de libération est obligatoire'); return; 
    }
    if (!isSupervisor) {
      toast.error('Seul un superviseur (Admin / Responsable Qualité) peut enregistrer une déviation');
      return;
    }

    try {
      await createDeviation.mutateAsync({
        control_id: controlId,
        cause_description: causeDescription.trim(),
        corrective_action: correctiveAction.trim(),
        product_decision: productDecision,
        release_justification: productDecision === 'release' ? releaseJustification.trim() : undefined,
        supervisor_id: user!.id,
      });
      onClose();
    } catch {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Gestion de la déviation
          </DialogTitle>
          <DialogDescription>
            Un test NOK a été détecté. Remplissez obligatoirement tous les champs ci-dessous. La production reste bloquée tant que la déviation n'est pas résolue.
          </DialogDescription>
        </DialogHeader>

        {!isSupervisor && (
          <div className="p-4 rounded-lg border border-destructive bg-destructive/10 text-destructive text-sm">
            <strong>Accès refusé :</strong> Seul un superviseur (Admin ou Responsable Qualité) peut enregistrer et valider une déviation. Veuillez contacter votre responsable.
          </div>
        )}

        <div className="space-y-5">
          {/* Cause description */}
          <div className="space-y-2">
            <Label className="font-semibold">1. Description de la cause *</Label>
            <Textarea 
              value={causeDescription} 
              onChange={e => setCauseDescription(e.target.value)}
              placeholder="Décrivez la cause probable de la détection NOK..."
              rows={3}
            />
          </div>

          {/* Corrective action */}
          <div className="space-y-2">
            <Label className="font-semibold">2. Action corrective immédiate *</Label>
            <Textarea 
              value={correctiveAction}
              onChange={e => setCorrectiveAction(e.target.value)}
              placeholder="Décrivez l'action corrective mise en place..."
              rows={3}
            />
          </div>

          {/* Decision on affected products */}
          <div className="space-y-2">
            <Label className="font-semibold">3. Décision sur les produits affectés *</Label>
            <Select value={productDecision} onValueChange={setProductDecision}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez une décision..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="isolate">Isoler les produits</SelectItem>
                <SelectItem value="recheck">Repasser au détecteur</SelectItem>
                <SelectItem value="destroy">Détruire les produits</SelectItem>
                <SelectItem value="release">Libérer avec justification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Release justification */}
          {productDecision === 'release' && (
            <div className="space-y-2">
              <Label className="font-semibold">Justification de libération *</Label>
              <Textarea 
                value={releaseJustification}
                onChange={e => setReleaseJustification(e.target.value)}
                placeholder="Justifiez pourquoi les produits peuvent être libérés malgré la déviation..."
                rows={3}
              />
            </div>
          )}

          <div className="p-3 rounded-lg border bg-muted/50 text-sm text-muted-foreground">
            <p><strong>Signature superviseur :</strong> {user?.email}</p>
            <p className="mt-1">La production ne pourra reprendre qu'après validation de cette déviation et un nouveau test complet réussi.</p>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-0 mt-4">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button 
            variant="destructive"
            onClick={handleSubmit}
            disabled={!isSupervisor || createDeviation.isPending}
          >
            {createDeviation.isPending ? 'Enregistrement...' : 'Enregistrer la déviation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
