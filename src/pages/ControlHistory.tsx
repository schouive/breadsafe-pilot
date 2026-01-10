import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, User, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ControlForm } from '@/components/controls/ControlForm';
import { ReceptionControlForm } from '@/components/controls/ReceptionControlForm';
import { StorageControlForm, StorageFormData } from '@/components/controls/StorageControlForm';
import { CONTROL_POINTS, ControlPoint, ControlStatus } from '@/types/haccp';
import { useAuth } from '@/hooks/useAuth';
import { useControlRecordsByCode, useCreateControlRecord, useCreateReceptionControl, ReceptionFormData } from '@/hooks/useControlRecords';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
    icon: Calendar,
    class: 'bg-muted text-muted-foreground border-muted',
  },
};

export default function ControlHistory() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReceptionFormOpen, setIsReceptionFormOpen] = useState(false);
  const [isStorageFormOpen, setIsStorageFormOpen] = useState(false);

  const controlPoint = CONTROL_POINTS.find(cp => cp.code === code);
  const { data: records, isLoading } = useControlRecordsByCode(code || '');
  const createControlRecord = useCreateControlRecord();
  const createReceptionControl = useCreateReceptionControl();

  if (!controlPoint) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Point de contrôle non trouvé</p>
        <Button onClick={() => navigate('/controls')} className="mt-4">
          Retour aux contrôles
        </Button>
      </div>
    );
  }

  const handleNewControl = () => {
    if (controlPoint.code === 'CP_RECEPTION') {
      setIsReceptionFormOpen(true);
    } else if (controlPoint.code === 'CP_STOCKAGE') {
      setIsStorageFormOpen(true);
    } else {
      setIsFormOpen(true);
    }
  };

  const handleSubmitControl = async (data: {
    status: ControlStatus;
    value?: number;
    notes?: string;
  }) => {
    if (!user || !controlPoint) return;

    createControlRecord.mutate({
      control_point_code: controlPoint.code as any,
      operator_id: user.id,
      status: data.status,
      temperature: data.value,
      notes: data.notes,
    });
  };

  const handleSubmitReceptionControl = async (data: ReceptionFormData) => {
    if (!user) return;
    createReceptionControl.mutate({
      userId: user.id,
      data,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/controls')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{controlPoint.name}</h1>
            <p className="text-muted-foreground mt-1">
              {controlPoint.description}
            </p>
          </div>
        </div>
        <Button onClick={handleNewControl} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau contrôle
        </Button>
      </div>

      {/* History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Historique des contrôles</h2>
        
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : records && records.length > 0 ? (
          <div className="grid gap-3">
            {records.map((record) => {
              const status = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = status.icon;
              
              return (
                <Card key={record.id} className={cn("p-4 border", status.class)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <StatusIcon className="h-5 w-5 mt-0.5 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={status.class}>
                            {status.label}
                          </Badge>
                          {record.temperature !== null && (
                            <span className="text-sm font-medium">
                              {record.temperature}°C
                            </span>
                          )}
                        </div>
                        {record.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {record.notes}
                          </p>
                        )}
                        {record.product && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Produit: {record.product}
                          </p>
                        )}
                        {record.supplier && (
                          <p className="text-sm text-muted-foreground">
                            Fournisseur: {record.supplier}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground shrink-0">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(record.timestamp), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <div className="mt-0.5">
                        {format(new Date(record.timestamp), 'HH:mm', { locale: fr })}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
            <p className="text-muted-foreground">Aucun contrôle enregistré</p>
            <Button onClick={handleNewControl} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Effectuer le premier contrôle
            </Button>
          </div>
        )}
      </div>

      {/* Forms */}
      <ControlForm
        controlPoint={controlPoint}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmitControl}
      />

      <ReceptionControlForm
        controlPoint={controlPoint}
        isOpen={isReceptionFormOpen}
        onClose={() => setIsReceptionFormOpen(false)}
        onSubmit={handleSubmitReceptionControl}
      />

      <StorageControlForm
        controlPoint={controlPoint}
        isOpen={isStorageFormOpen}
        onClose={() => setIsStorageFormOpen(false)}
        onSubmit={(data: StorageFormData) => {
          console.log('Storage control saved:', data);
        }}
      />
    </div>
  );
}
