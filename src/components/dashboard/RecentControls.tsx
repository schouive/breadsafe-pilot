import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ControlRecord, CONTROL_POINTS } from '@/types/haccp';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ChevronRight,
  Truck,
  Snowflake,
  Magnet,
  Clock,
  Camera
} from 'lucide-react';
import { ControlDetailModal } from '@/components/controls/ControlDetailModal';
import { ControlRecordFromDB } from '@/hooks/useControlRecords';
import { supabase } from '@/integrations/supabase/client';

interface RecentControlsProps {
  controls: ControlRecord[];
}

const statusIcons = {
  conforme: CheckCircle2,
  acceptable: AlertCircle,
  nonconforme: XCircle,
  pending: AlertCircle,
};

const statusConfig = {
  conforme: {
    label: 'Conforme',
    class: 'bg-success/10 text-success border-success/20',
  },
  acceptable: {
    label: 'Acceptable',
    class: 'bg-warning/10 text-warning border-warning/20',
  },
  nonconforme: {
    label: 'Non-conforme',
    class: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  pending: {
    label: 'En attente',
    class: 'bg-muted text-muted-foreground border-muted',
  },
};

// Icônes par type de contrôle (identiques à ControlPointButton)
const controlTypeIcons: Record<string, React.ElementType> = {
  CP_RECEPTION: Truck,
  CP5_CORPS_ETRANGER: Magnet,
  CP_STOCKAGE: Snowflake,
  CP6_STOCKAGE_POSITIF: Snowflake,
  CP7_STOCKAGE_NEGATIF: Snowflake,
  CP8_DLC_PERIMEE: Clock,
  CP_PRODUCTION: Camera,
};

export function RecentControls({ controls }: RecentControlsProps) {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ControlRecordFromDB | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleControlClick = async (control: ControlRecord) => {
    // For storage controls, we don't have full details in control_records table
    if (control.controlPointCode === 'CP_STOCKAGE') {
      return;
    }

    setIsLoading(true);
    setSelectedRecordId(control.id);

    try {
      const { data, error } = await supabase
        .from('control_records')
        .select('*')
        .eq('id', control.id)
        .single();

      if (error) throw error;
      setSelectedRecord(data as ControlRecordFromDB);
    } catch (error) {
      console.error('Error fetching control details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedRecordId(null);
    setSelectedRecord(null);
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Contrôles récents</h3>
        </div>
        <div className="divide-y divide-border">
          {controls.length === 0 ? (
            <div className="px-5 py-8 text-center text-muted-foreground">
              Aucun contrôle enregistré aujourd'hui
            </div>
          ) : (
            controls.slice(0, 5).map((control) => {
              const cp = CONTROL_POINTS.find(c => c.code === control.controlPointCode);
              const StatusIcon = statusIcons[control.status];
              const status = statusConfig[control.status];
              const isClickable = control.controlPointCode !== 'CP_STOCKAGE';
              
              // Display name: for storage controls show cold room name, otherwise control point name
              const displayName = control.coldRoomName 
                ? `Stockage - ${control.coldRoomName}`
                : (cp?.name || control.controlPointCode);
              
              const ControlTypeIcon = controlTypeIcons[control.controlPointCode as keyof typeof controlTypeIcons] || AlertCircle;
              
              return (
                <div 
                  key={control.id} 
                  onClick={() => isClickable && handleControlClick(control)}
                  className={cn(
                    "px-4 py-3 flex items-center gap-3 transition-all rounded-lg mx-2 my-1 border",
                    status.class,
                    isClickable && "cursor-pointer hover:shadow-md"
                  )}
                >
                  {/* Icône de statut */}
                  <StatusIcon className="h-5 w-5 shrink-0" />
                  
                  {/* Icône du type de contrôle */}
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg flex-shrink-0 bg-background/50">
                    <ControlTypeIcon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {displayName}
                    </p>
                    <p className="text-xs opacity-70 mt-0.5">
                      {control.operatorName} • {formatDistanceToNow(control.timestamp, { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </p>
                  </div>

                  {control.value !== undefined && (
                    <span className="text-sm font-medium">
                      {control.value}
                      {(control.controlPointCode === 'CP_STOCKAGE' || control.controlPointCode === 'CP_RECEPTION') && '°C'}
                    </span>
                  )}

                  {isClickable && (
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <ControlDetailModal
        record={selectedRecord}
        isOpen={selectedRecordId !== null}
        onClose={handleCloseModal}
      />
    </>
  );
}
