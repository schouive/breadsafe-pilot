import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  Thermometer, 
  Camera, 
  Package, 
  Truck,
  FileText,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Pencil
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ControlRecordFromDB, useDeleteControlRecord } from '@/hooks/useControlRecords';
import { CONTROL_POINTS } from '@/types/haccp';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface ControlDetailModalProps {
  record: ControlRecordFromDB | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (record: ControlRecordFromDB) => void;
}

const statusConfig = {
  conforme: {
    label: 'Conforme',
    icon: CheckCircle,
    class: 'bg-success/10 text-success border-success/20',
  },
  acceptable: {
    label: 'Acceptable',
    icon: AlertTriangle,
    class: 'bg-warning/10 text-warning border-warning/20',
  },
  nonconforme: {
    label: 'Non-conforme',
    icon: XCircle,
    class: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  pending: {
    label: 'En attente',
    icon: AlertCircle,
    class: 'bg-muted text-muted-foreground border-muted',
  },
};

export function ControlDetailModal({ record, isOpen, onClose, onEdit }: ControlDetailModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const deleteRecord = useDeleteControlRecord();
  
  // Minimum swipe distance to trigger navigation (in pixels)
  const minSwipeDistance = 50;

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const goToPrevious = useCallback(() => {
    if (record?.photos && record.photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev === 0 ? record.photos!.length - 1 : prev - 1));
    }
  }, [record?.photos]);

  const goToNext = useCallback(() => {
    if (record?.photos && record.photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev === record.photos!.length - 1 ? 0 : prev + 1));
    }
  }, [record?.photos]);

  // Touch handlers for swipe on the image area only
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && record?.photos && record.photos.length > 1) {
      goToNext();
    }
    if (isRightSwipe && record?.photos && record.photos.length > 1) {
      goToPrevious();
    }
    
    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, record?.photos, goToNext, goToPrevious, minSwipeDistance]);
  
  if (!record) return null;

  const status = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;
  const controlPoint = CONTROL_POINTS.find(cp => cp.code === record.control_point_code);

  const renderDetailItem = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-3 py-2">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );

  const renderBooleanStatus = (value: boolean | null, trueLabel: string, falseLabel: string) => {
    if (value === null) return <span className="text-muted-foreground">-</span>;
    return value ? (
      <span className="text-success flex items-center gap-1">
        <CheckCircle className="h-3.5 w-3.5" /> {trueLabel}
      </span>
    ) : (
      <span className="text-destructive flex items-center gap-1">
        <XCircle className="h-3.5 w-3.5" /> {falseLabel}
      </span>
    );
  };

  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const handleDelete = async () => {
    await deleteRecord.mutateAsync(record.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(record);
      onClose();
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex-row items-center justify-between pr-8">
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon className={cn("h-5 w-5", status.class.split(' ')[1])} />
            {controlPoint?.name || record.control_point_code}
          </DialogTitle>
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status & Date */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={status.class}>
              {status.label}
            </Badge>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(record.timestamp), 'dd MMM yyyy à HH:mm', { locale: fr })}
            </div>
          </div>

          {/* Main Info */}
          <div className="divide-y divide-border">
            {/* Temperature */}
            {record.temperature !== null && renderDetailItem(
              <Thermometer className="h-4 w-4" />,
              'Température relevée',
              <span className="flex items-center gap-2">
                {record.temperature}°C
                {record.temperature_conforme !== null && renderBooleanStatus(
                  record.temperature_conforme, 
                  'Conforme', 
                  'Non conforme'
                )}
              </span>
            )}

            {/* Product */}
            {record.product && renderDetailItem(
              <Package className="h-4 w-4" />,
              'Produit(s)',
              record.product
            )}

            {/* Supplier */}
            {record.supplier && renderDetailItem(
              <Truck className="h-4 w-4" />,
              'Fournisseur',
              record.supplier
            )}

            {/* Lot Number */}
            {record.lot_number && renderDetailItem(
              <FileText className="h-4 w-4" />,
              'Numéro de lot',
              record.lot_number
            )}

            {/* DLC */}
            {record.dlc_date && renderDetailItem(
              <Calendar className="h-4 w-4" />,
              'Date limite de consommation',
              <span className="flex items-center gap-2">
                {format(new Date(record.dlc_date), 'dd/MM/yyyy', { locale: fr })}
                {record.dlc_conforme !== null && renderBooleanStatus(
                  record.dlc_conforme,
                  'Conforme',
                  'Non conforme'
                )}
              </span>
            )}
            {record.dlc_notes && (
              <p className="text-xs text-muted-foreground pl-7 pb-2">{record.dlc_notes}</p>
            )}

            {/* Intégrité */}
            {record.integrite_conforme !== null && renderDetailItem(
              <ShieldCheck className="h-4 w-4" />,
              'Intégrité emballage',
              renderBooleanStatus(record.integrite_conforme, 'Conforme', 'Non conforme')
            )}
            {record.integrite_notes && (
              <p className="text-xs text-muted-foreground pl-7 pb-2">{record.integrite_notes}</p>
            )}

            {/* Allergènes */}
            {record.allergenes_conformes !== null && renderDetailItem(
              <AlertTriangle className="h-4 w-4" />,
              'Allergènes',
              renderBooleanStatus(record.allergenes_conformes, 'Conformes', 'Non conformes')
            )}
            {record.allergenes_notes && (
              <p className="text-xs text-muted-foreground pl-7 pb-2">{record.allergenes_notes}</p>
            )}

            {/* Notes */}
            {record.notes && renderDetailItem(
              <FileText className="h-4 w-4" />,
              'Notes',
              record.notes
            )}
          </div>

          {/* Photos */}
          {record.photos && record.photos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Camera className="h-4 w-4" />
                {record.photos.length} photo{record.photos.length > 1 ? 's' : ''}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {record.photos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => openLightbox(idx)}
                    className="aspect-square rounded-lg overflow-hidden border hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <OptimizedImage
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                      lazy={true}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Lightbox plein écran avec support swipe - utilise un portail pour être hors du Dialog */}
    {lightboxOpen && record.photos && record.photos.length > 0 && createPortal(
      <div 
        className="fixed inset-0 z-[9999] bg-black"
        role="dialog"
        aria-modal="true"
        aria-label="Visionneuse de photos"
        onClick={(e) => {
          // Fermer seulement si on clique sur le fond noir (pas sur les boutons)
          if (e.target === e.currentTarget) {
            closeLightbox();
          }
        }}
      >
        {/* Zone centrale pour l'image et le swipe */}
        <div 
          className="absolute inset-0 flex items-center justify-center p-16"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={(e) => e.stopPropagation()}
        >
          <OptimizedImage
            src={record.photos[currentPhotoIndex]}
            alt={`Photo ${currentPhotoIndex + 1}`}
            className="max-w-full max-h-full object-contain pointer-events-none"
            containerClassName="max-w-full max-h-full flex items-center justify-center"
            lazy={false}
            showPlaceholder={true}
          />
        </div>

        {/* Bouton fermer */}
        <button
          type="button"
          className="absolute top-4 right-4 z-[10001] w-14 h-14 flex items-center justify-center rounded-full bg-black/80 text-white border-2 border-white shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            closeLightbox();
          }}
          aria-label="Fermer"
        >
          <X className="h-7 w-7" />
        </button>

        {/* Navigation précédent */}
        {record.photos.length > 1 && (
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-[10001] w-14 h-14 flex items-center justify-center rounded-full bg-black/80 text-white border-2 border-white shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            aria-label="Photo précédente"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
        )}

        {/* Navigation suivant */}
        {record.photos.length > 1 && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-[10001] w-14 h-14 flex items-center justify-center rounded-full bg-black/80 text-white border-2 border-white shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            aria-label="Photo suivante"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        )}

        {/* Indicateur de position */}
        {record.photos.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[10001] pointer-events-none">
            <div className="text-white text-lg font-medium bg-black/80 px-4 py-2 rounded-full border border-white/30">
              {currentPhotoIndex + 1} / {record.photos.length}
            </div>
          </div>
        )}
      </div>,
      document.body
    )}

    {/* Confirmation de suppression */}
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce contrôle ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Le contrôle et toutes les données associées seront définitivement supprimés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteRecord.isPending ? 'Suppression...' : 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
