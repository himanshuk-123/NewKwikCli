# Upload Count Fix - Valuation Leads Issue

## Problem
When displaying ValuatedLeads, the app was showing incorrect counts:
- If user captured the same card's image 5 times → showed 5/20 instead of 1/20
- If same card captured multiple times → could show 21/20 (impossible - more uploaded than total cards!)

**Root Cause:** The system was counting **every upload attempt** instead of counting **unique sides/cards**.

```
OLD (BROKEN):
├─ User captures Odometer card
│  └─ totalCount += 1, uploadedCount += 1 → Shows 1/1 ✓
├─ User captures Odometer card AGAIN (retake)
│  └─ totalCount += 1, uploadedCount += 1 → Shows 2/2 ✗ (should be 1/1)
├─ User captures Dashboard card once
│  └─ totalCount += 1, uploadedCount += 1 → Shows 3/3 ✗ (should be 2/2)
└─ Result: 20 total cards + 1 card captured 5 times = Shows 21/20 💥
```

## Solution
Changed from **counting total uploads** to **counting unique sides**.

The fix uses the newly created `captured_media` table which stores data with:
- `leadId` - which lead
- `side` - which side/card (Odometer, Dashboard, FrontView, etc.)
- `uploadStatus` - 'pending' | 'uploaded' | 'failed'
- `UNIQUE(leadId, side)` - Only ONE entry per lead+side combo

### New Functions Added

#### 1. `getActualUniqueCounts(leadId)`
Calculates ACTUAL counts from the database:
```typescript
// Returns actual numbers based on unique sides in captured_media
{
  totalUniqueSides: 20,      // 20 different sides captured
  uploadedUniqueSides: 18    // 18 of them are confirmed uploaded
}
```

**Logic:**
```sql
-- Count DISTINCT sides (each side only counted once)
SELECT COUNT(DISTINCT side) FROM captured_media WHERE leadId = ?
SELECT COUNT(DISTINCT side) FROM captured_media WHERE leadId = ? AND uploadStatus = 'uploaded'
```

#### 2. `syncProgressWithCapturedMedia(leadId)`  
Updates the summary table with actual counts:
```typescript
// Syncs valuation_progress table with real data from captured_media
UPDATE valuation_progress 
SET totalCount = (actual unique sides), 
    uploadedCount = (actual uploaded sides)
WHERE leadId = ?
```

### Updated Hook

#### `useValuationLeads.ts`
Now calculates actual counts instead of using stored values:
```typescript
const { totalUniqueSides, uploadedUniqueSides } = await getActualUniqueCounts(leadId);

// Use actual counts from captured media
const actualTotalCount = totalUniqueSides > 0 ? totalUniqueSides : lead.totalCount;
const actualUploadedCount = totalUniqueSides > 0 ? uploadedUniqueSides : lead.uploadedCount;
```

**Benefits:**
- ✅ Counts UNIQUE sides only (Odometer captured 5 times = 1 unique side)
- ✅ Shows accurate progress (1/20, not 5/20)
- ✅ Impossible to show 21/20 anymore
- ✅ Fallback to stored counts if no media exists yet
- ✅ No data loss or migration needed

## How It Works End-to-End

### Capture Flow (Unchanged)
```
User captures Odometer
  ↓
CustomCamera.tsx calls upsertCapturedMedia(leadId, 'Odometer', uri, 'pending')
  ↓
INSERT OR REPLACE into captured_media with UNIQUE(leadId, side)
  ↓
Previous Odometer entry (if any) is REPLACED, not duplicated
```

### Upload Success Flow (Updated)
```
Upload succeeds
  ↓
uploadQueue.manager.ts calls markMediaAsUploaded(leadId, 'Odometer')
  ↓
Sets uploadStatus='uploaded' for this side
  ↓
When user views ValuatedLeads:
  ├─ Hook calls getActualUniqueCounts(leadId)
  ├─ Query returns: totalUniqueSides=20, uploadedUniqueSides=18
  ├─ Display shows: 18/20 ✓ (CORRECT!)
  └─ No double counting even if Odometer was captured 5 times
```

### Counter Synchronization
1. During valuation, `totalCount` and `uploadedCount` in `valuation_progress` table are updated by upload queue
2. When viewing ValuatedLeads, the hook calculates ACTUAL counts from `captured_media` table
3. The actual counts override stored counts, preventing any drift
4. Optional: Call `syncProgressWithCapturedMedia()` to update stored counts (for performance, currently done by hook on load)

## Data Schema Reference

### valuation_captured_media (Per-Side Tracking)
```
leadId | side      | localUri | uploadStatus | updatedAt | uploadedAt
-------|-----------|----------|--------------|-----------|----------
L123   | Odometer  | /path... | uploaded     | 1707XXX   | 1707XXX
L123   | Dashboard | /path... | pending      | 1707XXX   | null
L123   | FrontView | /path... | uploaded     | 1707XXX   | 1707XXX
```

### valuation_progress (Summary)
```
leadId | regNo    | totalCount | uploadedCount | lastValuated
-------|----------|------------|---------------|-------------
L123   | ABC1234  | 20         | 18            | 2026-02-08
```

When user views ValuatedLeads, the hook RECALCULATES from the captured_media table:
- Counts distinct sides → 20 total
- Counts distinct sides with uploadStatus='uploaded' → 18 uploaded
- Returns 18/20, not the stored values (which could drift)

## Files Modified
1. ✅ `src/database/valuationProgress.db.ts`
   - Added `getActualUniqueCounts()` function
   - Added `syncProgressWithCapturedMedia()` function

2. ✅ `src/hooks/useValuationLeads.ts`
   - Updated to calculate actual counts from unique sides
   - Now calls `getActualUniqueCounts()` for each lead
   - Prevents double-counting same card

## Testing Checklist
- [ ] Capture Odometer card → Shows 1 card in progress
- [ ] Capture Odometer card AGAIN → Still shows 1 card (not 2!)
- [ ] Capture Dashboard card → Shows 2 cards (Odometer confirmed + Dashboard captured)
- [ ] Wait for uploads to complete
- [ ] Open ValuatedLeads → Shows 2/20 (not 2/21 or any impossible number)
- [ ] Retake Odometer (recapture) → Still shows 1 unique side
- [ ] After upload: Shows 2/20 uploaded (both confirmed)
- [ ] If same side uploaded 3 times: Still counts as 1 unique side ✓

## Key Insight
The difference between this fix and the old broken system:

```
❌ OLD: totalCount = count of all queue entries
✅ NEW: totalCount = count of DISTINCT sides in captured_media

❌ OLD: uploadedCount = count of successful uploads (incremented per upload)
✅ NEW: uploadedCount = count of DISTINCT sides with uploadStatus='uploaded'
```

Re-uploading the same side multiple times doesn't increase the total count anymore!
