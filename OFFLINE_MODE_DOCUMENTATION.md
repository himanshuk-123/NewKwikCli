# Offline Mode Documentation

## Overview
This document explains how the KwikCheck app works in offline mode, what mechanisms enable offline functionality, and how data syncs when back online.

---

## 📋 Table of Contents
1. [How Offline Mode Works](#how-offline-mode-works5)
2. [File Storage System](#file-storage-system)
3. [Offline Queue (Upload Queue)](#offline-queue-upload-queue)
4. [Network Monitoring](#network-monitoring)
5. [Upload Manager Flow](#upload-manager-flow)
6. [Retry Logic](#retry-logic)
7. [Sync When Online](#sync-when-online)
8. [Complete Offline Scenario](#complete-offline-scenario)
9. [Key Technologies](#key-technologies)
10. [How to Modify](#how-to-modify)

---

## 🔌 How Offline Mode Works

### The Core Concept
```
┌─────────────────────────────────────────────────────────────┐
│ USER EXPERIENCE (Works Same Online or Offline)              │
├─────────────────────────────────────────────────────────────┤
│ 1. Capture Image → Stored Locally                           │
│ 2. App Queues Upload → Stored in Database                   │
│ 3. If Online → Upload Immediately                           │
│ 4. If Offline → Queue Waits Patiently                       │
│ 5. When Online Again → Automatic Upload                     │
│ 6. User Never Loses Data                                    │
└─────────────────────────────────────────────────────────────┘
```

### Three-Layer Offine Architecture

**Layer 1: Persistent File Storage**
- Images/videos saved to device storage (not RAM)
- Location: `/data/data/com.kwikcheck/files/`
- Survives: App restart, cache clear, power loss
- Technology: `react-native-fs`

**Layer 2: SQLite Queue Database**
- List of pending uploads stored in database
- Location: `/data/data/com.kwikcheck/databases/uploadQueue.db`
- Tracks: File path, upload status, retry count, next retry time
- Survives: App restart, network disconnected, app crashes
- Technology: `react-native-sqlite-storage`

**Layer 3: Background Manager**6
- Monitors network connectivity
- Automatically retries uploads with exponential backoff
- Runs continuously (even when app in background)
- Technology: `NetInfo`, custom `uploadQueue.manager.ts`

---

## 💾 File Storage System

  ### What Gets Stored Where

#### 1. Image Files (Raw Media)
**Location**: `/data/data/com.kwikcheck/files/`

**File Structure**:
```
/data/data/com.kwikcheck/files/
├── L123-Odometer.jpg         ← L123 = Lead ID, Odometer = Card Name
├── L123-Dashboard.jpg
├── L123-FrontView.jpg
├── L456-Odometer.jpg
├── L456-Dashboard.jpg
└── ... (more image files)
```

**File Naming Convention**:
```
{leadId}-{side}.{extension}

Examples:
L123-Odometer.jpg      (Lead 123, Odometer side)
L456-Dashboard.png     (Lead 456, Dashboard side)
L789-FrontView.mp4     (Lead 789, Front View video)
```

**How It Works**:
```typescript
// In CustomCamera.tsx handleProceed():
const fileName = `${leadId}-${side}.jpg`;
const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
// On device: /data/data/com.kwikcheck/files/L123-Odometer.jpg

// Save image to this path
await RNFS.writeFile(filePath, base64String, 'base64');
```

#### 2. File References in Database
**Location**: `/data/data/com.kwikcheck/databases/valuation_progress.db`

**Table: `valuation_captured_media`**
```sql
-- Stores pointer to the file and upload status
CREATE TABLE valuation_captured_media (
  id TEXT PRIMARY KEY,           -- L123-Odometer
  leadId TEXT,                   -- L123
  side TEXT,                     -- Odometer
  localUri TEXT,                 -- /data/data/com.kwikcheck/files/L123-Odometer.jpg
  uploadStatus TEXT,             -- 'pending', 'uploaded', 'failed'
  createdAt INTEGER,
  updatedAt INTEGER,
  uploadedAt INTEGER,
  UNIQUE(leadId, side)
)
```

**Sample Entry**:
```
id          | leadId | side    | localUri                              | uploadStatus | uploadedAt
------------|--------|---------|---------------------------------------|--------------|----------
L123-Odom   | L123   | Odometer| /data/.../L123-Odometer.jpg          | pending      | null
```

---

## 📤 Offline Queue (Upload Queue)

### Purpose
The upload queue stores jobs that need to be processed when internet is available. It's the "to-do list" for uploads.

### Queue Database Schema

**Location**: `/data/data/com.kwikcheck/databases/uploadQueue.db`

**Table: `uploadQueue`**
```sql
CREATE TABLE uploadQueue (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL,
  filePath TEXT NOT NULL,          -- /data/data/com.kwikcheck/files/L123-Odometer.jpg
  paramName TEXT NOT NULL,         -- 'OdometerBase64' (API parameter name)
  status TEXT DEFAULT 'pending',   -- 'pending', 'processing', 'success', 'failed'
  retryCount INTEGER DEFAULT 0,
  lastRetryTime INTEGER,           -- Timestamp
  nextRetryTime INTEGER,           -- When to retry next
  createdAt INTEGER,
  errorMessage TEXT
)
```

**Sample Data**:
```
id          | leadId | filePath          | paramName      | status    | retryCount | nextRetryTime
------------|--------|-------------------|----------------|-----------|------------|----------
Q1-L123-O   | L123   | /data/.../Odom..  | OdometerBase64 | pending   | 0          | 0
Q2-L123-D   | L123   | /data/.../Dash..  | DashboardBase64| pending   | 0          | 0
Q3-L456-O   | L456   | /data/.../Odom..  | OdometerBase64 | failed    | 3          | 1707050000000
```

### How Queue Items Are Added

**When User Captures Image** (CustomCamera.tsx):
```typescript
// 1. Image saved to file system
const filePath = `/data/data/com.kwikcheck/files/L123-Odometer.jpg`;

// 2. Add to queue for upload
await uploadQueueManager.addToQueue({
  leadId: 'L123',
  filePath: filePath,
  paramName: 'OdometerBase64',  // API expects this parameter name
  status: 'pending',
  retryCount: 0,
  nextRetryTime: 0  // Retry immediately
});

// 3. Queue inserts to database:
// INSERT INTO uploadQueue (id, leadId, filePath, paramName, status, ...)
//   VALUES (unique_id, 'L123', '/data/.../L123-Odometer.jpg', 'OdometerBase64', 'pending', ...)
```

### Queue Status Lifecycle

```
PENDING
   ↓
   ├─→ [If Online] → PROCESSING
   │      ↓
   │      ├─→ [Success] → SUCCESS → [Delete from queue]
   │      └─→ [Fail] → Increment retryCount
   │
   └─→ [If Offline] → PENDING [Wait]
      ↓
      [NetInfo detects online] → Retry processing
```

---

## 📡 Network Monitoring

### Technology: NetInfo

The app uses `react-native-netinfo` to detect network changes.

### How It Works

```typescript
// In uploadQueue.manager.ts or App.tsx:

import NetInfo from '@react-native-community/netinfo';

// Listen for network state changes
const unsubscribe = NetInfo.addEventListener(state => {
  console.log('Network state:', state);
  // {
  //   isConnected: true/false,
  //   isInternetReachable: true/false,
  //   type: 'wifi' | 'cellular' | 'none' | 'other'
  // }
  
  if (state.isConnected && state.isInternetReachable) {
    console.log('Internet available! Starting upload queue...');
    uploadQueueManager.processQueue();  // Process all pending uploads
  } else {
    console.log('No internet. Uploads paused until connection restored.');
  }
});

// Cleanup on app unmount
unsubscribe();
```

### Network States

**App Can Be In**:
1. **Online, WiFi**: Upload queue processes immediately
2. **Online, Cellular**: Upload queue processes immediately (if allowed)
3. **WiFi Connected, No Internet**: Queue pauses (can't reach server)
4. **Offline (Airplane Mode)**: Queue waits for connection
5. **Switching Networks**: Queue may pause briefly, then resume

**Current Implementation** (uploadQueue.manager.ts):
```typescript
// Check before processing queue
const isOnline = await NetInfo.fetch();

if (!isOnline.isConnected || !isOnline.isInternetReachable) {
  console.log('📡 No internet connection. Pausing uploads.');
  return; // Exit, don't process
}

// If we get here, internet is available
console.log('📡 Internet available. Processing uploads...');
// Continue with upload processing
```

---

## 🚀 Upload Manager Flow

### Main File: `src/services/uploadQueue.manager.ts`

### Architecture
```
uploadQueue.manager.ts
├── addToQueue()          ← Called when image captured
├── processQueue()        ← Called when online or on interval
├── handleItem()          ← Uploads single item with retry logic
└── subscribe()           ← Listeners for queue status changes
```

### The Complete Flow

#### 1. Initialize Manager (On App Start)
```typescript
// In App.tsx
import uploadQueueManager from './services/uploadQueue.manager';

useEffect(() => {
  // Initialize the manager
  uploadQueueManager.init();
  
  // Listen for network changes
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      // When online, process queue
      uploadQueueManager.processQueue();
    }
  });
  
  // Also process queue on intervals (every 30 seconds)
  const interval = setInterval(() => {
    uploadQueueManager.processQueue();
  }, 30000);
  
  return () => {
    unsubscribe();
    clearInterval(interval);
  };
}, []);
```

#### 2. Add Item to Queue (On Image Capture)
```typescript
// In CustomCamera.tsx handleProceed()
const queueImageForUpload = async (filePath, leadId, side) => {
  // Extract parameter name from side
  const paramName = `${side}Base64`;  // 'Odometer' → 'OdometerBase64'
  
  // Add to queue
  await uploadQueueManager.addToQueue({
    leadId: leadId,
    filePath: filePath,          // /data/.../L123-Odometer.jpg
    paramName: paramName,        // OdometerBase64
    status: 'pending',
    retryCount: 0,
    nextRetryTime: 0  // Try immediately
  });
  
  console.log('✓ Image queued for upload:', paramName);
  
  // Immediately try to process
  uploadQueueManager.processQueue();
};
```

#### 3. Process Queue (When Online)
```typescript
// In uploadQueue.manager.ts
async processQueue() {
  // 1. Check if online
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    console.log('⏸️  Offline. Queue paused.');
    return;
  }
  
  // 2. Get all pending items from database
  const pendingItems = await this.getPendingItems();
  // SELECT * FROM uploadQueue WHERE status IN ('pending', 'failed')
  
  if (pendingItems.length === 0) {
    console.log('✓ Queue is empty');
    return;
  }
  
  console.log(`📤 Processing ${pendingItems.length} items...`);
  
  // 3. Process each item
  for (const item of pendingItems) {
    // Check if it's time to retry (handles retry backoff)
    const now = Date.now();
    if (item.nextRetryTime > now) {
      console.log(`⏳ Waiting to retry item ${item.id}...`);
      continue; // Skip, not ready yet
    }
    
    // Try to upload
    await this.handleItem(item);
  }
  
  // 4. Emit event for listeners (UI updates)
  this.emitStatusChange();
}
```

#### 4. Upload Single Item with Retry
```typescript
// In uploadQueue.manager.ts
async handleItem(item: UploadQueueDBItem) {
  try {
    // 1. Update status to 'processing'
    await this.updateItemStatus(item.id, 'processing');
    
    // 2. Read image file as base64
    const base64String = await RNFS.readFile(item.filePath, 'base64');
    console.log(`📄 Read file: ${item.paramName}`);
    
    // 3. Call API to upload
    const response = await uploadValuationImageApi(
      base64String,
      item.paramName,        // 'OdometerBase64'
      item.leadId
    );
    
    console.log(`✅ Upload success: ${item.paramName}`);
    
    // 4. Mark as uploaded in both databases
    const sideName = item.paramName.replace('Base64', '');  // 'OdometerBase64' → 'Odometer'
    await markMediaAsUploaded(item.leadId, sideName);  // valuation_captured_media
    
    // 5. Delete from queue
    await this.deleteQueueItem(item.id);
    console.log(`🗑️  Removed from queue: ${item.paramName}`);
    
  } catch (error) {
    console.error(`❌ Upload failed: ${item.paramName}`, error.message);
    
    // 6. Handle retry
    const nextRetryCount = item.retryCount + 1;
    const maxRetries = 5;
    
    if (nextRetryCount >= maxRetries) {
      // Give up
      await this.updateItemStatus(item.id, 'failed');
      console.error(`🛑 Max retries reached for: ${item.paramName}`);
    } else {
      // Schedule retry
      const delayMs = this.calculateRetryDelay(nextRetryCount);
      const nextRetryTime = Date.now() + delayMs;
      
      await this.updateItemRetry(item.id, nextRetryCount, nextRetryTime);
      console.log(`⏳ Retry scheduled in ${delayMs/1000}s...`);
    }
  }
}
```

---

## 🔄 Retry Logic

### Exponential Backoff Strategy

The app uses exponential backoff to avoid overwhelming the server when retrying failed uploads.

**Retry Delays by Attempt**:
```
Attempt 1: 1 second   (first automatic retry)
Attempt 2: 3 seconds  (if still fails)
Attempt 3: 5 seconds
Attempt 4: 10 seconds
Attempt 5: 30 seconds
Attempt 6+: Give up   (mark as failed, manual intervention needed)
```

**Code Implementation**:
```typescript
// In uploadQueue.manager.ts
private calculateRetryDelay(retryCount: number): number {
  const delayMap = {
    0: 1000,      // 1 second
    1: 3000,      // 3 seconds
    2: 5000,      // 5 seconds
    3: 10000,     // 10 seconds
    4: 30000,     // 30 seconds
    // Anything higher = don't retry
  };
  
  return delayMap[retryCount] || 60000;  // Default 1 minute if not found
}
```

**Timeline Example**:
```
14:00:00 - User offline, captures image → Queue item added, nextRetryTime = 0
14:00:00 - processQueue() checks: no internet → Exits, doesn't process

14:05:00 - User connects to WiFi
14:05:00 - NetInfo detects online → Calls processQueue()
14:05:00 - Reads queue: "Odometer" pending, nextRetryTime = 0 (ready)
14:05:00 - Attempts upload
14:05:02 - Upload fails (server error) → Increments retryCount to 1
14:05:02 - Calculates next retry: 3000ms = 3 seconds
14:05:02 - Updates nextRetryTime = 14:05:05

14:05:05 - processQueue() runs again
14:05:05 - Checks: retryCount=1, nextRetryTime=14:05:05 ✓ (ready)
14:05:05 - Attempts upload again
14:05:07 - Success! → Deletes from queue

14:05:07 - Queue now empty, uploads complete ✓
```

### Database Updates During Retry

**Queue Table State Changes**:
```
Time    | Status     | RetryCount | NextRetryTime     | Action
--------|------------|------------|-------------------|----------
14:00   | pending    | 0          | 0                 | Added to queue
14:05   | processing | 0          | 0                 | Attempting upload
14:05   | pending    | 1          | 14:05:05          | Upload failed, retry in 3s
14:05:05| processing | 1          | 14:05:05          | Attempting upload again
14:05:07| SUCCESS    | 1          | 14:05:07          | Deleted from queue
```

---

## 🔗 Sync When Online

### Automatic Triggering

The sync happens automatically in these scenarios:

#### 1. Network Changes
```typescript
NetInfo.addEventListener(state => {
  if (state.isConnected && state.isInternetReachable) {
    // Network just became available
    uploadQueueManager.processQueue();  // Start syncing
  }
});
```

#### 2. Time-Based (Background)
```typescript
// Periodically check queue (every 30 seconds)
setInterval(() => {
  uploadQueueManager.processQueue();
}, 30000);
```

#### 3. Manuel Action
```typescript
// When user opens app or presses "Sync" button
uploadQueueManager.processQueue();
```

### Sync Workflow

```
User Comes Online
       ↓
NetInfo detects: isConnected=true, isInternetReachable=true
       ↓
processQueue() called
       ↓
SELECT * FROM uploadQueue WHERE status IN ('pending', 'failed')
       ↓
For each item not yet synced:
  ├─ Check nextRetryTime (if too soon, skip)
  ├─ Read image file from disk
  ├─ Upload to API
  ├─ Mark successful in valuation_captured_media (uploadStatus='uploaded')
  ├─ Delete from uploadQueue (job done!)
  └─ Emit status update for UI refresh
       ↓
valuation_progress.uploadedCount updated
       ↓
Hook detects change → ValuatedLeads screen refreshes
       ↓
User sees "4/20" instead of "0/20" (progress updated!)
```

### User Experience During Sync

```
Scenario: User has 5 pending uploads, was offline for 2 hours

Before syncing:
- ValuatedLeads: 0/20 uploaded
- Images visible with "Captured" but not "✓ Uploaded" indicator

During syncing (after coming online):
- ValuatedLeads: [Updates as each uploads]
  - 1/20
  - 2/20
  - 3/20
  - ... etc

After all synced:
- ValuatedLeads: 5/20 (all synced)
- Images show "✓ Uploaded" indicator
- All queue items deleted from uploadQueue
```

---

## 📱 Complete Offline Scenario

### Real-World Example: User with No Internet

**Time 14:00 - User on 4WD Valuation**
```
Situation: In remote area, no internet
App State: Offline mode
├─ WiFi: Off
├─ Cellular: Off (No Signal)
└─ API calls: Can't reach server
```

**Step 1: User Captures Odometer (14:00)**
```
Action: Clicks "Odometer" card → Camera → Takes photo → Proceed

Backend:
├─ saveImageLocally()
│   └─ File saved: /data/data/com.kwikcheck/files/L123-Odometer.jpg ✓
├─ upsertCapturedMedia(L123, 'Odometer', uri)
│   └─ Database saved:
│       valuation_captured_media:
│       [id=L123-Odometer,
│        side='Odometer',
│        uploadStatus='pending',
│        localUri='/data/.../L123-Odometer.jpg']  ✓
├─ queueImageForUpload()
│   └─ uploadQueue.manager.addToQueue()
│       └─ Database saved:
│          uploadQueue:
│          [id=Q1-L123-O,
│           leadId='L123',
│           filePath='/data/.../L123-Odometer.jpg',
│           paramName='OdometerBase64',
│           status='pending',
│           nextRetryTime=0]  ✓
└─ processQueue()
    └─ Checks: isConnected=false
       → Exits without uploading
       → Nothing happens (offline)

User UI:
├─ Odometer card shows: 📸 (image icon - captured)
├─ No upload indicator yet (no internet to upload)
└─ ValuatedLeads shows: 0/20 (no uploads completed)
```

**Step 2: User Captures Dashboard (14:05)**
```
Same as Step 1, but for Dashboard side

After capture:
- 2 files on device: L123-Odometer.jpg, L123-Dashboard.jpg
- 2 rows in captured_media: both uploadStatus='pending'
- 2 rows in uploadQueue: both status='pending', nextRetryTime=0
- User UI: 2 cards show 📸
- ValuatedLeads: 0/20 (no uploads yet)
```

**Step 3: User Captures FrontView (14:10)**
```
Same pattern

After capture:
- 3 files, 3 DB rows, 3 queue items
- User UI: 3 cards have images
- ValuatedLeads: 0/20
```

**Step 4: User Leaves Remote Area, Gets WiFi (14:45)**
```
Situation: Enters town with WiFi

NetInfo detects: isConnected=true, isInternetReachable=true ✓

Automatic sync triggered:
├─ processQueue() called
├─ Reads uploadQueue: 3 pending items
├─ For each item:
│  ├─ Read file: L123-Odometer.jpg → base64 string
│  ├─ Upload to API: POST /valuation/upload
│  │   └─ Response: { success: true }
│  ├─ markMediaAsUploaded(L123, 'Odometer')
│  │   └─ Updates captured_media:
│  │       uploadStatus='uploaded', uploadedAt=now ✓
│  └─ Delete from uploadQueue ✓
├─ Repeat for Dashboard and FrontView
└─ All 3 items uploaded successfully!

Databases after sync:
├─ uploadQueue: [empty]
├─ valuation_captured_media:
│   [id=L123-Odometer, uploadStatus='uploaded', uploadedAt=14:45:02]
│   [id=L123-Dashboard, uploadStatus='uploaded', uploadedAt=14:45:04]
│   [id=L123-FrontView, uploadStatus='uploaded', uploadedAt=14:45:06]
└─ valuation_progress:
    [leadId=L123, uploadedCount=3]

User UI (Automatic Update):
├─ Each card: 📸 → ✅ (shows checkmark as uploaded)
└─ ValuatedLeads: 3/20 (progress updated!)
```

**Step 5: User Goes Offline Again (15:00)**
```
Situation: Leaves town, loses WiFi

User captures FrontView again (side already captured before)

Backend:
├─ New file saved but same name: /data/.../L123-FrontView.jpg
├─ upsertCapturedMedia(): REPLACE (UNIQUE constraint)
│   └─ Same DB row updated: uploadStatus='pending' (resets)
└─ Added to queue again
    └─ Queue has 1 new item: FrontView

User UI:
├─ FrontView card: 📸 (fresh capture, uploadStatus=pending)
├─ Odometer, Dashboard: ✅ (still uploaded from earlier)
└─ ValuatedLeads: 2/20 (FrontView reverted from uploaded to pending)
```

**Step 6: User Gets Internet Again (16:30)**
```
NetInfo: isConnected=true ✓

Sync triggered:
├─ processQueue(): 1 pending item (FrontView)
├─ Upload succeeds
├─ Marked as uploaded
└─ Queue emptied

Final State:
├─ valuation_progress: L123, uploadedCount=3
├─ All 3 sides in captured_media: uploadStatus='uploaded'
├─ uploadQueue: empty
└─ User UI: ✅✅✅ All 3 cards showing checkmarks, ValuatedLeads: 3/20
```

---

## 🛠️ Key Technologies

### 1. react-native-fs
**Purpose**: Read/write files to device storage

```typescript
import RNFS from 'react-native-fs';

// Save image
await RNFS.writeFile(
  `${RNFS.DocumentDirectoryPath}/L123-Odometer.jpg`,
  base64String,
  'base64'
);

// Read image for upload
const base64 = await RNFS.readFile(filePath, 'base64');

// Check if file exists
const exists = await RNFS.exists(filePath);
```

**Why It's Needed**: 
- Stores images persistently (not in RAM)
- DocumentDirectoryPath automatically points to private app storage
- Survives app crashes, cache clear, device restart

### 2. react-native-sqlite-storage
**Purpose**: SQLite database for queues and metadata

```typescript
import SQLite from 'react-native-sqlite-storage';

// Open/create database
const db = await SQLite.openDatabase('uploadQueue.db');

// Insert item to queue
await db.executeSql(
  'INSERT INTO uploadQueue (id, leadId, filePath, ...) VALUES (?, ?, ?, ...)',
  [id, leadId, filePath, ...]
);

// Read pending items
const [result] = await db.executeSql(
  'SELECT * FROM uploadQueue WHERE status = ?',
  ['pending']
);
```

**Why It's Needed**:
- Stores queue items persistently
- Can query/filter items (e.g., "get all pending")
- Atomic transactions (all-or-nothing updates)
- Survives app restart, memory cleanup, crash

### 3. @react-native-community/netinfo
**Purpose**: Monitor network connectivity

```typescript
import NetInfo from '@react-native-community/netinfo';

// Check current state
const state = await NetInfo.fetch();
// {isConnected: true, isInternetReachable: true, type: 'wifi'}

// Listen for changes
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    // Do something with internet
  }
});
```

**Why It's Needed**:
- Detects when internet becomes available
- Triggers automatic sync
- Avoids wasting battery trying to upload when offline
- App-level network awareness

### 4. react-native-vision-camera v3
**Purpose**: Capture photos/videos

```typescript
// Takes photo, returns URI
const photo = await cameraRef.current?.takePhoto({
  qualityPrioritization: 'speed'
});
// photo.path = /cache/photos/IMG_1234.jpg

// Read as base64
const base64 = await RNFS.readFile(photo.path, 'base64');
```

**Why It's Needed**:
- Native camera with full control
- Orientation locking (landscape for best angle)
- High-quality output

### 5. Custom uploadQueue.manager.ts
**Purpose**: Orchestrates the entire offline queue system

```typescript
// Initialize
uploadQueueManager.init();

// Add item
uploadQueueManager.addToQueue({ leadId, filePath, paramName, ... });

// Process (uploads all pending)
uploadQueueManager.processQueue();

// Listen for status changes
uploadQueueManager.subscribe((count) => {
  console.log(`${count} items remaining in queue`);
});
```

**Why It's Needed**:
- Central manager for all upload operations
- Coordinates file I/O, database, API, and network
- Implements retry logic
- Emits events for UI updates

---

## 🔧 How to Modify Offline Behavior

### Scenario 1: Change Retry Delays

**File**: `src/services/uploadQueue.manager.ts`

**Find**: `calculateRetryDelay()` method

```typescript
// CURRENT:
private calculateRetryDelay(retryCount: number): number {
  const delayMap = {
    0: 1000,      // 1 second
    1: 3000,      // 3 seconds
    2: 5000,      // 5 seconds
    3: 10000,     // 10 seconds
    4: 30000,     // 30 seconds
  };
  return delayMap[retryCount] || 60000;
}

// MODIFY: Make retries faster
private calculateRetryDelay(retryCount: number): number {
  const delayMap = {
    0: 500,       // 0.5 seconds (FASTER)
    1: 1000,      // 1 second (FASTER)
    2: 3000,      // 3 seconds
    3: 5000,      // 5 seconds
    4: 10000,     // 10 seconds (REMOVED 30s)
  };
  return delayMap[retryCount] || 60000;
}
```

### Scenario 2: Change Retry Count Limit

**File**: `src/services/uploadQueue.manager.ts`

**Find**: `handleItem()` method

```typescript
// CURRENT:
const maxRetries = 5;  // Try up to 5 times

if (nextRetryCount >= maxRetries) {
  await this.updateItemStatus(item.id, 'failed');
  console.error(`Max retries reached`);
}

// MODIFY: Allow more retries
const maxRetries = 10;  // Try up to 10 times
// Or fewer:
const maxRetries = 3;   // Try only 3 times
```

### Scenario 3: Change Queue Processing Interval

**File**: `App.tsx` or main initialization file

**Find**: `setInterval()` for queue processing

```typescript
// CURRENT:
const interval = setInterval(() => {
  uploadQueueManager.processQueue();
}, 30000);  // Every 30 seconds

// MODIFY: Check more frequently
const interval = setInterval(() => {
  uploadQueueManager.processQueue();
}, 5000);   // Every 5 seconds (more responsive, more battery usage)

// Or less frequently:
const interval = setInterval(() => {
  uploadQueueManager.processQueue();
}, 60000);  // Every 60 seconds (less responsive, saves battery)
```

### Scenario 4: Don't Retry Failed Uploads

**File**: `src/services/uploadQueue.manager.ts`

**Find**: In `handleItem()`, the catch block

```typescript
// CURRENT:
catch (error) {
  const nextRetryCount = item.retryCount + 1;
  const maxRetries = 5;
  
  if (nextRetryCount >= maxRetries) {
    await this.updateItemStatus(item.id, 'failed');
  } else {
    // Schedule retry...
  }
}

// MODIFY: Never retry (fail immediately)
catch (error) {
  // Don't retry at all
  await this.updateItemStatus(item.id, 'failed');
  console.error(`Upload failed, not retrying`);
}
```

### Scenario 5: Only Retry on WiFi

**File**: `src/services/uploadQueue.manager.ts`

**Find**: `processQueue()` method

```typescript
// CURRENT:
async processQueue() {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return;
  }
  // ... rest of processing
}

// MODIFY: Only on WiFi
async processQueue() {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected || netInfo.type !== 'wifi') {
    console.log('📶 Not on WiFi, pausing uploads');
    return;
  }
  // ... rest of processing
}
```

### Scenario 6: Change File Storage Location

**File**: `src/components/CustomCamera.tsx` or `src/utils/storage.ts`

```typescript
// CURRENT:
import RNFS from 'react-native-fs';

const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
// Saves to: /data/data/com.kwikcheck/files/

// MODIFY: Save to external storage (larger space)
const filePath = `${RNFS.ExternalStorageDirectoryPath}/${fileName}`;
// Saves to: /sdcard/Android/data/com.kwikcheck/

// Or picture directory:
const filePath = `${RNFS.PicturesDirectoryPath}/${fileName}`;
// Saves to: /sdcard/Pictures/
```

### Scenario 7: Add Upload Size Limit

**File**: Create new file `src/utils/uploadValidator.ts`

```typescript
export const validateFileSize = async (filePath: string): Promise<boolean> => {
  const fileInfo = await RNFS.stat(filePath);
  const fileSizeInMB = fileInfo.size / (1024 * 1024);
  
  const MAX_SIZE_MB = 5;  // Maximum 5MB per image
  
  if (fileSizeInMB > MAX_SIZE_MB) {
    console.error(`File too large: ${fileSizeInMB}MB > ${MAX_SIZE_MB}MB`);
    return false;
  }
  
  return true;
};

// In handleItem():
const isValid = await validateFileSize(item.filePath);
if (!isValid) {
  await this.updateItemStatus(item.id, 'failed');
  return;  // Don't upload
}
```

### Scenario 8: Run Queue in Background

**File**: `src/services/uploadQueue.manager.ts`

```typescript
// CURRENT: Only processes when app is active

// MODIFY: Use react-native-background-task
import BackgroundTask from 'react-native-background-task';

BackgroundTask.define(async () => {
  console.log('🔄 Background task running');
  await uploadQueueManager.processQueue();
});

// Schedule to run every 15 minutes
BackgroundTask.schedule({
  period: 15 * 60 * 1000  // 15 minutes
});
```

---

## 🐛 Debugging Offline Mode

### Check Files on Device
```bash
# Connect via ADB
adb shell

# List image files
ls -la /data/data/com.kwikcheck/files/

# Get file details
stat /data/data/com.kwikcheck/files/L123-Odometer.jpg
```

### Check Queue Database
```bash
# Pull database
adb pull /data/data/com.kwikcheck/databases/uploadQueue.db ./

# Open in DB Browser for SQLite
# View uploadQueue table to see pending items
```

### Check Current Network State
```typescript
// Add to component
import NetInfo from '@react-native-community/netinfo';

useEffect(() => {
  NetInfo.fetch().then(state => {
    console.log('Network State:', {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type
    });
  });
}, []);
```

### Monitor Queue Processing
```typescript
// In uploadQueue.manager.ts, add to processQueue():
console.log('📊 Queue Debug Info');
console.log(`  Pending items: ${pendingItems.length}`);
console.log(`  Network: ${netInfo.isConnected}`);
console.log(`  Internet: ${netInfo.isInternetReachable}`);
console.log(`  Type: ${netInfo.type}`);
pendingItems.forEach(item => {
  console.log(`  - ${item.paramName}: retry=${item.retryCount}, nextRetry=${new Date(item.nextRetryTime)}`);
});
```

---

## 📋 Offline Feature Checklist

Use this to verify offline mode works:

**Before Going Offline:**
- [ ] Enable Airplane Mode (or disable WiFi+Cellular)
- [ ] Open app and navigate to ValuationPage
- [ ] Capture at least 3-5 images

**While Offline:**
- [ ] Images saved with correct file names (adb shell ls)
- [ ] Queue database has entries (upload pull uploadQueue.db)
- [ ] ValuatedLeads shows 0/20 (no uploads yet)
- [ ] No error messages in logs
- [ ] App doesn't crash when trying to upload

**Restoring Connection:**
- [ ] Turn off Airplane Mode / Enable WiFi

**After Coming Online:**
- [ ] Queue automatically starts processing (check logs)
- [ ] Files upload to API successfully
- [ ] ValuatedLeads updates: 1/20 → 2/20 → 3/20 → etc
- [ ] Upload indicators change from "Captured 📸" to "Uploaded ✅"
- [ ] Queue becomes empty (SELECT * shows no rows)
- [ ] No failed uploads in queue

**Robustness Test:**
- [ ] Toggle WiFi off/on during upload → Should resume
- [ ] Kill app during upload → Queue should resume on restart
- [ ] Clear app cache while offline → Files still exist, queue still exists
- [ ] Capture new images while syncing → These also queue and sync

---

## 🎯 Quick Summary

**Three-Layer Offline Architecture**:

1. **Files** (`react-native-fs`) - Images stored on device, not RAM
2. **Queue DB** (`sqlite-storage`) - List of pending uploads stored persistently
3. **Manager** (`uploadQueue.manager.ts`) - Orchestrates uploads with retry logic

**Network Detection** (`NetInfo`):
- Monitors WiFi/cellular changes
- Automatically triggers queue processing when online
- Runs as background service

**Retry Strategy** (Exponential Backoff):
- 1s, 3s, 5s, 10s, 30s delays between attempts
- Max 5 retries, then mark as failed

**User Experience**:
- Capture images offline → Files saved locally, queued
- Come online → Automatic sync, progress bar updates
- No data loss, no manual intervention

---

## 📞 Quick Reference

| Task | Technology | File |
|------|-----------|------|
| Store images | react-native-fs | CustomCamera.tsx |
| Queue uploads | react-native-sqlite | uploadQueue.db |
| Detect online/offline | NetInfo | App.tsx |
| Manage queue | Custom manager | uploadQueue.manager.ts |
| Retry logic | Custom implementation | uploadQueue.manager.ts |

**You can now:**
✅ Understand how offline images work
✅ Understand how queue system works
✅ Understand how sync happens when online
✅ Modify retry logic, network behavior, file storage
✅ Debug using ADB commands and logs
