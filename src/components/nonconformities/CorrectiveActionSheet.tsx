import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
  SheetFooter 
} from '@/components/ui/sheet';
import { 
  CheckCircle2, 
  AlertTriangle,
  User,
  Calendar,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateNonConformity, NonConformityFromDB } from '@/hooks/useNonConformities';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CONTROL_POINTS } from '@/types/haccp';

const severityConfig = {
  minor: { label: 'Mineur', class: 'bg-warning/10 text-warning border-warning/30' },
  major: { label: 'Majeur', class: 'bg-orange-100 text-orange-700 border-orange-300' },
  critical: { label: 'Critique', class: 'bg-destructive/10 text-destructive border-destructive/30' },
};

interface CorrectiveActionSheetProps {
  nonConformity: NonConformityFromDB | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CorrectiveActionSheet({ 
  nonConformity, 
  isOpen, 
  onClose 
}: CorrectiveActionSheetProps) {
  const { user } = useAuth();
  const updateNC = useUpdateNonConformity();
  
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when nonConformity changes
  useState(() => {
    if (nonConformity) {
      setCorrectiveAction(nonConformity.corrective_action || '');
      setAssignedTo(nonConformity.assigned_to || '');
    }
  });

  if (!nonConformity) return null;

  const cp = CONTROL_POINTS.find(c => c.code === nonConformity.control_point_code);
  const severity = severityConfig[nonConformity.severity];

  const handleStartProgress = async () => {
    if (!correctiveAction.trim()) return;
    
    setIsSubmitting(true);
    try {
      await updateNC.mutateAsync({
        id: nonConformity.id,
        status: 'in_progress',
        corrective_action: correctiveAction,
        assigned_to: assignedTo || user?.email || 'Non assigné',
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!correctiveAction.trim()) return;
    
    setIsSubmitting(true);
    try {
      await updateNC.mutateAsync({
        id: nonConformity.id,
        status: 'resolved',
        corrective_action: correctiveAction,
        corrective_action_date: new Date().toISOString(),
        assigned_to: assignedTo || user?.email || 'Non assigné',
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidate = async () => {
    setIsSubmitting(true);
    try {
      await updateNC.mutateAsync({
        id: nonConformity.id,
        status: 'validated',
        validated_by: user?.id,
        validated_at: new Date().toISOString(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Action corrective
          </SheetTitle>
          <SheetDescription>
            Traitement de la non-conformité
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* NC Info */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("font-medium", severity.class)}>
                {severity.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {cp?.name || nonConformity.control_point_code}
              </span>
            </div>
            
            <p className="text-foreground bg-muted/50 rounded-lg p-3">
              {nonConformity.description}
            </p>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Créée le {format(new Date(nonConformity.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </span>
            </div>
          </div>

          {/* Corrective Action Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assignedTo" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Assigné à
              </Label>
              <Input
                id="assignedTo"
                placeholder="Nom du responsable"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="correctiveAction" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Action corrective
              </Label>
              <Textarea
                id="correctiveAction"
                placeholder="Décrivez l'action corrective mise en place..."
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          {/* Existing corrective action info */}
          {nonConformity.corrective_action && nonConformity.status !== 'open' && (
            <div className="bg-primary/5 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-primary">Action en cours:</p>
              <p className="text-sm text-muted-foreground">{nonConformity.corrective_action}</p>
              {nonConformity.corrective_action_date && (
                <p className="text-xs text-muted-foreground">
                  Date: {format(new Date(nonConformity.corrective_action_date), 'dd/MM/yyyy', { locale: fr })}
                </p>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="flex-col gap-2">
          {nonConformity.status === 'open' && (
            <>
              <Button 
                className="w-full"
                onClick={handleStartProgress}
                disabled={!correctiveAction.trim() || isSubmitting}
              >
                Démarrer le traitement
              </Button>
              <Button 
                variant="outline"
                className="w-full"
                onClick={handleResolve}
                disabled={!correctiveAction.trim() || isSubmitting}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marquer comme résolue
              </Button>
            </>
          )}

          {nonConformity.status === 'in_progress' && (
            <Button 
              className="w-full"
              onClick={handleResolve}
              disabled={!correctiveAction.trim() || isSubmitting}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marquer comme résolue
            </Button>
          )}

          {nonConformity.status === 'resolved' && (
            <Button 
              className="w-full bg-success hover:bg-success/90"
              onClick={handleValidate}
              disabled={isSubmitting}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Valider la clôture
            </Button>
          )}

          <Button variant="ghost" onClick={onClose} className="w-full">
            Fermer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
