import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PendingRecord {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
}

interface OfflineDBSchema extends DBSchema {
  pending_records: {
    key: string;
    value: PendingRecord;
    indexes: { 'by-table': string; 'by-created': number };
  };
  cached_data: {
    key: string;
    value: {
      key: string;
      data: unknown;
      cachedAt: number;
    };
  };
}

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;

export async function getOfflineDb(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDBSchema>('haccp-offline-db', 1, {
    upgrade(db) {
      // Store for pending records to sync
      const pendingStore = db.createObjectStore('pending_records', { keyPath: 'id' });
      pendingStore.createIndex('by-table', 'table');
      pendingStore.createIndex('by-created', 'createdAt');

      // Store for cached data
      db.createObjectStore('cached_data', { keyPath: 'key' });
    },
  });

  return dbInstance;
}

export async function addPendingRecord(
  table: string,
  operation: 'insert' | 'update' | 'delete',
  data: Record<string, unknown>
): Promise<string> {
  const db = await getOfflineDb();
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  const record: PendingRecord = {
    id,
    table,
    operation,
    data,
    createdAt: Date.now(),
    retryCount: 0,
  };

  await db.put('pending_records', record);
  return id;
}

export async function getPendingRecords(): Promise<PendingRecord[]> {
  const db = await getOfflineDb();
  return db.getAllFromIndex('pending_records', 'by-created');
}

export async function removePendingRecord(id: string): Promise<void> {
  const db = await getOfflineDb();
  await db.delete('pending_records', id);
}

export async function updatePendingRecordRetry(id: string): Promise<void> {
  const db = await getOfflineDb();
  const record = await db.get('pending_records', id);
  if (record) {
    record.retryCount += 1;
    await db.put('pending_records', record);
  }
}

export async function getPendingCount(): Promise<number> {
  const db = await getOfflineDb();
  return db.count('pending_records');
}

export async function cacheData(key: string, data: unknown): Promise<void> {
  const db = await getOfflineDb();
  await db.put('cached_data', {
    key,
    data,
    cachedAt: Date.now(),
  });
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await getOfflineDb();
  const cached = await db.get('cached_data', key);
  return cached ? (cached.data as T) : null;
}

export async function clearCachedData(key: string): Promise<void> {
  const db = await getOfflineDb();
  await db.delete('cached_data', key);
}

export async function clearAllPendingRecords(): Promise<void> {
  const db = await getOfflineDb();
  await db.clear('pending_records');
}
