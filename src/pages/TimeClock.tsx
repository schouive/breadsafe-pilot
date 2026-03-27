import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { useBadgeScan } from '@/hooks/useBadgeScan';
import { SilentCamera } from '@/components/time-clock/SilentCamera';
import {
  useEmployeeByBadge,
  useLastTimeEvent,
  useRecordTimeEvent,
  TimeEventType,
} from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  LogIn,
  LogOut,
  Coffee,
  CoffeeIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Scan,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

type KioskState = 'idle' | 'identified' | 'confirmed' | 'error';

const EVENT_LABELS: Record<TimeEventType, string> = {
  clock_in: 'Entrée',
  clock_out: 'Sortie',
  break_start: 'Début pause',
  break_end: 'Fin pause',
};

const EVENT_ICONS: Record<TimeEventType, React.ComponentType<{ className?: string }>> = {
  clock_in: LogIn,
  clock_out: LogOut,
  break_start: Coffee,
  break_end: CoffeeIcon,
};

const EVENT_COLORS: Record<TimeEventType, string> = {
  clock_in: 'bg-green-500 hover:bg-green-600',
  clock_out: 'bg-red-500 hover:bg-red-600',
  break_start: 'bg-amber-500 hover:bg-amber-600',
  break_end: 'bg-blue-500 hover:bg-blue-600',
};

function getDeviceId(): string {
  let deviceId = localStorage.getItem('time-clock-device-id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('time-clock-device-id', deviceId);
  }
  return deviceId;
}

export default function TimeClock() {
  const navigate = useNavigate();
  const [state, setState] = useState<KioskState>('idle');
  const [employee, setEmployee] = useState<{
    id: string;
    full_name: string;
    badge_id: string;
    photo_url?: string | null;
    avatar_url?: string | null;
  } | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [captureTrigger, setCaptureTrigger] = useState(false);
  const pendingActionRef = useRef<{ eventType: TimeEventType } | null>(null);

  const findEmployee = useEmployeeByBadge();
  const recordEvent = useRecordTimeEvent();
  const { data: lastEvent } = useLastTimeEvent(employee?.id ?? null);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-reset to idle after confirmation
  useEffect(() => {
    if (state === 'confirmed' || state === 'error') {
      const timer = setTimeout(() => {
        setState('idle');
        setEmployee(null);
        setConfirmMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const handleScan = useCallback(
    async (result: { badgeId: string; scanSpeedMs: number }) => {
      if (state !== 'idle') return;

      try {
        const emp = await findEmployee.mutateAsync(result.badgeId);
        if (!emp) {
          setState('error');
          setConfirmMessage('Badge non reconnu');
          return;
        }
        setEmployee({
          id: emp.id,
          full_name: emp.full_name,
          badge_id: emp.badge_id || result.badgeId,
          photo_url: emp.photo_url,
          avatar_url: emp.avatar_url,
        });
        setState('identified');
      } catch {
        setState('error');
        setConfirmMessage('Erreur lors de la lecture du badge');
      }
    },
    [state, findEmployee]
  );

  const [manualMode, setManualMode] = useState(false);
  const [manualBadgeId, setManualBadgeId] = useState('');

  const { error: scanError, clearError } = useBadgeScan({
    enabled: state === 'idle' && !manualMode,
    onScan: handleScan,
  });

  const handleManualSubmit = () => {
    if (!manualBadgeId.trim()) return;
    handleScan({ badgeId: manualBadgeId.trim(), scanSpeedMs: 0 });
    setManualBadgeId('');
    setManualMode(false);
  };

  useEffect(() => {
    if (scanError) {
      setState('error');
      setConfirmMessage(scanError);
    }
  }, [scanError]);

  const getAvailableActions = (): TimeEventType[] => {
    if (!lastEvent) return ['clock_in'];
    switch (lastEvent.event_type) {
      case 'clock_in':
      case 'break_end':
        return ['break_start', 'clock_out'];
      case 'break_start':
        return ['break_end'];
      case 'clock_out':
        return ['clock_in'];
      default:
        return ['clock_in'];
    }
  };

  const handleAction = async (eventType: TimeEventType) => {
    if (!employee) return;
    // Store the pending action and trigger a silent photo capture
    pendingActionRef.current = { eventType };
    setCaptureTrigger(true);
  };

  const handlePhotoCaptured = async (photoUrl: string | null) => {
    setCaptureTrigger(false);
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    if (!employee || !pending) return;

    try {
      await recordEvent.mutateAsync({
        employeeId: employee.id,
        badgeId: employee.badge_id,
        eventType: pending.eventType,
        deviceId: getDeviceId(),
        photoUrl,
      });
      setConfirmMessage(`${EVENT_LABELS[pending.eventType]} enregistrée`);
      setState('confirmed');
    } catch {
      setState('error');
      setConfirmMessage("Erreur lors de l'enregistrement");
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Silent camera for automatic photo capture */}
      <SilentCamera trigger={captureTrigger} onCapture={handlePhotoCaptured} />
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Pointage</h1>
            <p className="text-sm text-muted-foreground">Badgeuse RFID</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-foreground tabular-nums">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-sm text-muted-foreground">
            {format(currentTime, 'EEEE d MMMM yyyy', { locale: fr })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        {/* IDLE STATE */}
        {state === 'idle' && (
          <div className="text-center space-y-8 max-w-lg">
            <div className="mx-auto w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Scan className="h-16 w-16 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Scannez votre badge
              </h2>
              <p className="text-lg text-muted-foreground">
                Approchez votre badge RFID du lecteur
              </p>
            </div>
            {!manualMode ? (
              <>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">En attente de scan...</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManualMode(true)}
                  className="text-xs"
                >
                  Mode test : saisie manuelle
                </Button>
              </>
            ) : (
              <div className="space-y-3 w-full max-w-xs mx-auto">
                <Input
                  autoFocus
                  placeholder="Entrez le badge ID..."
                  value={manualBadgeId}
                  onChange={(e) => setManualBadgeId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  className="text-center text-lg h-12"
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setManualMode(false)}>
                    Annuler
                  </Button>
                  <Button className="flex-1" onClick={handleManualSubmit}>
                    Valider
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* IDENTIFIED STATE */}
        {state === 'identified' && employee && (
          <Card className="w-full max-w-lg p-8 space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={employee.photo_url || employee.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {getInitials(employee.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{employee.full_name}</h2>
                <Badge variant="outline" className="mt-1">
                  Badge: {employee.badge_id}
                </Badge>
              </div>
            </div>

            {lastEvent && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                Dernier événement : <strong>{EVENT_LABELS[lastEvent.event_type as TimeEventType]}</strong>
                {' '}à{' '}
                {format(new Date(lastEvent.recorded_at), 'HH:mm', { locale: fr })}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Choisissez une action :</p>
              <div className="grid grid-cols-1 gap-3">
                {getAvailableActions().map((eventType) => {
                  const Icon = EVENT_ICONS[eventType];
                  return (
                    <Button
                      key={eventType}
                      onClick={() => handleAction(eventType)}
                      disabled={recordEvent.isPending}
                      className={cn(
                        'h-16 text-lg font-semibold text-white',
                        EVENT_COLORS[eventType]
                      )}
                    >
                      <Icon className="h-6 w-6 mr-3" />
                      {EVENT_LABELS[eventType]}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setState('idle');
                setEmployee(null);
              }}
            >
              Annuler
            </Button>
          </Card>
        )}

        {/* CONFIRMED STATE */}
        {state === 'confirmed' && (
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">{confirmMessage}</h2>
              {employee && (
                <p className="text-lg text-muted-foreground mt-2">{employee.full_name}</p>
              )}
              <p className="text-xl font-mono text-foreground mt-2">
                {format(currentTime, 'HH:mm:ss')}
              </p>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {state === 'error' && (
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{confirmMessage}</h2>
              <p className="text-muted-foreground mt-2">
                Réessayez ou contactez un responsable
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setState('idle');
                setEmployee(null);
                setConfirmMessage('');
                clearError();
              }}
            >
              Retour
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
