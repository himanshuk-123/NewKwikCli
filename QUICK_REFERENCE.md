# Quick Reference - Valuation Feature Implementation

## 🎯 What Was Implemented

**Direct API image upload for KwikCheck CLI app (online-only, no local storage)**

---

## 📂 Key Files Changed

| File | What Changed | Impact |
|------|-------------|--------|
| `src/components/CustomCamera.tsx` | Added direct API upload logic | Images now sent to API immediately on Proceed |
| `src/features/valuation/ValuationPage.tsx` | Completely replaced with proper implementation | Proper UI, upload tracking, navigation |
| `src/features/valuation/api/valuation.api.ts` | Enhanced upload function | Handles dynamic param names & geolocation |
| `src/utils/geolocation.ts` | NEW - Geolocation utility | Gets device location with fallback |
| `src/pages/Camera/CameraPage.tsx` | Minor cleanup | Routes params correctly |

---

## ⚡ Key Features

✅ User clicks image card → Opens camera  
✅ Takes photo → Preview shows  
✅ Clicks Proceed → Image converts to Base64  
✅ API uploads directly (no local storage)  
✅ Success → Returns to ValuationPage with ✅ checkmark  
✅ Can re-upload same card  
✅ Shows upload count: "Next (1/4 uploaded)"  

---

## 🔌 API Integration

**Endpoint:** `POST /App/webservice/DocumentUploadOtherImageApp`

**Example Request:**
```json
{
  "LeadId": "12345",
  "Version": "2",
  "OdometerBase64": "iVBORw0KGgo...[base64]...",
  "VehicleTypeValue": "4W",
  "geolocation": "{\"lat\": \"28.6139\", \"long\": \"77.2090\", \"timeStamp\": \"2025-01-27T10:30:00Z\"}"
}
```

**Param Name Construction:**
- AppColumn from API: `"Odometer"`
- Becomes API param: `"OdometerBase64"`
- Formula: `${appColumn}Base64`

---

## 🛠️ How It Works

### **1. ValuationPage**
```
Fetches steps → Displays image cards (🚗)
User clicks → Navigate to Camera with:
  - id (leadId)
  - side (step name)
  - vehicleType
  - appColumn (for API param name)
```

### **2. CustomCamera**
```
Takes photo → Convert to Base64
Get geolocation (fallback: 0,0)
Call API with params
Success → Return with uploadSuccess=true
Error → Show toast
```

### **3. Back to ValuationPage**
```
Receives uploadSuccess flag
Updates uploadedSides Set
Card shows ✅ (green background)
Button shows count: "Next (1/4 uploaded)"
```

---

## 🔐 Authentication

TOKENID is **auto-added** by axios interceptor:
```typescript
// No manual work needed!
// Just store it in AsyncStorage as usual
await AsyncStorage.setItem('user_credentials', JSON.stringify({ TOKENID: "..." }))
```

---

## 📝 Route Flow

```
MyTasks
  ↓
navigate("Valuate", { leadId, vehicleType, displayId })
  ↓
ValuationPage
  ├─ fetch steps from store
  ├─ display image cards
  ├─ user clicks card
  └─ navigate("Camera", { id, side, vehicleType, appColumn })
      ↓
    CustomCamera
      ├─ capture image
      ├─ convert to base64
      ├─ upload to API
      └─ navigate back with uploadSuccess=true
        ↓
      ValuationPage receives params
      ├─ setUploadedSides (add side)
      └─ show ✅ on card
```

---

## ⚠️ Important Notes

1. **No Local Storage** - Images only in RAM, deleted after upload
2. **Online Only** - Requires internet connection
3. **AppColumn Required** - Must come from API AppStepList response
4. **TOKENID Required** - User must be authenticated
5. **Geolocation Optional** - Fallback to (0, 0) if unavailable
6. **One Image Per Card** - Replacing previous if re-uploaded

---

## 🧪 Testing Quick Steps

```bash
# 1. Build app
npm run android  # or run-ios

# 2. Login (sets TOKENID in AsyncStorage)

# 3. MyTasks → Click Valuate

# 4. Click image card

# 5. Take photo → Click Proceed

# 6. Watch network call (should show in DevTools)

# 7. See ✅ checkmark on card back in ValuationPage

# 8. Verify image in backend database
```

---

## 🐛 Debugging

**Check Console:**
```typescript
[API] Upload Params: { LeadId, ParamName, Base64Length, ... }
[API] Upload Response: { ERROR: "0", MESSAGE: "..." }
[Upload] Success: { ... }
```

**Check Network Tab:**
- Method: POST
- URL: .../DocumentUploadOtherImageApp
- Body: JSON with base64 image data
- Response: { ERROR: "0", MESSAGE: "Image uploaded successfully" }

---

## 📚 Documentation Files

- `VALUATION_FEATURE_SUMMARY.md` - Detailed guide
- `VALUATION_IMPLEMENTATION.md` - Architecture & flow
- This file - Quick reference

---

## ✅ Ready to Use!

All components properly integrated. Just:
1. ✅ Install dependencies (already done)
2. ✅ Build and run
3. ✅ Test the feature
4. ✅ Verify API calls in backend

---
