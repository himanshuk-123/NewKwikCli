# Offline/Online Upload Feature Integration

## Overview

Your app now has a complete offline-first upload system that works seamlessly in both online and offline modes.

## Architecture

### 1. **Database Layer** (`src/database/uploadQueue.db.ts`)
- **SQLite Database** for persistent queue storage
- Stores pending uploads with retry count and geolocation
- Survives app restarts

### 2. **Manager Layer** (`src/services/uploadQueue.manager.ts`)
- **Core upload processor**
- Monitors network connectivity
- Implements retry logic (up to 5 times)
- Concurrent upload handling (max 2 simultaneous)
- Auto-cleanup on successful upload

### 3. **Camera Components** (Fixed)
Both `CustomCamera.tsx` and `VideoCamera.tsx` now properly integrate with the offline/online system

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER CAPTURES IMAGE/VIDEO                │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│          SAVE TO LOCAL STORAGE (imageHandler.ts)             │
│    • Saves to CachesDirectory/valuation_images/               │
│    • Unique filename with timestamp                          │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│       UPDATE ZUSTAND STORE (markLocalCaptured)              │
│    • Shows image in UI immediately                          │
│    • Local truth for UI display                             │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│       ADD TO UPLOAD QUEUE (uploadQueue.manager.ts)          │
│    • Stores in SQLite database                              │
│    • Includes geolocation & paramName                       │
│    • Sets status to 'pending'                               │
└─────────────────────────────────────────────────────────────┘
                             ↓
              ┌──────────────┴──────────────┐
              ↓                             ↓
        ╔═════════════╗             ╔═════════════╗
        ║   ONLINE    ║             ║   OFFLINE   ║
        ╚═════════════╝             ╚═════════════╝
              ↓                             ↓
        • Uploads via API            • Queued locally
        • Updates status             • Waits for connection
        • Deletes from queue         • Auto-processes when
        • Cleans up file               network available
              ↓                             ↓
              └──────────────┬──────────────┘
                             ↓
                   ╔═════════════════╗
                   ║  SUCCESS/RETRY  ║
                   ╚═════════════════╝
                   • Max 5 retries
                   • Exponential backoff
```

---

## Key Changes Made

### 1. **CustomCamera.tsx** ✅
```javascript
// BEFORE (WRONG)
const { markSideAsUploaded } = useValuationStore();
await uploadQueueManager.addToQueue({
  type: 'image',
  leadId: id,
  vehicleTypeValue: vehicleType,  // ❌ Wrong key
  paramName,
  fileUri: imageUri,
  geolocation,                     // ❌ Wrong structure
});

// AFTER (CORRECT)
const { markLocalCaptured } = useValuationStore();
await uploadQueueManager.addToQueue({
  type: 'image',
  fileUri: imageUri,
  leadId: id,
  paramName,
  vehicleType: vehicleType || '',  // ✅ Correct key
  geo,                              // ✅ Correct structure
});
```

### 2. **VideoCamera.tsx** ✅
- Same fixes applied
- Uses `markLocalCaptured` instead of `markSideAsUploaded`
- Correct queue parameter structure
- Fixed dependency array in `useCallback`

### 3. **imageHandler.ts** ✅
- Added `saveVideoLocally()` function
- Saves videos to platform-specific directories
- Creates unique filenames with timestamps

---

## Parameter Structure

### Queue Item Format (uploadQueue.manager.ts)
```typescript
interface QueueItem {
  type: 'image' | 'video';
  fileUri: string;           // Local file path
  leadId: string;
  paramName: string;         // e.g., "OdometerBase64"
  vehicleType: string;       // e.g., "4W"
  geo: {
    lat: string;
    long: string;
    timeStamp: string;       // ISO format
  };
}
```

---

## Store Integration

### Zustand Store Functions Used
```javascript
// Update UI when image/video is locally saved
markLocalCaptured(side: string, localUri: string)
  ↓
  {
    side: 'Odometer',
    localUri: 'file:///storage/emulated/0/...',
    status: 'pending'
  }

// Update status when upload completes/fails
updateUploadStatus(side: string, status: UploadStatus)
```

---

## Network Handling

### Upload Queue Manager Logic
```
1. Checks network connectivity continuously
2. If OFFLINE:
   - Pauses processing
   - Keeps items in queue (SQLite)
   - Waits for connection
3. If ONLINE:
   - Processes pending items
   - Max 2 concurrent uploads
   - Automatic retry with exponential backoff
```

### Retry Strategy
- **Attempt 1**: Immediate
- **Attempt 2**: After 1 second
- **Attempt 3**: After 3 seconds
- **Attempt 4**: After 5 seconds
- **Attempt 5**: After 10 seconds
- **Final attempt**: After 30 seconds
- **If all fail**: Mark as `failed_permanent`

---

## User Experience

### Immediate Feedback
- ✅ Image/video saved locally (instant)
- ✅ UI shows uploaded image immediately
- ✅ User can navigate away

### Background Upload
- 📤 Upload happens silently in background
- 🔄 Auto-retry if network fails
- ✔️ Toast notification on success
- ❌ Toast notification on permanent failure

---

## Testing the Feature

### Online Mode
1. Capture image → Immediate local save
2. UI shows image
3. Upload happens in background (check Logcat)
4. Toast shows success

### Offline Mode
1. Turn off WiFi/Mobile data
2. Capture image → Saved locally
3. UI shows image
4. Turn on WiFi/Mobile data
5. Auto-uploads in background

### Offline then Online
1. App offline, capture multiple images
2. All stored in SQLite queue
3. Enable network
4. All images upload automatically

---

## File Structure

```
src/
├── components/
│   ├── CustomCamera.tsx          ✅ FIXED
│   └── VideoCamera.tsx           ✅ FIXED
├── database/
│   └── uploadQueue.db.ts         ✅ SQLite Queue
├── services/
│   └── uploadQueue.manager.ts    ✅ Queue Processor
├── features/valuation/
│   ├── api/
│   │   ├── valuation.api.ts      (AppStepList)
│   │   ├── valuation.images.api.ts (Multipart upload)
│   │   └── valuation.videos.api.ts
│   └── store/
│       └── valuation.store.ts     ✅ Zustand Store
└── utils/
    └── imageHandler.ts            ✅ Save utilities
```

---

## Key Exports

### uploadQueue.manager.ts
```typescript
export class UploadQueueManager {
  async addToQueue(item: {...}): Promise<string>
  subscribe(listener: (count: number) => void): () => void
  async getQueueCount(): Promise<number>
}

export const uploadQueueManager = new UploadQueueManager();
```

### imageHandler.ts
```typescript
export const saveImageLocally(uri, leadId, side): Promise<string | null>
export const saveVideoLocally(uri, leadId): Promise<string | null>
```

---

## Debugging

### Enable Logging
```javascript
// Check console logs
[UploadQueue] Adding to queue: {...}
[UploadQueue] Video queued with ID: ...
[Upload] Image saved locally: ...
[Proceed] Image saved locally: ...
```

### Check Queue Status
```javascript
const count = await uploadQueueManager.getQueueCount();
console.log('Pending uploads:', count);
```

### Monitor Store
```javascript
const { uploadedSides, getSideImage } = useValuationStore();
console.log('Uploaded sides:', uploadedSides);
```

---

## Notes

1. **Base64 Reading**: Happens on-demand during upload (saves AsyncStorage space)
2. **Multipart Upload**: Used for safe large file transfer without base64 in memory
3. **Local Caching**: Images/videos cached in device storage, cleaned up after successful upload
4. **No Manual Cleanup**: Manager handles file deletion after successful upload

---

## Next Steps

1. ✅ Test in online mode
2. ✅ Test in offline mode
3. ✅ Test offline → online transition
4. ✅ Monitor Logcat for debug logs
5. ✅ Check upload queue in ValuationPage (floating button shows count)
