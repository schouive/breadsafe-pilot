import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  Thermometer,
  Snowflake,
  FileText,
  Trash2,
  Pencil
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StorageTemperatureRecordWithRoom, useDeleteStorageTemperatureRecord } from '@/hooks/useColdRooms';

interface StorageRecordDetailModalProps {
  record: StorageTemperatureRecordWithRoom | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (record: StorageTemperatureRecordWithRoom) => void;
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
};

export function StorageRecordDetailModal({ record, isOpen, onClose, onEdit }: StorageRecordDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteRecord = useDeleteStorageTemperatureRecord();
  
  if (!record) return null;

  const status = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.conforme;
  const StatusIcon = status.icon;

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
        <DialogContent className="max-w-lg">
          <DialogHeader className="flex-row items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Relevé de température
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
                <StatusIcon className="h-3.5 w-3.5 mr-1" />
                {status.label}
              </Badge>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(record.recorded_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
              </div>
            </div>

            {/* Temperature */}
            <div className="flex items-center gap-3 py-2 border-b">
              <Thermometer className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Température relevée</p>
                <p className="text-lg font-semibold">{record.temperature}°C</p>
              </div>
            </div>

            {/* Cold Room */}
            {record.cold_rooms && (
              <div className="flex items-center gap-3 py-2 border-b">
                <Snowflake className={cn(
                  "h-4 w-4",
                  record.cold_rooms.type === 'negatif' ? 'text-blue-500' : 'text-cyan-500'
                )} />
                <div>
                  <p className="text-xs text-muted-foreground">Chambre froide</p>
                  <p className="text-sm font-medium">{record.cold_rooms.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Plage: {record.cold_rooms.temp_min}°C à {record.cold_rooms.temp_max}°C
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            {record.notes && (
              <div className="flex items-start gap-3 py-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{record.notes}</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation de suppression */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce relevé ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le relevé de température sera définitivement supprimé.
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
