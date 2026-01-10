import { cn } from '@/lib/utils';
import { ControlPoint, ControlStatus } from '@/types/haccp';
import { 
  Thermometer, 
  Package, 
  CalendarClock, 
  AlertCircle, 
  Magnet, 
  Snowflake,
  ThermometerSnowflake,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ControlPointCardProps {
  controlPoint: ControlPoint;
  lastStatus?: ControlStatus;
  lastControlTime?: string;
  onStartControl: (cp: ControlPoint) => void;
}

const iconMap: Record<string, React.ElementType> = {
  'CP1_TEMPERATURE_REFRIGERE': Thermometer,
  'CP2_INTEGRITE': Package,
  'CP3_DLC': CalendarClock,
  'CP4_ALLERGENES': AlertCircle,
  'CP5_CORPS_ETRANGER': Magnet,
  'CP6_STOCKAGE_POSITIF': Snowflake,
  'CP7_STOCKAGE_NEGATIF': ThermometerSnowflake,
  'CP8_DLC_PERIMEE': Clock,
};

const statusConfig = {
  conforme: {
    label: 'Conforme',
    class: 'status-conforme',
  },
  acceptable: {
    label: 'Acceptable',
    class: 'status-acceptable',
  },
  nonconforme: {
    label: 'Non-conforme',
    class: 'status-nonconforme',
  },
  pending: {
    label: 'En attente',
    class: 'bg-muted text-muted-foreground',
  },
};

export function ControlPointCard({ 
  controlPoint, 
  lastStatus = 'pending', 
  lastControlTime,
  onStartControl 
}: ControlPointCardProps) {
  const Icon = iconMap[controlPoint.code] || AlertCircle;
  const status = statusConfig[lastStatus];

  return (
    <div className="bg-card rounded-xl border border-border p-5 card-interactive">
      <div className="flex items-start gap-4">
        <div className={cn(
          "flex items-center justify-center h-12 w-12 rounded-xl flex-shrink-0",
          lastStatus === 'conforme' ? 'bg-success/10 text-success' :
          lastStatus === 'acceptable' ? 'bg-warning/10 text-warning' :
          lastStatus === 'nonconforme' ? 'bg-destructive/10 text-destructive' :
          'bg-primary/10 text-primary'
        )}>
          <Icon className="h-6 w-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground leading-tight">
                {controlPoint.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {controlPoint.description}
              </p>
            </div>
            <Badge className={cn("flex-shrink-0", status.class)}>
              {status.label}
            </Badge>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex flex-col text-xs text-muted-foreground">
              <span>Fréquence: {controlPoint.frequency}</span>
              {lastControlTime && (
                <span className="mt-0.5">Dernier: {lastControlTime}</span>
              )}
            </div>
            <Button 
              onClick={() => onStartControl(controlPoint)}
              size="sm"
              className="touch-target min-h-[40px]"
            >
              Nouveau contrôle
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
