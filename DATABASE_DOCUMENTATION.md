# ValuationProgress Database Documentation

## Overview
This document explains how the ValuatedLeads screen data is configured, how the database works, how data is stored/retrieved, and how to verify everything is working correctly.

---

## 📋 Table of Contents
1. [File Structure](#file-structure)
2. [Database Architecture](#database-architecture)
3. [Data Flow](#data-flow)
4. [How ValuatedLeads Screen Works](#how-valuatedleads-screen-works)
5. [Database Operations](#database-operations)
6. [How to Check Database](#how-to-check-database)
7. [Common Issues](#common-issues)

---

## 🗂️ File Structure

### Database Files
```
src/
├── database/
│   ├── valuationProgress.db.ts          ← MAIN DATABASE FILE
│   ├── uploadQueue.db.ts                ← Upload queue tracking
│   └── [other db files]
├── hooks/
│   ├── useValuationLeads.ts             ← Fetches data for ValuatedLeads screen
│   └── [other hooks]
├── pages/ValuatedLeads/
│   └── index.tsx                        ← ValuatedLeads screen component
├── features/valuation/
│   ├── ValuationPage.tsx                ← Valuation screen (captures images)
│   ├── store/
│   │   └── valuation.store.ts           ← Zustand store (in-memory state)
│   └── api/
│       └── valuation.api.ts             ← API calls to server
├── components/
│   ├── CustomCamera.tsx                 ← Camera component (captures images)
│   └── VideoCamera.tsx                  ← Video capture
└── services/
    ├── uploadQueue.manager.ts           ← Manages upload queue
    └── [other services]
```

### Database File Location (on device)
```
Device Storage:
├── /data/data/com.kwikcheck/files/
│   └── valuation_progress.db            ← SQLite database file
```

---

## 🏛️ Database Architecture

### Database Name
- **File**: `valuation_progress.db`
- **Location**: React Native SQLite default location
- **Enabled**: Yes (`SQLite.enablePromise(true)`)

### Table 1: `valuation_progress` (Main Summary Table)
**Purpose**: Stores summary of each lead's valuation progress

**Schema**:
```sql
CREATE TABLE valuation_progress (
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
)
```

**Fields Explained**:
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | TEXT (PK) | Unique identifier | `L123-1707000000000` |
| `leadId` | TEXT (UNIQUE) | Lead identifier | `L123` |
| `regNo` | TEXT | Vehicle registration | `ABC1234` |
| `prospectNo` | TEXT | Loan/prospect number | `LOAN123` |
| `vehicleType` | TEXT | Vehicle type | `4W`, `2W` |
| `totalCount` | INTEGER | Total cards needed (from API) | `20` for 4W |
| `uploadedCount` | INTEGER | Count of unique sides uploaded | `5` |
| `lastValuated` | TEXT | ISO timestamp of last update | `2026-02-09T10:30:00Z` |
| `createdAt` | INTEGER | Milliseconds since epoch | `1707000000000` |
| `updatedAt` | INTEGER | Last update timestamp | `1707000000000` |

**Sample Data**:
```
id              | leadId | regNo    | prospectNo | vehicleType | totalCount | uploadedCount | lastValuated
----------------|--------|----------|------------|-------------|------------|-----------|-----------
L123-1707XXX    | L123   | ABC1234  | LOAN123    | 4W          | 20         | 5         | 2026-02-09...
L456-1707XXX    | L456   | DEF5678  | LOAN456    | 2W          | 15         | 8         | 2026-02-09...
```

### Table 2: `valuation_captured_media` (Per-Side Tracking)
**Purpose**: Stores each captured image/video with upload status

**Schema**:
```sql
CREATE TABLE valuation_captured_media (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL,
  side TEXT NOT NULL,
  localUri TEXT NOT NULL,
  uploadStatus TEXT DEFAULT 'pending',
  createdAt INTEGER,
  updatedAt INTEGER,
  uploadedAt INTEGER,
  UNIQUE(leadId, side)
)
```

**Fields Explained**:
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | TEXT (PK) | Unique from leadId+side | `L123-Odometer` |
| `leadId` | TEXT | Which lead | `L123` |
| `side` | TEXT | Card/side name | `Odometer`, `Dashboard` |
| `localUri` | TEXT | File path on device | `/data/.../L123-Odometer.jpg` |
| `uploadStatus` | TEXT | `pending`, `uploaded`, `failed` | `uploaded` |
| `createdAt` | INTEGER | When captured | `1707000000000` |
| `updatedAt` | INTEGER | Last modified | `1707000000000` |
| `uploadedAt` | INTEGER | When upload succeeded | `1707001000000` or null |
| UNIQUE(leadId, side) | CONSTRAINT | Only 1 entry per side per lead | Prevents duplicates |

**Sample Data**:
```
id              | leadId | side      | localUri            | uploadStatus | uploadedAt
----------------|--------|-----------|---------------------|--------------|----------
L123-Odometer   | L123   | Odometer  | /data/.../img.jpg   | uploaded     | 1707001000
L123-Dashboard  | L123   | Dashboard | /data/.../img.jpg   | pending      | null
L123-FrontView  | L123   | FrontView | /data/.../img.jpg   | uploaded     | 1707001500
L123-RearView   | L123   | RearView  | /data/.../img.jpg   | pending      | null
```

---

## 🔄 Data Flow

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│ USER STARTS VALUATION                                       │
└─────────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────┐
│ ValuationPage.tsx                                           │
│ ├─ fetchSteps(leadId) → API call gets 20 image steps      │
│ ├─ setTotalCount(leadId, 20)                              │
│ │   └─ Inserts into valuation_progress:                   │
│ │       totalCount=20, uploadedCount=0                    │
│ └─ Display 20 card icons 🚗                               │
└─────────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────┐
│ USER CLICKS CARD (e.g., Odometer)                           │
└─────────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────┐
│ CustomCamera.tsx                                            │
│ ├─ Takes photo → imageUri                                  │
│ ├─ User clicks "Proceed"                                   │
│ └─ handleProceed():                                        │
│    ├─ saveImageLocally(uri) → /data/.../L123-Odometer.jpg│
│    ├─ upsertCapturedMedia(leadId, side, uri):            │
│    │   └─ INSERT OR REPLACE captured_media:               │
│    │       id='L123-Odometer',                             │
│    │       uploadStatus='pending'                          │
│    ├─ markLocalCaptured() → Zustand store updated        │
│    ├─ queueImageForUpload():                              │
│    │   └─ uploadQueueManager.addToQueue()                │
│    │       └─ Saves to uploadQueue DB                     │
│    └─ navigation.goBack()                                 │
└─────────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────┐
│ RETURN TO ValuationPage                                     │
│ ├─ loadCapturedMedia():                                    │
│ │   └─ getCapturedMediaByLeadId(leadId)                   │
│ │       └─ SELECT * FROM captured_media→Zustand           │
│ ├─ Card shows image 📸                                    │
│ └─ Modal opens (if Questions configured)                  │
└─────────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKGROUND: Upload Queue Processing                         │
│ uploadQueue.manager.ts:                                     │
│ ├─ Reads uploadQueue from DB                              │
│ ├─ For each item:                                          │
│ │  ├─ Upload file to API                                  │
│ │  ├─ If success:                                          │
│ │  │  ├─ markMediaAsUploaded(leadId, 'Odometer')         │
│ │  │  │   └─ UPDATE captured_media:                       │
│ │  │  │       uploadStatus='uploaded',                    │
│ │  │  │       uploadedAt=now                              │
│ │  │  ├─ incrementUploadedCount(leadId)                  │
│ │  │  │   └─ UPDATE valuation_progress:                  │
│ │  │  │       uploadedCount += 1                          │
│ │  │  └─ Delete from uploadQueue                          │
│ │  └─ Else: Retry with exponential backoff               │
└─────────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────┐
│ ValuatedLeads Screen (useValuationLeads hook)               │
│ ├─ getValuationProgressForAllLeads()                       │
│ │   └─ SELECT * FROM valuation_progress                   │
│ ├─ For each lead:                                          │
│ │  ├─ getActualUniqueCounts(leadId):                      │
│ │  │  ├─ SELECT COUNT(DISTINCT side)                      │
│ │  │  │   FROM captured_media                             │
│ │  │  │   → totalUniqueSides = 20 (touched)              │
│ │  │  ├─ SELECT COUNT(DISTINCT side)                      │
│ │  │  │   FROM captured_media                             │
│ │  │  │   WHERE uploadStatus='uploaded'                   │
│ │  │  │   → uploadedUniqueSides = 1 (Odometer done)      │
│ │  ├─ Calculate:                                           │
│ │  │   totalCount = 20 (from valuation_progress)          │
│ │  │   uploadedCount = 1 (from captured_media counts)     │
│ │  │   uploadProgress = (1/20)*100 = 5%                   │
│ │  └─ Display: "1/20 UPLOADED" ✓                          │
│ └─ Show in ValuatedLeads card                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🖥️ How ValuatedLeads Screen Works

### Component: `src/pages/ValuatedLeads/index.tsx`

**Purpose**: Display list of leads with upload progress

**How it gets data**:
```typescript
// Step 1: Import hook that fetches data
import { useValuationLeads } from "../../hooks/useValuationLeads";

// Step 2: Use hook in component
const { leads, isLoading, error } = useValuationLeads();

// Step 3: Render each lead as a ValuationCard
leads.map((item) => (
  <ValuationCard
    leadId={item.leadId}
    uploadedCount={item.uploadedCount}  // 1
    totalCount={item.totalCount}        // 20
    uploadProgress={item.uploadProgress} // 5%
    regNo={item.regNo}
    prospectNo={item.prospectNo}
    lastValuated={item.lastValuated}
  />
))
```

### ValuationCard Component

**Displays**:
```
┌───────────────────────────────────────┐
│ Lead ID: L123                         │
│ Reg. Number: ABC1234                  │
│ Loan Number: LOAN123                  │
│                         Valuated Date │
│                         09/02/2026     │
├───────────────────────────────────────┤
│ ████░░░░░░░░░░░░░░░░░░  5% uploaded   │
├───────────────────────────────────────┤
│ 1/20 UPLOADED  Left: 19    VALUATE    │
└───────────────────────────────────────┘
```

**Data Sources**:
- `leadId`: From valuation_progress table
- `regNo`: From valuation_progress table
- `prospectNo`: From valuation_progress table
- `vehicleType`: From valuation_progress table
- `totalCount`: From valuation_progress (set by ValuatePage)
- `uploadedCount`: Calculated by hook from captured_media table
- `uploadProgress`: `(uploadedCount/totalCount)*100`
- `lastValuated`: From valuation_progress table

---

## 💾 Database Operations

### Hook: `src/hooks/useValuationLeads.ts`

**What it does**:
1. Fetches all leads from database
2. For each lead, calculates actual upload count
3. Transforms data for UI display
4. Returns sorted leads with upload progress

**Code Flow**:
```typescript
const fetchLeads = useCallback(async () => {
  // 1. Get all leads from database
  const dbLeads = await getValuationProgressForAllLeads();
  
  // 2. For each lead, calculate upload counts
  const transformedLeads = await Promise.all(
    dbLeads.map(async (lead) => {
      // Get unique uploaded sides count
      const { uploadedUniqueSides } = await getActualUniqueCounts(lead.leadId);
      
      // Use stored totalCount (from ValuatePage)
      const totalCount = lead.totalCount;
      
      // Use calculated uploadedCount (unique sides uploaded)
      const actualUploadedCount = uploadedUniqueSides;
      
      // Calculate progress percentage
      const uploadProgress = totalCount > 0 
        ? Math.round((actualUploadedCount / totalCount) * 100)
        : 0;
      
      // Return transformed data for UI
      return {
        ...lead,
        totalCount,
        uploadedCount: actualUploadedCount,
        uploadProgress,
        isPartiallyUploaded: totalCount > actualUploadedCount,
      };
    })
  );
  
  // 3. Sort by most recent
  transformedLeads.sort((a, b) => b.updatedAt - a.updatedAt);
  
  // 4. Update state for UI render
  setLeads(transformedLeads);
}, []);

// Fetch on screen focus (re-fetches when user returns to this screen)
useFocusEffect(
  useCallback(() => {
    fetchLeads();
  }, [fetchLeads])
);
```

### Key Database Functions

#### 1. `getValuationProgressForAllLeads()`
**Purpose**: Get all leads
```typescript
const [result] = await db.executeSql(
  `SELECT * FROM valuation_progress ORDER BY updatedAt DESC;`
);
// Returns: ValuationProgressItem[]
// [{id, leadId, regNo, prospectNo, vehicleType, totalCount, uploadedCount, ...}]
```

#### 2. `getActualUniqueCounts(leadId)`
**Purpose**: Count unique sides for a lead
```typescript
// Count all unique sides touched
SELECT COUNT(DISTINCT side) FROM valuation_captured_media WHERE leadId = ?

// Count unique sides that are uploaded
SELECT COUNT(DISTINCT side) FROM valuation_captured_media 
WHERE leadId = ? AND uploadStatus = 'uploaded'

// Returns: {totalUniqueSides, uploadedUniqueSides}
```

#### 3. `setTotalCount(leadId, count)` 
**Called by**: ValuatePage when it loads steps
**Purpose**: Set the expected number of cards
```typescript
// Called from ValuatePage.tsx
setTotalCount(leadId, clickableImageSides.length) // 20 for 4W

// Inserts or updates totalCount
UPDATE valuation_progress 
SET totalCount = ?, updatedAt = ?
WHERE leadId = ?
```

#### 4. `upsertCapturedMedia(leadId, side, uri, status)`
**Called by**: CustomCamera when image saved
**Purpose**: Record a captured image
```typescript
// Side example: 'Odometer', 'Dashboard', 'FrontView'
INSERT OR REPLACE INTO valuation_captured_media
(id, leadId, side, localUri, uploadStatus, ...)
VALUES ('L123-Odometer', 'L123', 'Odometer', '/path/...', 'pending', ...)

// UNIQUE(leadId, side) constraint:
// If 'Odometer' already exists for L123, REPLACE it (no duplicate)
```

#### 5. `markMediaAsUploaded(leadId, side)`
**Called by**: uploadQueue.manager when API succeeds
**Purpose**: Mark a side as successfully uploaded
```typescript
UPDATE valuation_captured_media
SET uploadStatus = 'uploaded', uploadedAt = ?
WHERE leadId = ? AND side = ?
```

#### 6. `incrementUploadedCount(leadId)`
**Called by**: uploadQueue.manager after marking uploaded
**Purpose**: Update total uploaded count in summary
```typescript
UPDATE valuation_progress
SET uploadedCount = uploadedCount + 1, updatedAt = ?, lastValuated = ?
WHERE leadId = ?
```

---

## 🔍 How to Check Database

### Method 1: Android Studio Device Explorer
1. **Open Android Studio**
2. **View → Tool Windows → Device Explorer**
3. **Navigate**: `/data/data/com.kwikcheck/files/`
4. **Find**: `valuation_progress.db`
5. **Right-click → Save As** to your computer

### Method 2: ADB Shell
```bash
# Connect device via USB with debugging enabled

# List database files
adb shell ls -la /data/data/com.kwikcheck/files/

# Pull database to computer
adb pull /data/data/com.kwikcheck/files/valuation_progress.db ./

# Open with SQLite viewer (DB Browser for SQLite, DBeaver, etc.)
```

### Method 3: React Native SQLite Console
**Add to code (temporary for debugging)**:
```typescript
// In valuationProgress.db.ts
export const debugPrintDatabase = async () => {
  if (!db) return;
  
  try {
    // Print valuation_progress table
    const [result1] = await db.executeSql('SELECT * FROM valuation_progress;');
    console.log('=== valuation_progress ===');
    for (let i = 0; i < result1.rows.length; i++) {
      console.log(result1.rows.item(i));
    }
    
    // Print valuation_captured_media table
    const [result2] = await db.executeSql('SELECT * FROM valuation_captured_media;');
    console.log('=== valuation_captured_media ===');
    for (let i = 0; i < result2.rows.length; i++) {
      console.log(result2.rows.item(i));
    }
  } catch (error) {
    console.error('Debug print error:', error);
  }
};

// In ValuatedLeads screen or anywhere
import { debugPrintDatabase } from '../../database/valuationProgress.db';
// Call when needed:
debugPrintDatabase();
```

### Method 4: Check Logs
```bash
# Filter logs for database operations
adb logcat | grep "\[DB\]"

# Common logs you should see:
# [DB] Increment total count for lead L123
# [DB] getActualUniqueCounts for lead L123: total=20, uploaded=5
# [Hook] Fetched 3 leads with accurate upload counts
```

---

## 🔢 Data Count Calculation

### Understanding the Counts

**totalCount**
- **Set by**: ValuatePage.tsx when user starts valuation
- **Value**: Number of image steps from API (20 for 4W, 15 for 2W)
- **Stored in**: valuation_progress table
- **Meaning**: How many cards user needs to capture before "complete"

**uploadedCount** 
- **Calculated by**: useValuationLeads hook
- **Value**: COUNT(DISTINCT side) WHERE uploadStatus='uploaded'
- **Meaning**: How many unique sides have been successfully uploaded

**Example Scenario**:
```
User with 4W vehicle:
├─ API returns 20 image steps
├─ ValuatePage calls setTotalCount(leadId, 20)
│   └─ valuation_progress.totalCount = 20
├─ User captures Odometer, Dashboard, FrontView (3 sides)
│   └─ captured_media has 3 rows, all uploadStatus='pending'
├─ Download conditions modal and return – no uploads yet
├─ ValuatedLeads calculates:
│   ├─ totalCount = 20 (from DB)
│   ├─ uploadedUniqueSides = 0 (none have uploadStatus='uploaded')
│   ├─ uploadedCount = 0
│   └─ Displays: 0/20 ✓
├─ Background: uploadQueue processes and succeeds for Odometer
│   └─ markMediaAsUploaded(leadId, 'Odometer')
│   └─ captured_media: Odometer.uploadStatus='uploaded'
├─ User returns to ValuatedLeads
│   ├─ uploadedUniqueSides = 1 (Odometer is uploaded)
│   ├─ uploadedCount = 1
│   └─ Displays: 1/20 ✓
├─ Next uploads succeed for Dashboard and FrontView
│   └─ captured_media: all 3 rows have uploadStatus='uploaded'
├─ User returns to ValuatedLeads
│   ├─ uploadedUniqueSides = 3
│   ├─ uploadedCount = 3
│   └─ Displays: 3/20 ✓
```

---

## 📊 Data Insertion Flow

### Step 1: Valuation Starts (ValuationPage.tsx)
```typescript
useEffect(() => {
  if (leadId) {
    fetchSteps(leadId);  // API call
  }
}, [leadId]);

// fetchSteps calls API, gets steps
// Extract image steps: steps.filter(s => s.Images === true)
// Count them: clickableImageSides.length = 20

// Insert into database:
setTotalCount(leadId, 20);
// ↓
// SQL: INSERT OR UPDATE into valuation_progress 
//      totalCount = 20
```

### Step 2: Image Captured (CustomCamera.tsx)
```typescript
handleProceed = async () => {
  // 1. Save to device storage
  const savedUri = await saveImageLocally(uri, leadId, side);
  // File saved to: /data/data/com.kwikcheck/files/L123-Odometer.jpg
  
  // 2. Save to database
  await upsertCapturedMedia(leadId, side, savedUri);
  // ↓
  // SQL: INSERT OR REPLACE INTO valuation_captured_media
  //      id='L123-Odometer',
  //      leadId='L123',
  //      side='Odometer',
  //      localUri='/data/data/com.kwikcheck/files/L123-Odometer.jpg',
  //      uploadStatus='pending'
  
  // 3. Queue for background upload
  await queueImageForUpload(savedUri);
  // ↓
  // SQL: INSERT INTO uploadQueue
  //      (uploadQueue.db stores file path, not base64)
  
  // 4. Update Zustand
  markLocalCaptured(side, savedUri);
  // ↓
  // In-memory: sideUploads = [{side:'Odometer', localUri:'...', status:'pending'}]
  
  // 5. Navigate back
  navigation.goBack();
}
```

### Step 3: Upload Succeeds (uploadQueue.manager.ts)
```typescript
private async handleItem(item: UploadQueueDBItem) {
  try {
    // 1. Upload to API
    const response = await uploadValuationImageApi(
      base64String,
      paramName,    // 'OdometerBase64'
      leadId
    );
    
    // 2. If success, mark in database
    const sideName = 'Odometer'; // extracted from 'OdometerBase64'
    await markMediaAsUploaded(leadId, sideName);
    // ↓
    // SQL: UPDATE valuation_captured_media
    //      SET uploadStatus = 'uploaded',
    //          uploadedAt = now
    //      WHERE leadId='L123' AND side='Odometer'
    
    // 3. Increment progress count
    await incrementUploadedCount(leadId);
    // ↓
    // SQL: UPDATE valuation_progress
    //      SET uploadedCount = uploadedCount + 1
    //      WHERE leadId='L123'
    
    // 4. Clean up queue
    await deleteQueueItem(item.id);
    
  } catch (error) {
    // Retry with exponential backoff
  }
}
```

### Step 4: ValuatedLeads Refreshes
```typescript
// When user opens ValuatedLeads screen:

useValuationLeads.fetchLeads() {
  // 1. Get all leads
  const dbLeads = await getValuationProgressForAllLeads();
  // SQL: SELECT * FROM valuation_progress
  // Returns: [{leadId:'L123', totalCount:20, uploadedCount:1, ...}]
  
  // 2. For each lead, calculate unique upload count
  for (let lead of dbLeads) {
    const { uploadedUniqueSides } = await getActualUniqueCounts(lead.leadId);
    // SQL: SELECT COUNT(DISTINCT side) 
    //      FROM valuation_captured_media
    //      WHERE leadId='L123' AND uploadStatus='uploaded'
    // Returns: {uploadedUniqueSides: 1}
    
    // 3. Calculate UI values
    const uploadProgress = (uploadedUniqueSides / totalCount) * 100;
    // 1 / 20 * 100 = 5%
    
    // 4. Return transformed data
    return {
      ...lead,
      uploadedCount: 1,        // From calculated count
      totalCount: 20,          // From DB
      uploadProgress: 5,       // 1/20 * 100
    };
  }
  
  // 5. Update state for render
  setLeads(transformedLeads);
}

// ValuatedLeads renders:
// "<1/20 UPLOADED, 5% uploaded>"
```

---

## 🐛 Common Issues & Solutions

### Issue 1: ValuatedLeads Shows Wrong Counts
**Symptom**: Shows 1/5 instead of 1/20

**Cause**: 
- `totalCount` is 0 or not set by ValuatePage
- Hook is calculating totalCount from captured media (only counts touched cards)

**Fix**:
- Ensure ValuatePage calls `setTotalCount(leadId, clickableImageSides.length)`
- Hook uses `lead.totalCount` from database, NOT calculated count

**Check**:
```typescript
// Add to ValuatePage useEffect:
console.log('[ValuationPage] totalCount set to:', clickableImageSides.length);

// Add to hook:
console.log('[Hook] totalCount from DB:', lead.totalCount);
console.log('[Hook] uploadedUniqueSides:', uploadedUniqueSides);
```

### Issue 2: Captured Count Not Updating
**Symptom**: User captures image but count doesn't increase

**Cause**:
- `upsertCapturedMedia()` not called in CustomCamera
- Database insert failed silently

**Fix**:
```typescript
// In CustomCamera.tsx handleProceed:
try {
  await upsertCapturedMedia(id.toString(), side, savedImageUri);
  console.log('[Camera] Saved to DB:', side, savedImageUri);
} catch (error) {
  console.error('[Camera] Failed to save to DB:', error);
}
```

### Issue 3: Upload Count Not Increasing
**Symptom**: Images upload but count stays same

**Cause**:
- `markMediaAsUploaded()` not called after upload
- `incrementUploadedCount()` not called

**Fix**:
```typescript
// In uploadQueue.manager.ts handleItem:
if (success) {
  await markMediaAsUploaded(leadId, sideName);
  console.log('[UploadQueue] Marked as uploaded:', sideName);
  
  await incrementUploadedCount(leadId);
  console.log('[UploadQueue] Incremented count for:', leadId);
}
```

### Issue 4: Database Not Initializing
**Symptom**: App crashes or database operations fail

**Cause**:
- `initValuationProgressDB()` not called on app start

**Fix**:
```typescript
// In App.tsx useEffect:
useEffect(() => {
  initValuationProgressDB().then(() => {
    console.log('[App] Database initialized');
  }).catch(error => {
    console.error('[App] Database init failed:', error);
  });
}, []);
```

---

## 📋 Verification Checklist

Use this to verify everything is working:

**Database Structure:**
- [ ] `valuation_progress` table exists
- [ ] `valuation_captured_media` table exists
- [ ] Both tables have all required columns
- [ ] UNIQUE(leadId, side) constraint exists on captured_media

**Data Flow:**
- [ ] When user enters ValuatePage, totalCount is set
- [ ] When user captures image, row inserted into captured_media
- [ ] When upload succeeds, uploadStatus changed to 'uploaded'
- [ ] When user views ValuatedLeads, hook fetches and displays correctly

**UI Display:**
- [ ] ValuatedLeads shows correct totalCount (20 for 4W)
- [ ] ValuatedLeads shows correct uploadedCount (unique sides uploaded)
- [ ] Progress bar matches calculation (uploaded/total * 100)
- [ ] Counts update when user returns to screen

**Logs to Check:**
```
[ValuationPage] totalCount set to: 20
[Camera] Saved to DB: Odometer
[UploadQueue] Marked as uploaded: Odometer
[UploadQueue] Incremented count for: L123
[Hook] Fetched X leads with accurate upload counts
[DB] getActualUniqueCounts for lead L123: total=20, uploaded=5
```

---

## 🚀 Quick Reference

### Function Map
| Function | File | Purpose | Calls |
|----------|------|---------|-------|
| `setTotalCount()` | valuationProgress.db.ts | Set expected card count | ValuationPage |
| `upsertCapturedMedia()` | valuationProgress.db.ts | Save captured image | CustomCamera |
| `markMediaAsUploaded()` | valuationProgress.db.ts | Mark as uploaded | uploadQueue.manager |
| `incrementUploadedCount()` | valuationProgress.db.ts | Increment upload count | uploadQueue.manager |
| `getValuationProgressForAllLeads()` | valuationProgress.db.ts | Get all leads | useValuationLeads hook |
| `getActualUniqueCounts()` | valuationProgress.db.ts | Count unique sides | useValuationLeads hook |
| `useValuationLeads()` | hooks/useValuationLeads.ts | Fetch data for UI | ValuatedLeads page |

### Table Map
| Table | Records | Used For |
|-------|---------|----------|
| `valuation_progress` | 1 per lead | Summary counts, dates |
| `valuation_captured_media` | 1 per side per lead | Upload status per card |

### Data Flow Sequence
1. **User opens ValuatePage** → `setTotalCount()`
2. **User captures image** → `upsertCapturedMedia()`
3. **Upload succeeds** → `markMediaAsUploaded()` + `incrementUploadedCount()`
4. **User opens ValuatedLeads** → `useValuationLeads()` hook → `getActualUniqueCounts()`
5. **UI renders** → Shows calculated counts

---

## 📞 Debugging Tips

### Log Database State
```typescript
// Add this temporary function to verify state
async function logDatabaseState() {
  const leads = await getValuationProgressForAllLeads();
  console.log('===== DATABASE STATE =====');
  leads.forEach(lead => {
    console.log(`Lead: ${lead.leadId}`);
    console.log(`  totalCount: ${lead.totalCount}`);
    console.log(`  uploadedCount: ${lead.uploadedCount}`);
  });
  
  const captured = await getCapturedMediaByLeadId('YOUR_LEAD_ID');
  console.log('Captured Media:');
  captured.forEach(item => {
    console.log(`  ${item.side}: ${item.uploadStatus}`);
  });
}
```

### Monitor Upload Progress
Add hooks to see real-time updates:
```typescript
// In ValuationPage
const unsubscribe = uploadQueueManager.subscribe((count) => {
  console.log('[UploadQueue] Items remaining:', count);
});
```

### Check File System
```typescript
import RNFS from 'react-native-fs';

RNFS.readDir(RNFS.DocumentDirectoryPath)
  .then(files => {
    console.log('Files in DocumentDirectoryPath:');
    files.forEach(file => {
      console.log(`  ${file.name}`);
    });
  });
```
