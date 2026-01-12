import { cn } from '@/lib/utils';
import { ControlPoint } from '@/types/haccp';
import { 
  Thermometer, 
  Package, 
  CalendarClock, 
  AlertCircle, 
  Magnet, 
  Snowflake,
  ThermometerSnowflake,
  Clock,
  Truck
} from 'lucide-react';
import iconBread from '@/assets/icon-bread.jpeg';

interface ControlPointButtonProps {
  controlPoint: ControlPoint;
  onClick: (cp: ControlPoint) => void;
}

const iconMap: Record<string, React.ElementType | null> = {
  'CP_RECEPTION': Truck,
  'CP1_TEMPERATURE_REFRIGERE': Thermometer,
  'CP2_INTEGRITE': Package,
  'CP3_DLC': CalendarClock,
  'CP4_ALLERGENES': AlertCircle,
  'CP5_CORPS_ETRANGER': Magnet,
  'CP6_STOCKAGE_POSITIF': Snowflake,
  'CP7_STOCKAGE_NEGATIF': ThermometerSnowflake,
  'CP8_DLC_PERIMEE': Clock,
  'CP_STOCKAGE': Snowflake,
  'CP_PRODUCTION': null, // Use custom bread icon
};

const colorMap: Record<string, string> = {
  'CP_RECEPTION': 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20',
  'CP5_CORPS_ETRANGER': 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20',
  'CP_STOCKAGE': 'bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 border-cyan-500/20',
  'CP6_STOCKAGE_POSITIF': 'bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 border-teal-500/20',
  'CP7_STOCKAGE_NEGATIF': 'bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 border-indigo-500/20',
  'CP8_DLC_PERIMEE': 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20',
  'CP_PRODUCTION': 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20',
};

export function ControlPointButton({ controlPoint, onClick }: ControlPointButtonProps) {
  const Icon = iconMap[controlPoint.code];
  const colorClass = colorMap[controlPoint.code] || 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20';
  const isProduction = controlPoint.code === 'CP_PRODUCTION';

  return (
    <button
      onClick={() => onClick(controlPoint)}
      className={cn(
        "aspect-square flex flex-col items-center justify-center gap-3 p-4",
        "rounded-2xl border-2 transition-all duration-200",
        "hover:scale-105 hover:shadow-lg active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        colorClass
      )}
    >
      <div className="p-3 rounded-xl bg-background/50">
        {isProduction ? (
          <img src={iconBread} alt="Production" className="h-8 w-8 object-contain" />
        ) : Icon ? (
          <Icon className="h-8 w-8" />
        ) : (
          <AlertCircle className="h-8 w-8" />
        )}
      </div>
      <span className="text-sm font-semibold text-center leading-tight">
        {controlPoint.name}
      </span>
    </button>
  );
}
