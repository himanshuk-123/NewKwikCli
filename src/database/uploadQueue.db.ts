import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'failed'
  | 'failed_permanent'
  | 'completed';

export interface UploadQueueDBItem {
  id: string;
  type: 'image' | 'video';
  fileUri: string;
  leadId: string;
  paramName: string;
  vehicleType: string;
  geoLat: string;
  geoLong: string;
  geoTime: string;
  status: UploadStatus;
  retryCount: number;
  createdAt: number;
}

const DB_NAME = 'upload_queue.db';
const TABLE_NAME = 'upload_queue';

let db: SQLite.SQLiteDatabase | null = null;

/* ===================== INIT ===================== */

export const initUploadQueueDB = async (): Promise<void> => {
  if (db) return;

  db = await SQLite.openDatabase({
    name: DB_NAME,
    location: 'default',
  });

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      file_uri TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      param_name TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      geo_lat TEXT,
      geo_long TEXT,
      geo_time TEXT,
      status TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
};

/* ===================== INSERT ===================== */

export const insertQueueItem = async (item: UploadQueueDBItem): Promise<void> => {
  if (!db) throw new Error('DB not initialized');

  const {
    id,
    type,
    fileUri,
    leadId,
    paramName,
    vehicleType,
    geoLat,
    geoLong,
    geoTime,
    status,
    retryCount,
    createdAt,
  } = item;

  await db.executeSql(
    `
    INSERT INTO ${TABLE_NAME}
    (
      id, type, file_uri, lead_id, param_name,
      vehicle_type, geo_lat, geo_long, geo_time,
      status, retry_count, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      type,
      fileUri,
      leadId,
      paramName,
      vehicleType,
      geoLat,
      geoLong,
      geoTime,
      status,
      retryCount,
      createdAt,
    ]
  );
};

/* ===================== FETCH ===================== */

export const getPendingQueueItems = async (): Promise<UploadQueueDBItem[]> => {
  if (!db) throw new Error('DB not initialized');

  const [result] = await db.executeSql(
    `
    SELECT * FROM ${TABLE_NAME}
    WHERE status IN ('pending', 'failed')
    ORDER BY created_at ASC;
    `
  );

  const rows = result.rows;
  const items: UploadQueueDBItem[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows.item(i);
    items.push({
      id: r.id,
      type: r.type,
      fileUri: r.file_uri,
      leadId: r.lead_id,
      paramName: r.param_name,
      vehicleType: r.vehicle_type,
      geoLat: r.geo_lat,
      geoLong: r.geo_long,
      geoTime: r.geo_time,
      status: r.status,
      retryCount: r.retry_count,
      createdAt: r.created_at,
    });
  }

  return items;
};

/* ===================== UPDATE ===================== */

export const updateQueueStatus = async (
  id: string,
  status: UploadStatus,
  retryCount?: number
): Promise<void> => {
  if (!db) throw new Error('DB not initialized');

  if (retryCount !== undefined) {
    await db.executeSql(
      `
      UPDATE ${TABLE_NAME}
      SET status = ?, retry_count = ?
      WHERE id = ?;
      `,
      [status, retryCount, id]
    );
  } else {
    await db.executeSql(
      `
      UPDATE ${TABLE_NAME}
      SET status = ?
      WHERE id = ?;
      `,
      [status, id]
    );
  }
};

/* ===================== DELETE ===================== */

export const deleteQueueItem = async (id: string): Promise<void> => {
  if (!db) throw new Error('DB not initialized');

  await db.executeSql(
    `
    DELETE FROM ${TABLE_NAME}
    WHERE id = ?;
    `,
    [id]
  );
};

/* ===================== COUNT ===================== */

export const getQueueCount = async (): Promise<number> => {
  if (!db) throw new Error('DB not initialized');

  const [result] = await db.executeSql(
    `
    SELECT COUNT(*) as count FROM ${TABLE_NAME}
    WHERE status IN ('pending', 'failed', 'uploading');
    `
  );

  return result.rows.item(0).count || 0;
};

/**
 * Get ALL items in queue regardless of status (for debugging)
 */
export const getAllQueueItems = async (): Promise<UploadQueueDBItem[]> => {
  if (!db) throw new Error('DB not initialized');

  try {
    const [result] = await db.executeSql(
      `SELECT * FROM ${TABLE_NAME} ORDER BY created_at DESC;`
    );

    const items: UploadQueueDBItem[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const r = result.rows.item(i);
      items.push({
        id: r.id,
        type: r.type,
        fileUri: r.file_uri,
        leadId: r.lead_id,
        paramName: r.param_name,
        vehicleType: r.vehicle_type,
        geoLat: r.geo_lat,
        geoLong: r.geo_long,
        geoTime: r.geo_time,
        status: r.status,
        retryCount: r.retry_count,
        createdAt: r.created_at,
      });
    }
    return items;
  } catch (error) {
    console.error('[DB] getAllQueueItems error:', error);
    return [];
  }
};
/**
 * Reset all failed_permanent items to pending so they can be retried
 * Call this when resuming uploads to give failed items another chance
 */
export const resetFailedPermanentItems = async (): Promise<number> => {
  if (!db) throw new Error('DB not initialized');

  try {
    await db.executeSql(
      `
      UPDATE ${TABLE_NAME}
      SET status = 'pending', retry_count = 0
      WHERE status = 'failed_permanent';
      `
    );

    // Get the count of reset items
    const [result] = await db.executeSql(
      `SELECT COUNT(*) as count FROM ${TABLE_NAME} WHERE status = 'pending';`
    );

    const count = result.rows.item(0).count || 0;
    return count;
  } catch (error) {
    console.error('[DB] resetFailedPermanentItems error:', error);
    return 0;
  }
};

/**
 * Mark an item as permanently failed when its file is deleted/orphaned
 * These items won't be retried since the file cannot be recovered
 */
export const markItemAsOrphaned = async (id: string): Promise<void> => {
  if (!db) throw new Error('DB not initialized');

  try {
    await db.executeSql(
      `
      UPDATE ${TABLE_NAME}
      SET status = 'failed_permanent', retry_count = 99
      WHERE id = ?;
      `,
      [id]
    );
    console.log(`[DB] Marked item ${id} as orphaned (file deleted)`);
  } catch (error) {
    console.error('[DB] markItemAsOrphaned error:', error);
  }
};

/**
 * Check if a file URI already has a queue entry
 * Used to prevent duplicate queue entries when discovering orphaned files
 */
export const getQueueItemByFileUri = async (fileUri: string): Promise<UploadQueueDBItem | null> => {
  if (!db) throw new Error('DB not initialized');

  try {
    const [result] = await db.executeSql(
      `
      SELECT * FROM ${TABLE_NAME}
      WHERE file_uri = ? AND status NOT IN ('completed', 'failed_permanent')
      LIMIT 1;
      `,
      [fileUri]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const r = result.rows.item(0);
    return {
      id: r.id,
      type: r.type,
      fileUri: r.file_uri,
      leadId: r.lead_id,
      paramName: r.param_name,
      vehicleType: r.vehicle_type,
      geoLat: r.geo_lat,
      geoLong: r.geo_long,
      geoTime: r.geo_time,
      status: r.status,
      retryCount: r.retry_count,
      createdAt: r.created_at,
    };
  } catch (error) {
    console.error('[DB] getQueueItemByFileUri error:', error);
    return null;
  }
};