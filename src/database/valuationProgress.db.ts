import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export interface ValuationProgressItem {
  id: string;
  leadId: string;
  regNo: string;
  prospectNo: string;
  vehicleType: string;
  totalCount: number;
  uploadedCount: number;
  lastValuated: string;
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = 'valuation_progress.db';
const TABLE_NAME = 'valuation_progress';
const CAPTURED_MEDIA_TABLE = 'valuation_captured_media';

let db: SQLite.SQLiteDatabase | null = null;

/* ===================== INIT ===================== */

export const initValuationProgressDB = async (): Promise<void> => {
  if (db) return;

  db = await SQLite.openDatabase({
    name: DB_NAME,
    location: 'default',
  });

  // Create tables
  await createTables();
};

const createTables = async (): Promise<void> => {
  if (!db) throw new Error('DB not initialized');

  try {
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id TEXT PRIMARY KEY,
        leadId TEXT NOT NULL UNIQUE,
        regNo TEXT,
        prospectNo TEXT,
        vehicleType TEXT,
        totalCount INTEGER DEFAULT 0,
        uploadedCount INTEGER DEFAULT 0,
        lastValuated TEXT,
        createdAt INTEGER,
        updatedAt INTEGER
      );
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS ${CAPTURED_MEDIA_TABLE} (
        id TEXT PRIMARY KEY,
        leadId TEXT NOT NULL,
        side TEXT NOT NULL,
        localUri TEXT NOT NULL,
        uploadStatus TEXT DEFAULT 'pending',
        createdAt INTEGER,
        updatedAt INTEGER,
        uploadedAt INTEGER,
        UNIQUE(leadId, side)
      );
    `);

    // Migration: Add missing columns if they don't exist
    try {
      await db.executeSql(`ALTER TABLE ${CAPTURED_MEDIA_TABLE} ADD COLUMN uploadStatus TEXT DEFAULT 'pending';`);
      console.log('[DB] Added uploadStatus column to captured_media table');
    } catch (e) {
      console.log('[DB] uploadStatus column already exists or migration skipped');
    }

    try {
      await db.executeSql(`ALTER TABLE ${CAPTURED_MEDIA_TABLE} ADD COLUMN uploadedAt INTEGER;`);
      console.log('[DB] Added uploadedAt column to captured_media table');
    } catch (e) {
      console.log('[DB] uploadedAt column already exists or migration skipped');
    }

    console.log('[DB] Valuation progress tables created/migrated');
  } catch (error) {
    console.error('[DB] createTables error:', error);
  }
};

const ensureDbInitialized = async (): Promise<void> => {
  if (!db) {
    await initValuationProgressDB();
  }
};

export interface CapturedMediaItem {
  leadId: string;
  side: string;
  localUri: string;
  uploadStatus: 'pending' | 'uploaded' | 'failed';
  updatedAt: number;
  uploadedAt?: number;
}

export const upsertCapturedMedia = async (
  leadId: string,
  side: string,
  localUri: string,
  uploadStatus: 'pending' | 'uploaded' | 'failed' = 'pending'
): Promise<void> => {
  await ensureDbInitialized();
  if (!db) throw new Error('DB not initialized');

  const now = Date.now();
  const id = `${leadId}-${side}`;

  try {
    await db.executeSql(
      `
      INSERT OR REPLACE INTO ${CAPTURED_MEDIA_TABLE}
      (id, leadId, side, localUri, uploadStatus, createdAt, updatedAt, uploadedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [id, leadId, side, localUri, uploadStatus, now, now, uploadStatus === 'uploaded' ? now : null]
    );
  } catch (error) {
    console.error('[DB] upsertCapturedMedia error:', error);
    throw error;
  }
};

export const markMediaAsUploaded = async (
  leadId: string,
  side: string
): Promise<void> => {
  await ensureDbInitialized();
  if (!db) throw new Error('DB not initialized');

  const now = Date.now();

  try {
    await db.executeSql(
      `
      UPDATE ${CAPTURED_MEDIA_TABLE}
      SET uploadStatus = 'uploaded', uploadedAt = ?, updatedAt = ?
      WHERE leadId = ? AND side = ?;
      `,
      [now, now, leadId, side]
    );
    console.log(`[DB] Marked ${side} as uploaded for lead ${leadId}`);
  } catch (error) {
    console.error('[DB] markMediaAsUploaded error:', error);
  }
};

export const getCapturedMediaByLeadId = async (
  leadId: string
): Promise<CapturedMediaItem[]> => {
  await ensureDbInitialized();
  if (!db) throw new Error('DB not initialized');

  try {
    const [result] = await db.executeSql(
      `
      SELECT leadId, side, localUri, uploadStatus, updatedAt, uploadedAt
      FROM ${CAPTURED_MEDIA_TABLE}
      WHERE leadId = ?
      ORDER BY updatedAt DESC;
      `,
      [leadId]
    );

    const items: CapturedMediaItem[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const r = result.rows.item(i);
      items.push({
        leadId: r.leadId,
        side: r.side,
        localUri: r.localUri,
        uploadStatus: r.uploadStatus || 'pending',
        updatedAt: r.updatedAt,
        uploadedAt: r.uploadedAt,
      });
    }

    return items;
  } catch (error: any) {
    console.error('[DB] getCapturedMediaByLeadId error (primary query):', error?.message || error);

    // Fallback: Try to fetch without uploadStatus/uploadedAt if columns don't exist
    // This handles existing databases created before these columns were added
    try {
      console.log('[DB] Attempting fallback query without uploadStatus/uploadedAt columns...');
      const [result] = await db.executeSql(
        `
        SELECT leadId, side, localUri, updatedAt
        FROM ${CAPTURED_MEDIA_TABLE}
        WHERE leadId = ?
        ORDER BY updatedAt DESC;
        `,
        [leadId]
      );

      const items: CapturedMediaItem[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        const r = result.rows.item(i);
        items.push({
          leadId: r.leadId,
          side: r.side,
          localUri: r.localUri,
          uploadStatus: 'pending', // Default status for old records
          updatedAt: r.updatedAt,
        });
      }
      console.log('[DB] Fallback query succeeded, loaded', items.length, 'items');
      return items;
    } catch (fallbackError) {
      console.error('[DB] Fallback query also failed:', fallbackError);
      console.log('[DB] Returning empty array - table may not exist yet');
      return [];
    }
  }
}

/* ===================== CRUD OPERATIONS ===================== */

/**
 * Insert or update valuation progress for a lead
 * Called when a lead starts valuation
 */
export const initializeLeadProgress = async (
  leadId: string,
  regNo: string = '',
  prospectNo: string = '',
  vehicleType: string = ''
): Promise<string> => {
  if (!db) throw new Error('DB not initialized');

  const id = `${leadId}-${Date.now()}`;
  const now = Date.now();

  try {
    await db.executeSql(
      `
      INSERT OR IGNORE INTO ${TABLE_NAME} 
      (id, leadId, regNo, prospectNo, vehicleType, totalCount, uploadedCount, lastValuated, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [id, leadId, regNo, prospectNo, vehicleType, 0, 0, new Date().toISOString(), now, now]
    );

    console.log(`[DB] Initialized progress for lead ${leadId}`);
    return id;
  } catch (error) {
    console.error('[DB] initializeLeadProgress error:', error);
    throw error;
  }
};

/**
 * Increment total count when an image/video is added to queue
 */
export const incrementTotalCount = async (leadId: string): Promise<void> => {
  if (!db) throw new Error('DB not initialized');

  try {
    // Sync progress with captured media to ensure accurate unique counts
    await syncProgressWithCapturedMedia(leadId);
    console.log(`[DB] Synced total count for lead ${leadId}`);
  } catch (error) {
    console.error('[DB] incrementTotalCount error:', error);
    throw error;
  }
};

/**
 * Set expected total count for a lead based on valuation steps
 * This is the authoritative total required media count
 */
export const setTotalCount = async (
  leadId: string,
  totalCount: number
): Promise<void> => {
  if (!db) throw new Error('DB not initialized');

  try {
    const exists = await db.executeSql(
      `SELECT * FROM ${TABLE_NAME} WHERE leadId = ?;`,
      [leadId]
    );

    if (exists[0].rows.length === 0) {
      await initializeLeadProgress(leadId);
    }

    await db.executeSql(
      `
      UPDATE ${TABLE_NAME}
      SET totalCount = ?, updatedAt = ?
      WHERE leadId = ?;
      `,
      [totalCount, Date.now(), leadId]
    );

    console.log(`[DB] Set total count for lead ${leadId}: ${totalCount}`);
  } catch (error) {
    console.error('[DB] setTotalCount error:', error);
    throw error;
  }
};

/**
 * Increment uploaded count when item successfully uploads
 */
export const incrementUploadedCount = async (leadId: string): Promise<void> => {
  if (!db) throw new Error('DB not initialized');

  try {
    // Sync progress with captured media to ensure accurate unique counts
    await syncProgressWithCapturedMedia(leadId);
    console.log(`[DB] Synced uploaded count for lead ${leadId}`);
  } catch (error) {
    console.error('[DB] incrementUploadedCount error:', error);
    throw error;
  }
};

/**
 * Get all leads with their valuation progress (like Expo app's getStatusWithoutLeadId)
 */
export const getValuationProgressForAllLeads = async (): Promise<ValuationProgressItem[]> => {
  if (!db) throw new Error('DB not initialized');

  try {
    const [result] = await db.executeSql(
      `
      SELECT * FROM ${TABLE_NAME}
      ORDER BY updatedAt DESC;
      `
    );

    const items: ValuationProgressItem[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const r = result.rows.item(i);
      items.push({
        id: r.id,
        leadId: r.leadId,
        regNo: r.regNo,
        prospectNo: r.prospectNo,
        vehicleType: r.vehicleType,
        totalCount: r.totalCount,
        uploadedCount: r.uploadedCount,
        lastValuated: r.lastValuated,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      });
    }

    return items;
  } catch (error) {
    console.error('[DB] getValuationProgressForAllLeads error:', error);
    return [];
  }
};

/**
 * Get progress for a specific lead
 */
export const getValuationProgressByLeadId = async (
  leadId: string
): Promise<ValuationProgressItem | null> => {
  if (!db) throw new Error('DB not initialized');

  try {
    const [result] = await db.executeSql(
      `
      SELECT * FROM ${TABLE_NAME}
      WHERE leadId = ?
      LIMIT 1;
      `,
      [leadId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const r = result.rows.item(0);
    return {
      id: r.id,
      leadId: r.leadId,
      regNo: r.regNo,
      prospectNo: r.prospectNo,
      vehicleType: r.vehicleType,
      totalCount: r.totalCount,
      uploadedCount: r.uploadedCount,
      lastValuated: r.lastValuated,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  } catch (error) {
    console.error('[DB] getValuationProgressByLeadId error:', error);
    return null;
  }
};

/**
 * Update lead metadata (regNo, prospectNo, etc.)
 */
export const updateLeadMetadata = async (
  leadId: string,
  updates: Partial<ValuationProgressItem>
): Promise<void> => {
  if (!db) throw new Error('DB not initialized');

  const updateFields: string[] = [];
  const values: any[] = [];

  if (updates.regNo !== undefined) {
    updateFields.push('regNo = ?');
    values.push(updates.regNo);
  }
  if (updates.prospectNo !== undefined) {
    updateFields.push('prospectNo = ?');
    values.push(updates.prospectNo);
  }
  if (updates.vehicleType !== undefined) {
    updateFields.push('vehicleType = ?');
    values.push(updates.vehicleType);
  }

  if (updateFields.length === 0) return;

  updateFields.push('updatedAt = ?');
  values.push(Date.now());
  values.push(leadId);

  try {
    await db.executeSql(
      `
      UPDATE ${TABLE_NAME}
      SET ${updateFields.join(', ')}
      WHERE leadId = ?;
      `,
      values
    );

    console.log(`[DB] Updated metadata for lead ${leadId}`);
  } catch (error) {
    console.error('[DB] updateLeadMetadata error:', error);
    throw error;
  }
};

/**
 * Delete progress record (after successful lead submission or manual cleanup)
 */
export const deleteLeadProgress = async (leadId: string): Promise<void> => {
  if (!db) throw new Error('DB not initialized');

  try {
    await db.executeSql(
      `
      DELETE FROM ${TABLE_NAME}
      WHERE leadId = ?;
      `,
      [leadId]
    );

    console.log(`[DB] Deleted progress for lead ${leadId}`);
  } catch (error) {
    console.error('[DB] deleteLeadProgress error:', error);
    throw error;
  }
};

/**
 * Clear all records
 */
export const clearAllProgress = async (): Promise<void> => {
  if (!db) throw new Error('DB not initialized');

  try {
    await db.executeSql(`DELETE FROM ${TABLE_NAME};`);
    console.log('[DB] Cleared all valuation progress');
  } catch (error) {
    console.error('[DB] clearAllProgress error:', error);
    throw error;
  }
};

/**
 * Calculate actual counts based on unique sides in captured_media table
 * totalUniqueSides = count of distinct sides for this lead
 * uploadedUniqueSides = count of distinct sides with uploadStatus='uploaded'
 * 
 * This prevents double counting when same side is captured multiple times
 */
export const getActualUniqueCounts = async (
  leadId: string
): Promise<{ totalUniqueSides: number; uploadedUniqueSides: number }> => {
  if (!db) throw new Error('DB not initialized');

  try {
    // Count total unique sides
    const [totalResult] = await db.executeSql(
      `
      SELECT COUNT(DISTINCT side) AS total
      FROM ${CAPTURED_MEDIA_TABLE}
      WHERE leadId = ?;
      `,
      [leadId]
    );

    const totalUniqueSides = totalResult.rows.item(0)?.total || 0;

    // Count unique sides that are uploaded
    const [uploadedResult] = await db.executeSql(
      `
      SELECT COUNT(DISTINCT side) AS uploaded
      FROM ${CAPTURED_MEDIA_TABLE}
      WHERE leadId = ? AND uploadStatus = 'uploaded';
      `,
      [leadId]
    );

    const uploadedUniqueSides = uploadedResult.rows.item(0)?.uploaded || 0;

    console.log(
      `[DB] getActualUniqueCounts for lead ${leadId}: total=${totalUniqueSides}, uploaded=${uploadedUniqueSides}`
    );

    return { totalUniqueSides, uploadedUniqueSides };
  } catch (error) {
    console.error('[DB] getActualUniqueCounts error:', error);
    return { totalUniqueSides: 0, uploadedUniqueSides: 0 };
  }
};

/**
 * Update valuation_progress table with actual unique counts from captured_media
 * This syncs the summary table with the actual media data
 * Call this after significant progress changes
 */
export const syncProgressWithCapturedMedia = async (
  leadId: string
): Promise<void> => {
  if (!db) throw new Error('DB not initialized');

  try {
    const { totalUniqueSides, uploadedUniqueSides } = await getActualUniqueCounts(
      leadId
    );

    // Update the main table with actual counts
    // NOTE: We do NOT update totalCount here, as that represents the EXPECTED/REQUIRED total (set by setTotalCount)
    // We only update uploadedCount based on unique uploaded sides
    await db.executeSql(
      `
      UPDATE ${TABLE_NAME}
      SET uploadedCount = ?, updatedAt = ?, lastValuated = ?
      WHERE leadId = ?;
      `,
      [uploadedUniqueSides, Date.now(), new Date().toISOString(), leadId]
    );

    console.log(
      `[DB] Synced progress for lead ${leadId}: uploaded=${uploadedUniqueSides} (total kept as is)`
    );
  } catch (error) {
    console.error('[DB] syncProgressWithCapturedMedia error:', error);
    throw error;
  }
};
