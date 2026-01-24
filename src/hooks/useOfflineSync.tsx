import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  getPendingRecords, 
  removePendingRecord, 
  updatePendingRecordRetry,
  getPendingCount,
  addPendingRecord 
} from '@/lib/offlineDb';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const syncInProgress = useRef(false);

  const updatePendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const syncPendingRecords = useCallback(async () => {
    if (syncInProgress.current || !isOnline) return;
    
    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      const pendingRecords = await getPendingRecords();
      
      if (pendingRecords.length === 0) {
        setIsSyncing(false);
        syncInProgress.current = false;
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const record of pendingRecords) {
        try {
          const tableName = record.table as 'control_records' | 'storage_temperature_records' | 'non_conformities';
          
          if (record.operation === 'insert') {
            const { error } = await supabase
              .from(tableName)
              .insert(record.data as any);
            
            if (error) throw error;
          } else if (record.operation === 'update') {
            const { id, ...updateData } = record.data;
            const { error } = await supabase
              .from(tableName)
              .update(updateData as any)
              .eq('id', id as string);
            
            if (error) throw error;
          } else if (record.operation === 'delete') {
            const { error } = await supabase
              .from(tableName)
              .delete()
              .eq('id', record.data.id as string);
            
            if (error) throw error;
          }

          await removePendingRecord(record.id);
          successCount++;
        } catch (error) {
          console.error('Sync error for record:', record.id, error);
          
          if (record.retryCount >= 3) {
            // Remove after too many retries
            await removePendingRecord(record.id);
            errorCount++;
          } else {
            await updatePendingRecordRetry(record.id);
          }
        }
      }

      await updatePendingCount();

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['control_records'] });
      queryClient.invalidateQueries({ queryKey: ['storage_temperature_records'] });
      queryClient.invalidateQueries({ queryKey: ['non_conformities'] });

      if (successCount > 0) {
        toast.success(`${successCount} enregistrement(s) synchronisé(s)`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} enregistrement(s) n'ont pas pu être synchronisés`);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }, [isOnline, queryClient, updatePendingCount]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncPendingRecords();
    }
  }, [isOnline, syncPendingRecords]);

  // Update pending count on mount
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  // Periodic sync attempt
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      syncPendingRecords();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, syncPendingRecords]);

  const queueRecord = useCallback(async (
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: Record<string, unknown>
  ) => {
    await addPendingRecord(table, operation, data);
    await updatePendingCount();
  }, [updatePendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncPendingRecords,
    queueRecord,
  };
}
