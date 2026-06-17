import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useValidatedProductSheets, useCreateCartonLabel, useUpdateCartonLabel, CartonLabel } from '@/hooks/useCartonLabels';
import { CARTON_LABEL_LANGUAGES } from '@/lib/cartonLabelI18n';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CartonLabelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: CartonLabel | null;
  mode: 'create' | 'edit';
}

export function CartonLabelFormDialog({
  open,
  onOpenChange,
  label,
  mode,
}: CartonLabelFormDialogProps) {
  const { data: productSheets, isLoading: loadingSheets } = useValidatedProductSheets();
  const createLabel = useCreateCartonLabel();
  const updateLabel = useUpdateCartonLabel();

  const [formData, setFormData] = useState({
    product_sheet_id: '',
    label_title: '',
    language: 'fr',
  });

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && label) {
        setFormData({
          product_sheet_id: label.product_sheet_id,
          label_title: label.label_title,
          language: label.language || 'fr',
        });
      } else {
        setFormData({
          product_sheet_id: '',
          label_title: '',
          language: 'fr',
        });
      }
    }
  }, [open, mode, label]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'create') {
      await createLabel.mutateAsync(formData);
    } else if (label) {
      await updateLabel.mutateAsync({
        id: label.id,
        label_title: formData.label_title,
      });
    }

    onOpenChange(false);
  };

  const isSubmitting = createLabel.isPending || updateLabel.isPending;
  const hasNoValidatedSheets = !loadingSheets && (!productSheets || productSheets.length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nouvelle étiquette carton' : 'Modifier l\'étiquette'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Sélectionnez une fiche technique avec INCO validée et définissez le titre de l\'étiquette'
              : 'Modifiez le titre de l\'étiquette carton'}
          </DialogDescription>
        </DialogHeader>

        {hasNoValidatedSheets && mode === 'create' ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucune fiche technique avec INCO validée disponible. Veuillez d'abord valider la FT et son INCO.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="product_sheet">Fiche technique *</Label>
                <Select
                  value={formData.product_sheet_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, product_sheet_id: value }))
                  }
                  disabled={loadingSheets}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une FT avec INCO validée" />
                  </SelectTrigger>
                  <SelectContent>
                    {productSheets?.map((sheet) => (
                      <SelectItem key={sheet.id} value={sheet.id}>
                        {sheet.product_name} (v{sheet.version})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="language">Langue *</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, language: value }))
                  }
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARTON_LABEL_LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.language !== 'fr' && (
                  <p className="text-xs text-muted-foreground">
                    L'étiquette sera créée en <strong>brouillon</strong>. Vous pourrez traduire la liste INCO et les consignes avant de la valider.
                  </p>
                )}
              </div>
            )}


            <div className="space-y-2">
              <Label htmlFor="label_title">Titre de l'étiquette *</Label>
              <Input
                id="label_title"
                value={formData.label_title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, label_title: e.target.value }))
                }
                placeholder="Ex: Croissant Beurre CT12"
                required
              />
              <p className="text-xs text-muted-foreground">
                Désignation commerciale spécifique pour l'étiquette carton
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.label_title || (mode === 'create' && !formData.product_sheet_id)}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'create' ? 'Créer' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
