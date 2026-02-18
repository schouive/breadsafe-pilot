import { CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MetalDetectorStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  valid: { label: 'Valide', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/30' },
  pending: { label: 'En attente', icon: Clock, className: 'bg-warning/10 text-warning border-warning/30' },
  deviation: { label: 'Déviation', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export function MetalDetectorStatusBadge({ status, className }: MetalDetectorStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
