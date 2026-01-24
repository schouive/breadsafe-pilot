import { WifiOff, CloudUpload, Loader2 } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, syncPendingRecords } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {!isOnline && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-2 rounded-full shadow-lg">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium">Hors ligne</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Les données seront synchronisées au retour de la connexion</p>
          </TooltipContent>
        </Tooltip>
      )}

      {pendingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full shadow-lg gap-2"
              onClick={() => isOnline && syncPendingRecords()}
              disabled={!isOnline || isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4" />
              )}
              <Badge variant="outline" className="ml-1">
                {pendingCount}
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isSyncing 
                ? 'Synchronisation en cours...' 
                : `${pendingCount} enregistrement(s) en attente de synchronisation`}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
