# Upload Queue Implementation - Complete Guide

## Overview
Implemented a robust, persistent upload queue system for images and videos that:
- ✅ Uploads in background while user continues capturing
- ✅ Survives app shutdown/restart
- ✅ Handles network failures with automatic retry
- ✅ Survives app crashes
- ✅ Shows upload status to user

## Architecture

### 1. Upload Queue Service (`uploadQueueService.ts`)
**Location:** `src/services/uploadQueueService.ts`

**Features:**
- **Persistent Storage:** Queue saved in AsyncStorage, survives app restarts
- **Storage Optimized:** Only file paths stored (not base64) - prevents AsyncStorage overflow
- **On-Demand Reading:** Base64 read from file only during upload
- **Automatic Retry:** 5 attempts with exponential backoff (1s, 3s, 5s, 10s, 30s)
- **Network Monitoring:** Resumes uploads when connection returns
- **Concurrent Uploads:** Maximum 2 simultaneous uploads
- **Status Tracking:** pending → uploading → completed/failed

**Queue Item Structure:**
```typescript
interface UploadQueueItem {
  id: string;
  type: 'image' | 'video';
  leadId: string;
  vehicleTypeValue: string;
  paramName: string;
  fileUri: string; // Local file path - base64 read on-demand
  geolocation: { lat, long, timeStamp };
  retryCount: number;
  status: 'pending' | 'uploading' | 'failed' | 'completed';
  createdAt: number;
  error?: string;
}
```

**⚠️ Important:** Base64 strings are **NOT stored** in AsyncStorage to prevent storage overflow. Images are read on-demand during upload.

## Storage Optimization Strategy

### Problem Solved
**Issue:** AsyncStorage has only ~6MB limit on Android. Base64 images are 1-3MB each.
- ❌ **Before:** Storing base64 = 2-3 images fills AsyncStorage completely
- ✅ **After:** Storing only file paths = 1000+ items can be queued

### How It Works
1. **Image Captured:** Save to device storage → Add file path to queue
2. **Upload Time:** Read base64 from file path on-demand
3. **Upload Success:** Remove item from queue
4. **Upload Failure:** Keep file path (not base64) for retry

### Storage Comparison
```
With Base64 in Queue:
- Item 1: 2.5MB (base64)
- Item 2: 2.8MB (base64)
- Item 3: 0.7MB (base64)
- Total: 6MB → AsyncStorage FULL ❌

With File Paths Only:
- Item 1: 150 bytes (metadata)
- Item 2: 145 bytes (metadata)
- Item 3: 142 bytes (metadata)
- ... (1000 more items)
- Total: ~150KB → AsyncStorage has 5.85MB free ✅
```

**What's Stored in AsyncStorage:**
```json
[
  {
    "id": "1738616400000_abc123",
    "type": "image",
    "leadId": "12345",
    "paramName": "OdometerBase64",
    "fileUri": "/path/to/image.jpg",
    "status": "pending",
    "retryCount": 0,
    "geolocation": {"lat": "12.34", "long": "56.78", "timeStamp": "2026-02-03T..."}
  }
]
```

**✅ Storage Size:** ~100-200 bytes per item (only metadata, no base64)
**✅ Capacity:** Can queue 1000+ items without filling AsyncStorage (6MB limit)

### 2. Integration Points

#### CustomCamera Component
**Changes:**
- Replaced direct API call with `uploadQueueManager.addToQueue()`
- Saves image locally first for immediate UI feedback
- Queues upload in background (only file URI, not base64)
- Base64 conversion happens during upload, not during capture
- User can continue capturing immediately

#### VideoCamera Component
**Changes:**
- Replaced direct API call with `uploadQueueManager.addToQueue()`
- Queues video upload in background
- Auto-navigates back after 60 seconds

#### ValuationPage
**Changes:**
- Added floating upload queue status button (shows when queue has items)
- Badge shows number of pending uploads
- Opens queue status modal

### 3. Upload Queue Status UI
**Location:** `src/components/UploadQueueStatus.tsx`

**Features:**
- Real-time queue status display
- Statistics: Total, Uploading, Pending, Failed
- Individual item status with icons
- Retry failed uploads button
- Error messages display
- Beautiful, professional UI

## User Experience Flow

### Normal Flow (With Internet)
1. User captures image/video
2. Image saved locally (instant UI feedback)
3. Item added to queue and uploaded in background
4. User continues capturing more images
5. Toast notification when upload completes

### Offline Flow
1. User captures image/video
2. Image saved locally (instant UI feedback)
3. Item queued but upload paused (no internet)
4. User sees queue badge showing pending items
5. When internet returns → uploads resume automatically
6. Toast notifications for each successful upload

### App Shutdown/Crash Flow
1. User captures 5 images
2. 2 upload successfully, 3 pending
3. User closes app or app crashes
4. User reopens app
5. Queue automatically loads from AsyncStorage
6. Pending uploads resume automatically

### Network Error Flow
1. Upload fails due to network timeout
2. Item marked as "failed"
3. Automatic retry after 1 second
4. If fails again, retry after 3 seconds
5. Continues up to 5 attempts with increasing delays
6. User can manually retry from queue status UI

## Installation & Setup

### 1. Install Dependencies
```bash
cd kwikcheck
npm install @react-native-community/netinfo
```

### 2. Link Native Modules (if needed)
```bash
npx react-native link @react-native-community/netinfo
```

### 3. Android Permissions
Already added in `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 4. Rebuild App
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

## Testing Scenarios

### Test 1: Normal Upload
1. Open valuation screen
2. Capture 3 images quickly
3. Observe: Images appear immediately, uploads happen in background
4. Check: Queue badge shows count, then disappears when done

### Test 2: Offline Upload
1. Turn off WiFi/Mobile data
2. Capture 2 images
3. Observe: Images appear but queue badge shows 2 pending
4. Turn on internet
5. Observe: Uploads start automatically

### Test 3: App Restart
1. Capture 3 images
2. Close app immediately (before uploads finish)
3. Reopen app
4. Go to valuation screen
5. Observe: Queue button appears, items resume uploading

### Test 4: Retry Failed
1. Turn off internet
2. Capture image (will fail to upload)
3. Wait for 5 retry attempts
4. Turn on internet
5. Tap queue button → "Retry Failed"
6. Observe: Upload succeeds

## Storage Optimization Strategy

### Problem Solved
**Issue:** AsyncStorage has only ~6MB limit on Android. Base64 images are 1-3MB each.
- ❌ **Before:** Storing base64 = 2-3 images fills AsyncStorage completely
- ✅ **After:** Storing only file paths = 1000+ items can be queued

### How It Works
1. **Image Captured:** Save to device storage → Add file path to queue
2. **Upload Time:** Read base64 from file path on-demand
3. **Upload Success:** Remove item from queue
4. **Upload Failure:** Keep file path (not base64) for retry

### Storage Comparison
```
With Base64 in Queue:
- Item 1: 2.5MB (base64)
- Item 2: 2.8MB (base64)
- Item 3: 0.7MB (base64)
- Total: 6MB → AsyncStorage FULL ❌

With File Paths Only:
- Item 1: 150 bytes (metadata)
- Item 2: 145 bytes (metadata)
- Item 3: 142 bytes (metadata)
- ... (1000 more items)
- Total: ~150KB → AsyncStorage has 5.85MB free ✅
```

## Benefits

### For Users
- **Faster workflow:** No waiting for uploads between captures
- **Reliability:** No lost images due to crashes or network issues
- **Transparency:** Can see what's uploading and what failed
- **Peace of mind:** Queue badge shows pending work

### For Developers
- **Simple integration:** Just call `uploadQueueManager.addToQueue()`
- **Automatic retry:** No manual retry logic needed
- **Network aware:** Automatically pauses/resumes
- **Observable:** Subscribe to queue changes for UI updates

## Code Examples

### Adding Image to Queue
```typescript
// Note: No base64String parameter - read on-demand during upload
await uploadQueueManager.addToQueue({
  type: 'image',
  leadId: '12345',
  vehicleTypeValue: 'Car',
  paramName: 'OdometerBase64',
  fileUri: 'file://path/to/image.jpg', // Local file path
  geolocation: { lat: '12.34', long: '56.78', timeStamp: '2026-02-03T...' },
});
```

### Adding Video to Queue
```typescript
await uploadQueueManager.addToQueue({
  type: 'video',
  leadId: '12345',
  vehicleTypeValue: 'Car',
  paramName: 'Video1',
  fileUri: 'file://path/to/video.mp4',
  geolocation: { lat: '12.34', long: '56.78', timeStamp: '2026-02-03T...' },
});
```

### Subscribing to Queue Changes
```typescript
const unsubscribe = uploadQueueManager.subscribe((queue) => {
  console.log('Queue updated:', queue.length, 'items');
});

// Cleanup
return unsubscribe;
```

### Getting Queue Status
```typescript
const status = uploadQueueManager.getQueueStatus();
// {
//   total: 5,
//   pending: 2,
//   uploading: 2,
//   failed: 1,
//   queue: [...items]
// }
```

## Technical Implementation Notes

### Base64 On-Demand Reading
```typescript
// In uploadQueueService.ts
private async readBase64FromFile(fileUri: string): Promise<string> {
  const filePath = fileUri.startsWith('file://') ? fileUri.slice(7) : fileUri;
  const base64 = await RNFS.readFile(filePath, 'base64');
  return base64;
}

// Called only during upload, not during queue addition
if (item.type === 'image') {
  const base64String = await this.readBase64FromFile(item.fileUri);
  await uploadValuationImageApi(base64String, ...);
}
```

### Why This Approach?
1. **Memory Efficient:** Base64 exists in memory only during upload
2. **Storage Efficient:** AsyncStorage never stores large data
3. **Reliable:** Files persist on device until uploaded
4. **Scalable:** Can queue unlimited items

### File Lifecycle
```
Capture → Save to Device Storage (/data/user/0/com.app/files/)
       → Add file path to AsyncStorage queue
       → Upload time: Read base64 from file
       → Upload success: Remove from queue
       → File cleanup: Handled by OS or custom cleanup logic
```

## Future Enhancements (Optional)

1. **Background Fetch:** Use `react-native-background-fetch` for true background uploads when app is closed
2. **Compression Queue:** Add image compression to queue before upload
3. **Priority Uploads:** Mark certain images as high priority
4. **Batch Upload:** Upload multiple images in single API call
5. **Upload Statistics:** Track upload times, success rates, etc.
6. **Pause/Resume:** Manual pause/resume of queue
7. **Clear All:** Button to clear all failed items

## Files Modified

1. ✅ `src/services/uploadQueueService.ts` (NEW) - Queue manager with storage optimization
2. ✅ `src/components/UploadQueueStatus.tsx` (NEW) - Status UI
3. ✅ `src/components/CustomCamera.tsx` - Integrated queue (no base64 in queue)
4. ✅ `src/components/VideoCamera.tsx` - Integrated queue
5. ✅ `src/features/valuation/ValuationPage.tsx` - Added floating button
6. ✅ `package.json` - Added @react-native-community/netinfo

### Key Implementation Details
- **uploadQueueService.ts:** Added `readBase64FromFile()` method using RNFS
- **CustomCamera.tsx:** Removed base64 conversion before queuing
- **Queue Storage:** Only metadata (~150 bytes/item) stored in AsyncStorage

## Next Steps

1. Install NetInfo dependency
2. Rebuild Android app
3. Test all scenarios
4. Deploy to production
