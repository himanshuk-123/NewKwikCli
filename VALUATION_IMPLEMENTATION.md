# Valuation Feature Implementation - KwikCheck CLI App

## Overview
This document explains the **direct API upload** implementation for the Valuation feature in the KwikCheck CLI app. Unlike the Expo version which stores images locally first, this CLI version sends images **directly to the API** without local storage (online-only feature).

---

## 📋 Architecture Changes

### **Flow Diagram**
```
MyTasks Screen
    ↓
Valuation Page (shows image cards grid)
    ↓
User clicks a card (e.g., "Odometer")
    ↓
Navigate to Camera Screen
    ├─ id (leadId)
    ├─ side (card name, e.g., "Odometer")
    ├─ vehicleType (e.g., "4W")
    └─ appColumn (e.g., "Odometer" - used for API param name)
    ↓
Camera Screen
    ├─ Capture image using react-native-vision-camera
    ├─ Convert to Base64
    ├─ Fetch geolocation (with fallback)
    ├─ Call API directly
    └─ Navigate back on success/error
    ↓
Valuation Page
    ├─ Show green checkmark on uploaded card
    ├─ Track uploaded count
    └─ User can upload more or click Next
```

---

## 🔧 Key Components Updated

### 1. **CustomCamera.tsx** (`src/components/CustomCamera.tsx`)

#### Changes:
- Added **`isUploading`** state to track upload progress
- Implemented **`handleUploadImage()`** function:
  - Retrieves TOKENID from AsyncStorage
  - Fetches device geolocation
  - Calls `uploadValuationImageApi()`
  - Navigates back on success with `uploadSuccess: true`
  
- Updated **`handleProceed()`**:
  - Converts image URI to Base64 string
  - Calls `handleUploadImage()` with base64
  - Shows loading indicator while uploading

#### Key Code:
```typescript
const handleUploadImage = async (base64: string) => {
  const userCreds = await AsyncStorage.getItem("user_credentials");
  const tokenId = userCreds ? JSON.parse(userCreds)?.TOKENID : "";
  
  const location = await getLocationAsync();
  const paramName = appColumn ? `${appColumn}Base64` : "OtherBase64";
  
  await uploadValuationImageApi(
    base64,
    paramName,
    id,
    vehicleType,
    geolocation
  );
};
```

---

### 2. **ValuationPage.tsx** (`src/pages/Valuation/ValuationPage.tsx`)

#### Changes:
- Added **`uploadedSides`** state to track which cards have been uploaded
- Listens for **`uploadSuccess`** from Camera screen (passed via route params)
- Updated **`handleCardClick()`** to pass `appColumn` to Camera
- Shows **green checkmark** (✅) on uploaded cards
- Displays **upload count** on Next button

#### Key Code:
```typescript
const handleCardClick = (sideName: string, appColumn: string) => {
  navigation.navigate("Camera", {
    id: leadId,
    side: sideName,
    vehicleType,
    appColumn, // Used for paramName generation
  });
};

// Track uploaded sides
useEffect(() => {
  if (uploadSuccess && uploadedSide) {
    setUploadedSides(prev => new Set(prev).add(uploadedSide));
  }
}, [uploadSuccess, uploadedSide]);
```

---

### 3. **valuation.api.ts** (`src/features/valuation/api/valuation.api.ts`)

#### Changes:
- Updated **`uploadValuationImageApi()`** to handle dynamic param names
- Stringifies geolocation object before sending
- Better error handling and logging
- Validates ERROR field in response

#### Key Code:
```typescript
const params = {
  LeadId: leadId,
  Version: '2',
  [paramName]: base64String, // Dynamic key: e.g., "OdometerBase64"
  VehicleTypeValue: vehicleTypeValue,
  geolocation: JSON.stringify(geolocation),
};

const response = await apiCallService.post({
  service: 'App/webservice/DocumentUploadOtherImageApp',
  body: params,
  headers: { 'Version': '2' }
});
```

---

### 4. **geolocation.ts** (NEW) (`src/utils/geolocation.ts`)

#### Purpose:
- Handles device location retrieval with graceful fallback
- Requests Android location permission if needed
- Returns location in string format for API

#### Key Function:
```typescript
export const getLocationAsync = async (): Promise<LocationCoords> => {
  // Request permission
  const hasPermission = await requestLocationPermission();
  
  // Get position with timeout and cache
  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude.toString(),
          long: position.coords.longitude.toString(),
          timeStamp: new Date().toISOString(),
        });
      },
      (error) => {
        // Fallback to (0,0) on error
        resolve({ lat: '0', long: '0', timeStamp: ... });
      }
    );
  });
};
```

---

## 🔌 API Details

### **Endpoint:**
```
POST https://inspection.kwikcheck.in/App/webservice/DocumentUploadOtherImageApp
```

### **Request Payload:**
```json
{
  "LeadId": "12345",
  "Version": "2",
  "OdometerBase64": "iVBORw0KGgo....[base64 image data]",
  "VehicleTypeValue": "4W",
  "geolocation": "{\"lat\": \"28.6139\", \"long\": \"77.2090\", \"timeStamp\": \"2025-01-27T10:30:00Z\"}"
}
```

### **Headers:**
```
Content-Type: application/json
Version: 2
TokenID: [auto-added by axios interceptor]
```

### **Response:**
```json
{
  "ERROR": "0",
  "MESSAGE": "Image uploaded successfully",
  "DataList": [...]
}
```

**Error Check:**
```typescript
if (response?.ERROR && response.ERROR !== "0") {
  throw new Error(response?.MESSAGE);
}
```

---

## 🎯 Dynamic Parameter Naming

### **How AppColumn Maps to API Param:**

| Step Name | AppColumn | API Param Name |
|-----------|-----------|---|
| Odometer | Odometer | OdometerBase64 |
| Dashboard | Dashboard | DashboardBase64 |
| Engine | Engine | EngineBase64 |
| Front Tyre | FrontTyre | FrontTyreBase64 |

The API param name is **dynamically constructed** as: `${AppColumn}Base64`

This is determined from the `AppStepList` API response in the `Appcolumn` field.

---

## 📱 User Experience Flow

1. **User navigates** from MyTasks → ValuationPage
   - Page shows grid of cards (Odometer, Dashboard, etc.)
   - Each card shows 🚗 icon (not yet uploaded)

2. **User clicks a card** (e.g., Odometer)
   - Navigates to Camera screen
   - Camera starts in back-facing mode
   - User takes photo

3. **User clicks Proceed**
   - Image is converted to Base64
   - Location is fetched
   - API call starts (shows loading spinner)
   - **If success**: Navigates back, card shows ✅

4. **Back on ValuationPage**
   - Odometer card now has ✅ (green background)
   - Button shows "Next (1/4 uploaded)"
   - User can upload more cards or click Next

5. **User can re-upload same card**
   - Clicking an already-uploaded card again opens Camera
   - New upload replaces previous

---

## 🔐 Authentication

**TOKENID** is automatically added by the axios interceptor in `apiCallService.ts`:

```typescript
// From AsyncStorage
const userCreds = await AsyncStorage.getItem('user_credentials');
// Extract: { TOKENID: "abc123...", ... }
// Added to header: TokenID: "abc123..."
```

---

## ⚠️ Error Handling

### **Scenarios Handled:**

| Scenario | Behavior |
|----------|----------|
| Camera permission denied | Shows permission request |
| Capture fails | Toast error, camera stays active |
| Location unavailable | Uses fallback (0, 0) |
| Network error | Toast message, user can retry |
| API rejects (ERROR !== 0) | Shows server message in toast |
| Base64 conversion fails | Shows error, user can retake |

---

## 🚀 Testing Checklist

- [ ] Install camera permissions in AndroidManifest.xml
- [ ] Install location permissions in AndroidManifest.xml
- [ ] Test camera capture with vision-camera
- [ ] Test base64 conversion
- [ ] Test location fetch (mock in dev if needed)
- [ ] Test API call with valid TOKENID
- [ ] Test multiple image uploads
- [ ] Test navigation back to ValuationPage
- [ ] Test checkmark display on uploaded cards
- [ ] Test error toast messages
- [ ] Test network failure fallback

---

## 📦 Dependencies

### **New:**
- `react-native-geolocation-service` (already in package.json)

### **Existing (no changes needed):**
- `react-native-vision-camera` - Camera
- `@react-native-async-storage/async-storage` - Token storage
- `axios` - API calls (via apiCallService)
- `@react-navigation/native` - Navigation

---

## 🔄 Future Enhancements (Offline/Queuing)

When implementing the offline feature:

1. Create **ImageUploadQueue** table in SQLite
2. On API failure, save to queue instead of showing error
3. Implement periodic retry logic
4. Sync when network is available

**Current version is online-only by design.**

---

## 📝 Notes

- No local file storage in this version (as requested)
- Images are not persisted on device
- Each upload is independent
- User must have internet connection
- Location is optional (fallback: 0, 0)
- APP works with existing login/auth system

---
