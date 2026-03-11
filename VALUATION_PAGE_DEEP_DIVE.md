# 🔥 VALUATION PAGE - BRUTAL BREAKDOWN (NO MERCY MODE)

> **Warning**: Agar tu is file ko skip kar raha tha kyunki "bohot badi hai" - that's exactly why you struggle with production code.

Ye file **900+ lines** ki hai. Aur isme **EVERYTHING** hai jo ek real production screen me hona chahiye:

- ✅ Complex state management (Zustand + Local)
- ✅ Database integration (SQLite)
- ✅ Navigation with typed params
- ✅ Modal flows (multiple)
- ✅ Dynamic form rendering
- ✅ Image capture workflow
- ✅ Upload queue integration
- ✅ Progress tracking
- ✅ Sequential unlocking logic

Agar tu isko line-by-line samajh gaya → **tu mid-level me aa gaya hai**

---

## 🎯 FILE KA PURPOSE (PLAIN ENGLISH)

**What it does:**

"Valuation screen jo dikhata hai ki user ne kaunsi photos capture ki, kaunsi baaki hai, aur har photo ke liye questions dikhaata hai."

**Real-world analogy:**

Car inspection app jahan:
- Inspector ko checklist milti hai (FRONT photo, BACK photo, ENGINE photo, etc.)
- Har photo capture karne ke baad questions aate hain ("Condition kya hai?")
- Sabhi photos lene ke baad NEXT button unlock hota hai
- Database me progress save hoti hai (app close/crash bhi ho to session maintain rahe)

---

## 📦 IMPORTS - SKIP MAT KAR

### 🔹 React Native Core
```typescript
import {
  StyleSheet,
  ToastAndroid,
  View,
  Text as RNText,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
```

**Why so many imports?**

❌ Wrong mindset: "Ye to basic hai"
✅ Right mindset: "Production me har component ka purpose hai"

- `ToastAndroid` → User feedback (Android only)
- `Modal` → Condition questions pop karne ke liye
- `ActivityIndicator` → Loading state
- `SafeAreaView` → Notch/status bar safe area

### 🔹 Navigation Hooks
```typescript
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
```

**Critical distinction:**

- `useRoute()` → params READ karta hai (leadId, vehicleType)
- `useNavigation()` → navigate() call karta hai
- `useFocusEffect()` → jab screen focus me aaye tab refresh (like useEffect but screen-aware)

### 🔹 React Core
```typescript
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
```

**Why useRef?**

👉 Line 446 dekh:
```typescript
const processedSidesRef = useRef<Record<string, boolean>>({});
```

👉 **Problem ye hai:**

Agar tu `useState` use karega → re-render trigger hoga
Agar tu simple variable use karega → value persist nahi hogi

👉 **useRef ka magic:**

Value persist hoti hai BINA re-render ke
Perfect for "already processed" tracking

### 🔹 Store + Database
```typescript
import { useValuationStore } from "./store/valuation.store";
import {
  getCapturedMediaByLeadId,
  setTotalCount,
  updateLeadMetadata,
} from "../../database/valuationProgress.db";
```

**Why both?**

| Store (Zustand) | Database (SQLite) |
|----------------|------------------|
| In-memory (fast) | Persistent (survives app close) |
| UI state | Source of truth |
| Current session | Cross-session |

### 🔹 Custom Hooks
```typescript
import useQuestions from "../../services/useQuestions";
```

👉 Ye hook steps data se questions extract karta hai
👉 Logic separation = clean code

### 🔹 Upload Queue
```typescript
import { uploadQueueManager } from "../../services/uploadQueue.manager";
```

👉 Background upload queue
👉 Offline-first architecture ka part

---

## 🎨 ICON MAPPING - SMART DESIGN PATTERN

```typescript
const getCardIcon = (cardName: string): { name: string; color: string; type: 'material' | 'image' } => {
  const normalizedName = cardName?.toLowerCase().trim() || '';
```

### 🔥 Why normalize?

**Backend se aata hai:**
- "FRONT SIDE"
- "Front Side"
- "front side"

**Agar normalize nahi kiya → 3 alag cases handle karne padenge**

### 📌 Icon Selection Logic

```typescript
if (normalizedName.includes('odometer'))
  return { name: 'speedometer', color: '#FF6B6B', type: 'material' };
```

**Pattern:**
1. String match (includes)
2. Icon name
3. Unique color → visual distinction
4. Type → material icons vs custom images

**Why this approach?**

✅ Scalable → naye steps add karna easy
✅ Maintainable → icon change ek jagah karo
✅ Type-safe → TypeScript return type enforce karta hai

---

## 🧩 COMPONENT 1: SELECTOR (SIMPLE COMPONENT)

```typescript
const Selector = ({ keyText, valueText, onPress }: SelectorProps) => {
  return (
    <TouchableOpacity style={styles.selectorContainer} onPress={onPress}>
      <RNText style={styles.selectorLabel}>{keyText}</RNText>
      <RNText style={styles.selectorValue}>
        {valueText || "Select..."}
      </RNText>
    </TouchableOpacity>
  );
};
```

**Purpose:**

Optional Information questions ke liye (jahan images nahi chahiye, bas answers)

**Real example:**

```
Key: "Any major accident history?"
Value: "No" (selected) or "Select..." (not selected)
```

**Why separate component?**

❌ Code duplication avoid
✅ Reusable
✅ Props-driven (testable)

---

## 🧩 COMPONENT 2: CONDITION MODAL (COMPLEX BEAST)

### 📍 Purpose

Jab user photo capture karta hai → modal dikhaata hai questions

**3 types of questions:**

1. **Odometer** → Number input + Key availability
2. **Chassis Plate** → Text input
3. **Condition** → Multiple choice (Good/Average/Poor)

### 🔑 Props Interface

```typescript
interface ConditionModalProps {
  open: boolean;
  sideName: string;
  questionsData: AppStepListDataRecord | null;
  onSubmit: (payload: {...}) => void;
  onClose: () => void;
}
```

**Critical prop: `questionsData`**

👉 Isme backend se questions + answers aate hain
👉 Format:
```typescript
{
  Name: "ODOMETER",
  Questions: ["Enter odometer reading", "Are keys available?"],
  Answer: "Good/Average/Poor",
  Appcolumn: "Odometer"
}
```

### 🎯 Local State Management

```typescript
const [selectedAnswer, setSelectedAnswer] = useState<string>("");
const [odometerReading, setOdometerReading] = useState<string>("");
const [keyAvailable, setKeyAvailable] = useState<string>("");
const [chassisPlate, setChassisPlate] = useState<string>("");
```

**Why 4 separate states?**

👉 Different input types → different validation rules
👉 Odometer = number + dropdown
👉 Chassis = text
👉 Condition = radio buttons

### ⚡ Form Reset on Modal Close

```typescript
useEffect(() => {
  if (!open) {
    setSelectedAnswer("");
    setOdometerReading("");
    setKeyAvailable("");
    setChassisPlate("");
  }
}, [open]);
```

**Why this pattern?**

❌ Agar reset nahi kiya → next modal open hone pe purani values dikhti hain
✅ Clean slate harbaar

### 🔥 CRITICAL FIX - MODAL WITHOUT QUESTIONS

```typescript
// ✅ UPDATED: Allow modal to open even without questions data
if (!questionsData) {
  return null;
}

const hasQuestions = Boolean(questionsData.Questions);
```

**Real problem:**

Backend ne questions nahi diye → modal crash ho raha tha

**Solution:**

1. Check if questions exist
2. If no questions → show "Image Captured ✓" message
3. Allow user to close modal (no validation)

### 🎛️ Dynamic Form Rendering

#### **Case 1: Odometer**

```typescript
if (isOdometer && Array.isArray(questions)) {
  return (
    <>
      <TextInput
        keyboardType="numeric"
        value={odometerReading}
        onChangeText={(value) => {
          setOdometerReading(value);
          setSelectedAnswer(value); // 👈 Smart move
        }}
      />
      {/* Key availability dropdown */}
    </>
  );
}
```

**Why `setSelectedAnswer(value)` bhi?**

👉 Final payload me `selectedAnswer` chahiye
👉 Sync rakhna important hai

#### **Case 2: Chassis Plate**

```typescript
if (isChassisPlate) {
  return (
    <TextInput
      placeholder="Chassis Plate"
      value={chassisPlate}
      onChangeText={setChassisPlate}
    />
  );
}
```

Simple text input. No tricks.

#### **Case 3: Condition (Good/Average/Poor)**

```typescript
if (!isOdometer && !isChassisPlate) {
  const answers = normalizedAnswers
    .split('/')
    .map((item: string) => item.trim())
    .filter(Boolean);

  return answers.map((answer, index) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.optionButton,
        selectedAnswer === answer && styles.optionButtonSelected,
      ]}
      onPress={() => setSelectedAnswer(answer)}
    />
  ));
}
```

**Dynamic button generation:**

Backend sends: `"Good/Average/Poor"`
→ Split by `/`
→ Create buttons dynamically

**Why `filter(Boolean)`?**

👉 Empty strings remove ho jaate hain
👉 Split se sometimes `""` aa jaata hai

### ✅ Submit Handler - VALIDATION LOGIC

```typescript
const handleSubmit = () => {
  // ✅ If no questions, just close the modal
  if (!hasQuestions) {
    onSubmit({});
    onClose();
    return;
  }

  if (isOdometer) {
    if (!odometerReading.trim() || !keyAvailable.trim()) {
      ToastAndroid.show("Please enter odometer and select key availability", ToastAndroid.SHORT);
      return;
    }
    onSubmit({
      odometerReading,
      keyAvailable,
      selectedAnswer: selectedAnswer || odometerReading,
    });
    // Reset states
    setOdometerReading("");
    setKeyAvailable("");
    setSelectedAnswer("");
    onClose();
    return;
  }

  // Similar for chassis plate and condition...
};
```

**Validation ladder:**

1. No questions → allow submit
2. Odometer → both fields required
3. Chassis → text required
4. Condition → option selected

**Why reset AFTER submit?**

✅ User ko feedback dikhta hai
✅ Modal smoothly close hota hai
❌ Reset BEFORE submit → values gayab ho jaate hain

---

## 🧩 COMPONENT 3: OPTIONAL INFO MODAL

### Purpose

Jahan images **nahi** chahiye, sirf answers (like "Major accident?" → Yes/No)

### Key Code

```typescript
const options = (Answers || "")
  .replaceAll("~", "/")
  .split("/")
  .map((item) => item.trim())
  .filter(Boolean);
```

**Why `replaceAll("~", "/")`?**

👉 Backend inconsistency
👉 Kabhi `~` separator use karta hai, kabhi `/`
👉 Normalize kar rahe hain

---

## 🃏 COMPONENT 4: VALUATE CARD

### Purpose

Har photo card dikhata hai (FRONT, BACK, ENGINE, etc.)

### Props

```typescript
{
  text: "FRONT SIDE",
  id: "12345",
  vehicleType: "4 Wheeler",
  isDone: "file:///storage/abc.jpg", // agar captured hai
  isClickable: true, // agar unlock hai
  appColumn: "FrontSide",
  isUploading: false,
  uploadStatus: 'pending' | 'uploaded' | 'failed'
}
```

### 🔥 Sequential Unlocking Logic

```typescript
if (!isClickable && !isDone) {
  ToastAndroid.show("Please complete previous steps first", ToastAndroid.SHORT);
  return;
}
```

**Rule:**

Pehli photo leni zaroori → then next unlock hoga

**Why?**

✅ User ko structured flow milta hai
✅ Galat sequence me photos nahi le sakta
❌ Random clicking allowed nahi

### 📸 Navigation to Camera

```typescript
const HandleClick = () => {
  navigation.navigate("Camera", {
    id: id,
    side: text,
    vehicleType: vehicleType,
    appColumn: appColumn || text.replace(/\s/g, ''),
  });
};
```

**Params explained:**

- `id` → leadId (database query ke liye)
- `side` → "FRONT SIDE" (display ke liye)
- `vehicleType` → "4 Wheeler" (step filtering)
- `appColumn` → "FrontSide" (backend field name)

### 🎨 Visual States

```typescript
const cardBackgroundStyle = {
  backgroundColor: isDone || uploadStatus === 'uploaded' ? "#ABEB94" : "white",
};
```

**3 visual states:**

1. **Not captured** → White background + Icon
2. **Captured (file exists)** → Green background + Thumbnail image
3. **Uploaded (file deleted from cache)** → Green background + Checkmark ✓

**Why 3rd state?**

👉 Upload ho gaya but cache clear ho gaya
👉 User ko pata chale ki photo li ja chuki hai

---

## 🏗️ MAIN COMPONENT: VALUATION PAGE

### 📍 Route Params

```typescript
interface RouteParams {
  leadId: string;
  displayId?: string;
  vehicleType: string;
  leadData?: Lead;
}

const { leadId, displayId, vehicleType, leadData } = route.params as RouteParams;
```

**From where?**

👉 MyTasks screen → navigate to Valuate
👉 ValuatedLeads screen → navigate to Valuate

**displayId vs leadId:**

- `leadId` → "21428" (database ID)
- `displayId` → "4WRL20859" (registration number - user friendly)

### 🎯 Zustand Store Integration

```typescript
const {
  steps,
  isLoading,
  fetchSteps,
  reset,
  sideUploads,
  getSideUpload,
  markLocalCaptured
} = useValuationStore();
```

**What's happening:**

1. `steps` → Backend se aaye (FRONT, BACK, ENGINE)
2. `sideUploads` → Locally captured photos ka array
3. `fetchSteps()` → API call
4. `markLocalCaptured()` → Photo capture hone pe call hota hai

### 📊 Local State Management

```typescript
const [OptionalInfoModalState, setOptionalInfoModalState] = useState({
  open: false,
  Questions: "",
  Answer: "",
});
const [OptionalInfoQuestionAnswer, setOptionalInfoQuestionAnswer] = useState<Record<string, string>>({});
const [showConditionModal, setShowConditionModal] = useState(false);
const [currentSideForCondition, setCurrentSideForCondition] = useState("");
const [currentSideQuestionData, setCurrentSideQuestionData] = useState<any>(null);
const [sideUploadStatus, setSideUploadStatus] = useState<Record<string, 'pending' | 'uploaded' | 'failed'>>({});
```

**Why so much state?**

❌ Zustand me daal dete
✅ Ye UI-only state hai (screen-specific)

**Best practice:**

- **Global store** → Cross-screen data (steps, uploads)
- **Local state** → UI flags (modal open/close)

### 🔄 Initial Data Load

```typescript
useEffect(() => {
  if (leadId) {
    fetchSteps(leadId.toString());
  }
  processedSidesRef.current = {};
  setLastProcessedSide("");
  return () => reset();
}, [leadId, fetchSteps, reset]);
```

**Sequence:**

1. Fetch steps from backend
2. Reset processed sides tracker
3. Cleanup on unmount

**Why cleanup?**

👉 Agar user dusri lead pe jaaye → purana data nahi dikhega

### 💾 Load Captured Media from Database

```typescript
const loadCapturedMedia = useCallback(async () => {
  if (!leadId) return;
  try {
    const captured = await getCapturedMediaByLeadId(leadId.toString());
    
    const statusMap: Record<string, 'pending' | 'uploaded' | 'failed'> = {};

    captured.forEach((item) => {
      if (item.side && item.localUri) {
        // ✅ FIX: Only mark as processed if already uploaded
        if (item.uploadStatus === 'uploaded') {
          processedSidesRef.current[item.side] = true;
        }
        markLocalCaptured(item.side, item.localUri);
      }
      if (item.side) {
        statusMap[item.side] = item.uploadStatus;
      }
    });

    setSideUploadStatus(statusMap);
  } catch (error) {
    console.error('[ValuationPage] Failed to load captured media:', error);
  }
}, [leadId, markLocalCaptured]);
```

**Why this function?**

👉 **Offline-first architecture**

User ne photo li → app crash ho gaya → database me saved hai

Next time app khola → photos restore ho jaate hain

**Critical logic:**

```typescript
if (item.uploadStatus === 'uploaded') {
  processedSidesRef.current[item.side] = true;
}
```

**Why?**

✅ Uploaded photos ke liye modal mat dikhao (already processed)
✅ Pending photos ke liye modal dikhao (questions answer nahi kiye)

### 🎯 Focus Effect - Screen Return Handler

```typescript
useFocusEffect(
  useCallback(() => {
    loadCapturedMedia();
  }, [loadCapturedMedia])
);
```

**When triggered?**

- User Camera screen se wapas aaya
- User Home se Valuation screen pe aaya

**Why not useEffect?**

👉 useEffect = component mount/unmount
👉 useFocusEffect = screen focus/blur (navigation aware)

### 📡 Upload Queue Subscription

```typescript
useEffect(() => {
  const unsubscribe = uploadQueueManager.subscribe((count) => {
    setQueueCount(count);
  });

  uploadQueueManager.getQueueCount().then(count => setQueueCount(count));

  return unsubscribe;
}, []);
```

**What's happening:**

1. Subscribe to queue count changes
2. Update badge number
3. Cleanup subscription on unmount

**Architecture:**

Upload queue = **Separate service** (observer pattern)

---

## 🔥 MODAL AUTO-TRIGGER LOGIC (MOST COMPLEX PART)

### Problem Statement

Jab user photo capture karta hai:

1. Camera screen se wapas aata hai
2. Automatically condition modal open hona chahiye
3. But SIRF ek baar (not multiple times)
4. Already uploaded photos ke liye nahi (only new captures)

### 🧠 Solution Architecture

```typescript
const [lastProcessedSide, setLastProcessedSide] = useState<string>("");
const processedSidesRef = useRef<Record<string, boolean>>({});
```

**Two-layer tracking:**

1. `lastProcessedSide` → Last modal jisne open kiya (state)
2. `processedSidesRef` → All sides jinke liye modal dikha chuka (ref)

**Why both?**

👉 State → re-render trigger (UI update)
👉 Ref → persistent value WITHOUT re-render

### 🎯 Modal Trigger useEffect

```typescript
useEffect(() => {
  console.log('[ValuationPage] Modal useEffect triggered:', {
    sideUploadsLength: sideUploads?.length,
    lastProcessedSide,
    processedSides: Object.keys(processedSidesRef.current),
  });

  if (sideUploads && sideUploads.length > 0) {
    const lastUploadedSide = sideUploads[sideUploads.length - 1];

    // Only process if this is a NEW side
    if (
      lastUploadedSide &&
      lastUploadedSide.side !== lastProcessedSide &&
      !processedSidesRef.current[lastUploadedSide.side]
    ) {
      // ... modal open logic
    }
  }
}, [sideUploads?.length, steps, getSideQuestion, vehicleType, lastProcessedSide]);
```

**Dependency array breakdown:**

- `sideUploads?.length` → New photo captured (array grows)
- `steps` → Backend data loaded
- `lastProcessedSide` → Ensure reactivity

**Guard conditions:**

1. `lastUploadedSide.side !== lastProcessedSide` → Not same as previous
2. `!processedSidesRef.current[lastUploadedSide.side]` → Never processed before

### 🔍 Finding Question Data

```typescript
const normalizeName = (value?: string) => value?.toLowerCase().trim() || '';
const normalizedSide = normalizeName(lastUploadedSide.side);

const stepData = steps.find(s => normalizeName(s.Name) === normalizedSide);

const questionData = getSideQuestion({
  data: steps,
  vehicleType: vehicleType,
  nameInApplication: stepData?.Name || lastUploadedSide.side,
});
```

**Why normalize names?**

Backend: `"FRONT SIDE"`
Captured: `"front side"`

→ Case-insensitive match

### ✅ Modal Open Decision

```typescript
if (stepData) {
  console.log('[ValuationPage] Opening modal for:', lastUploadedSide.side);
  
  setCurrentSideForCondition(lastUploadedSide.side);
  setCurrentSideQuestionData(questionData || stepData);
  setShowConditionModal(true);
  processedSidesRef.current[lastUploadedSide.side] = true;
  setLastProcessedSide(lastUploadedSide.side);
}
```

**Sequence:**

1. Set current side name (for modal title)
2. Set question data (could be null if no questions)
3. Open modal
4. **Mark as processed** (critical - prevents re-trigger)
5. Update last processed side

---

## 🎛️ COMPUTED VALUES (useMemo)

### 📸 Clickable Image Sides

```typescript
const clickableImageSides = useMemo(() => {
  if (!steps || !Array.isArray(steps)) return [];
  return steps
    .filter((step) => step.Images !== false)
    .map((step) => step.Name || "");
}, [steps]);
```

**Logic:**

`step.Images === true` → Photo chahiye (FRONT, BACK, etc.)
`step.Images === false` → Sirf answer chahiye (Optional Info)

**Why useMemo?**

👉 `steps` change nahi → re-compute nahi
👉 Performance optimization

### 📝 Optional Info Items

```typescript
const optionalInfoItems = useMemo(() => {
  if (!steps || !Array.isArray(steps)) return [];
  return steps.filter((step) => step.Images === false);
}, [steps]);
```

Opposite of clickable sides.

---

## 💾 DATABASE METADATA PERSISTENCE

```typescript
useEffect(() => {
  if (!leadId) return;
  if (clickableImageSides.length === 0) return;

  const leadIdStr = leadId.toString();

  // Set expected total images
  setTotalCount(leadIdStr, clickableImageSides.length);

  // Persist metadata
  const dbVehicleType = vehicleType || (leadData?.VehicleType ? leadData.VehicleType.toString() : '');
  const dbRegNo = (leadData?.RegNo || '').toString().toUpperCase() || (displayId || '').toString();
  const dbProspectNo = (leadData as any)?.LeadUId?.toString() || '';

  updateLeadMetadata(leadIdStr, {
    regNo: dbRegNo,
    prospectNo: dbProspectNo,
    vehicleType: dbVehicleType,
  });
}, [leadId, clickableImageSides.length, vehicleType, leadData, displayId]);
```

**Purpose:**

ValuatedLeads screen pe navigate karte waqt:

- Registration number chahiye (4WRL20859)
- Vehicle type chahiye (4 Wheeler)
- Total count chahiye (progress bar)

**Why database?**

✅ App crash bhi ho → data persist
✅ User dusre screen pe jaaye → wapas aaye → data available

---

## 🎬 HELPER FUNCTIONS

### Get Image URI for Side

```typescript
const ClickedSideImage = (side: string) => {
  const sideUpload = getSideUpload(side);
  return sideUpload?.localUri || "";
};
```

**Returns:**

- `"file:///storage/abc.jpg"` if captured
- `""` if not captured

### Check Video Recorded

```typescript
const isVideoRecorded = () => {
  const videoUpload = getSideUpload('Video');
  return videoUpload?.localUri ? true : false;
};
```

Same pattern as images.

### Video Navigation

```typescript
const HandleVideoNavigation = () => {
  navigation.navigate("VideoCamera", {
    id: leadId,
    side: "Video",
    vehicleType,
  });
};
```

Separate screen for video recording.

### All Images Captured Check

```typescript
const isAllImagesCaptured = () => {
  if (!clickableImageSides.length) return false;
  return clickableImageSides.every((side) => !!ClickedSideImage(side));
};
```

**Logic:**

```
clickableImageSides = ["FRONT", "BACK", "ENGINE"]

Every side must have localUri

FRONT ✓
BACK ✓
ENGINE ✓
→ return true
```

**Why `!!`?**

👉 Double negation converts to boolean
👉 `!!"file://abc"` → `true`
👉 `!!""` → `false`

### Next Button Handler

```typescript
const handleNextClick = async () => {
  if (!isAllImagesCaptured()) {
    ToastAndroid.show("Please capture all images first", ToastAndroid.SHORT);
    return;
  }
  navigation.navigate("VehicleDetails", {
    carId: leadId,
    leadData,
    vehicleType,
  });
};
```

**Guard:**

All images captured nahi → toast dikha ke return

**Next screen:**

VehicleDetails → Car details form

---

## 🎨 RENDERING LOGIC

### Loading State

```typescript
if (isLoading && steps.length === 0) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.AppTheme.primary} />
    </View>
  );
}
```

**Condition:**

`isLoading === true` AND `steps.length === 0`

**Why both?**

👉 Agar sirf `isLoading` check kiya → refresh pe bhi loader aaega
👉 Steps already loaded → show content with refresh indicator

### Main UI Structure

```typescript
<SafeAreaView style={styles.safeArea}>
  {clickableImageSides.length ? (
    <View style={styles.mainContainer}>
      {/* Content */}
    </View>
  ) : (
    <View style={styles.noDataContainer}>
      <RNText style={styles.noDataTextLarge}>No Data Found</RNText>
    </View>
  )}
</SafeAreaView>
```

**Guard:**

No clickable sides → "No Data Found"

### Header

```typescript
<View style={styles.headerContainer}>
  <RNText style={styles.carIdText}>{displayId || leadId}</RNText>
</View>
```

**Display priority:**

1. `displayId` (4WRL20859)
2. `leadId` (21428)

### Video Card

```typescript
<TouchableOpacity
  style={[
    styles.videoCard,
    isVideoRecorded() && styles.videoCardCompleted,
  ]}
  onPress={HandleVideoNavigation}
>
  <RNText style={styles.videoCardText}>Record Video</RNText>
</TouchableOpacity>
```

**Conditional styling:**

Video recorded → Green background

### Image Cards (Sequential Unlocking)

```typescript
{clickableImageSides?.map((side, index: number) => {
  const isUnlocked =
    index === 0 ||
    clickableImageSides
      .slice(0, index)
      .every((prevSide) => !!ClickedSideImage(prevSide));
  
  return (
    <ValuateCard
      key={side + index}
      id={leadId}
      isDone={ClickedSideImage(side)}
      isClickable={isUnlocked}
      vehicleType={vehicleType}
      text={side}
      appColumn={steps.find(s => s.Name === side)?.Appcolumn || side}
      uploadStatus={sideUploadStatus[side]}
    />
  );
})}
```

**Unlock logic:**

```
Index 0 → always unlocked

Index 1 → unlocked if [0] captured
Index 2 → unlocked if [0, 1] captured

.slice(0, index) → "all previous sides"
.every() → "all must be captured"
```

**Dynamic appColumn:**

Backend sometimes uses different field names (FrontSide vs FRONT_SIDE)

### Optional Info Section

```typescript
<View style={styles.infoRecordContainer}>
  <RNText style={styles.infoRecordTitle}>
    Optional Information Record
  </RNText>
  {optionalInfoItems.map((item, index) => {
    const questionKey = Array.isArray(item.Questions)
      ? item.Questions.join(',')
      : (item.Questions || "");
    
    return (
      <Selector
        key={index + questionKey}
        keyText={questionKey}
        valueText={OptionalInfoQuestionAnswer?.[questionKey] || ""}
        onPress={() => {
          setOptionalInfoModalState({
            open: true,
            Questions: questionKey,
            Answer: item.Answer || "",
          });
        }}
      />
    );
  })}
</View>
```

**Data flow:**

1. Click Selector
2. Open OptionalInfoModal
3. Select answer
4. Store in `OptionalInfoQuestionAnswer` state
5. Display in Selector's `valueText`

### Next Button (with Safe Area)

```typescript
<View
  style={[
    styles.nextBtnContainer,
    { paddingBottom: insets.bottom },
  ]}
>
  <TouchableOpacity
    onPress={handleNextClick}
    style={[
      styles.nextBtn,
      isAllImagesCaptured() ? styles.nextBtnEnabled : styles.nextBtnDisabled,
    ]}
  >
    <RNText style={styles.nextBtnText}>Next</RNText>
  </TouchableOpacity>
</View>
```

**Safe area insets:**

iPhone me bottom notch → button niche chala jaata hai → `insets.bottom` add karo

**Visual states:**

- All captured → Dark background (enabled)
- Not all captured → Light background (disabled look) but clickable (for toast)

---

## 🔥 MODAL SUBMIT HANDLERS

### Condition Modal Submit

```typescript
onSubmit={async ({ selectedAnswer, odometerReading, keyAvailable, chassisPlate }) => {
  if (selectedAnswer) {
    setSideConditions({
      ...sideConditions,
      [currentSideForCondition]: selectedAnswer,
    });
  }

  setShowConditionModal(false);

  const step = steps.find(s => s.Name === currentSideForCondition);
  if (!step) return;

  const stepName = (step.Name || '').toLowerCase();
  const isOdometer = stepName.includes('odometer');
  const isChassisPlate = stepName.includes('chassis plate');

  let payload: any = { LeadId: leadId };

  if (isOdometer) {
    payload = {
      ...payload,
      Odometer: odometerReading,
      LeadFeature: { Keys: keyAvailable },
    };
  } else if (isChassisPlate) {
    payload = {
      ...payload,
      LeadList: { ChassisNo: chassisPlate || selectedAnswer },
    };
  } else {
    payload = {
      ...payload,
      [step.Appcolumn || step.Name || 'Unknown']: { Value: selectedAnswer },
    };
  }

  try {
    await submitLeadReportApi(payload);
    ToastAndroid.show("Answer submitted successfully", ToastAndroid.SHORT);
  } catch (error: any) {
    console.error("Submit answer error:", error);
    ToastAndroid.show("Failed to submit answer", ToastAndroid.LONG);
  }
}}
```

**Flow:**

1. Save answer in local state (`sideConditions`)
2. Close modal
3. Build dynamic payload based on question type
4. API call
5. Toast feedback

**Dynamic API payload:**

Backend expects different structures:

```json
// Odometer
{
  "LeadId": "123",
  "Odometer": "50000",
  "LeadFeature": { "Keys": "Available" }
}

// Chassis
{
  "LeadId": "123",
  "LeadList": { "ChassisNo": "ABC123" }
}

// Generic
{
  "LeadId": "123",
  "FrontCondition": { "Value": "Good" }
}
```

### Optional Info Modal Submit

```typescript
onSubmit={(selectedAnswer) => {
  setOptionalInfoModalState({
    ...OptionalInfoModalState,
    open: false,
  });
  setOptionalInfoQuestionAnswer({
    ...OptionalInfoQuestionAnswer,
    [OptionalInfoModalState.Questions]: selectedAnswer,
  });
}}
```

Simple: Save answer → Close modal

---

## 🎨 STYLING PATTERNS

### Conditional Styles

```typescript
style={[
  styles.nextBtn,
  isAllImagesCaptured() ? styles.nextBtnEnabled : styles.nextBtnDisabled,
]}
```

**Array syntax:**

Base style + conditional style

### Dynamic Padding

```typescript
style={[
  styles.nextBtnContainer,
  { paddingBottom: insets.bottom },
]}
```

**Why inline style?**

👉 `insets.bottom` runtime pe milta hai (device-specific)
👉 StyleSheet me constant values hoti hain

### Disabled State

```typescript
style={[
  styles.card,
  !isClickable && !isDone && styles.cardDisabled,
]}
```

**Logic:**

NOT clickable AND NOT done → Apply disabled style

---

## ⚡ PERFORMANCE OPTIMIZATIONS

### 1. useMemo for Filtered Lists

```typescript
const clickableImageSides = useMemo(() => {
  return steps.filter((step) => step.Images !== false).map((step) => step.Name);
}, [steps]);
```

**Why?**

👉 `.filter()` + `.map()` expensive operations
👉 Steps change nahi → re-compute nahi

### 2. useCallback for Functions

```typescript
const loadCapturedMedia = useCallback(async () => {
  // ... database query
}, [leadId, markLocalCaptured]);
```

**Why?**

👉 Function reference stable rahta hai
👉 Prevents unnecessary effect re-runs

### 3. useRef for Non-Rendering State

```typescript
const processedSidesRef = useRef<Record<string, boolean>>({});
```

**Why?**

👉 Value change → NO re-render
👉 Perfect for tracking processed sides

---

## 🔥 COMMON PITFALLS & SOLUTIONS

### ❌ Problem: Modal Opens Multiple Times

**Bad code:**
```typescript
useEffect(() => {
  if (sideUploads.length > 0) {
    setShowConditionModal(true); // 🔥 Opens every time sideUploads changes
  }
}, [sideUploads]);
```

**✅ Solution:**
```typescript
const processedSidesRef = useRef<Record<string, boolean>>({});

useEffect(() => {
  const lastSide = sideUploads[sideUploads.length - 1];
  if (lastSide && !processedSidesRef.current[lastSide.side]) {
    setShowConditionModal(true);
    processedSidesRef.current[lastSide.side] = true; // 👈 Mark processed
  }
}, [sideUploads.length]);
```

### ❌ Problem: Modal Data Persists Across Opens

**Bad code:**
```typescript
// No reset logic
const [selectedAnswer, setSelectedAnswer] = useState("");
```

**✅ Solution:**
```typescript
useEffect(() => {
  if (!open) {
    setSelectedAnswer(""); // Reset on close
  }
}, [open]);
```

### ❌ Problem: Sequential Lock Not Working

**Bad code:**
```typescript
const isUnlocked = index === 0; // Only first unlocked
```

**✅ Solution:**
```typescript
const isUnlocked =
  index === 0 ||
  clickableImageSides.slice(0, index).every(prevSide => !!ClickedSideImage(prevSide));
```

---

## 🎯 DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER ACTION                              │
│                     (Opens Valuation Screen)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   useEffect()        │
                  │   fetchSteps()       │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Backend API        │
                  │   (Steps for lead)   │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Zustand Store      │
                  │   steps = [...]      │
                  └──────────┬───────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ clickable    │  │ optionalInfo     │  │ Video Card      │
│ ImageSides   │  │ Items            │  │                 │
│ (useMemo)    │  │ (useMemo)        │  │                 │
└──────┬───────┘  └────────┬─────────┘  └────────┬────────┘
       │                   │                     │
       ▼                   ▼                     ▼
┌─────────────────────────────────────────────────────────┐
│                    UI RENDERING                         │
│  - Sequential ValuateCard components                    │
│  - Optional Info Selectors                              │
│  - Video Record Button                                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
                  USER CLICKS CARD
                         │
                         ▼
              ┌──────────────────────┐
              │ Navigate to Camera   │
              │ (with leadId, side)  │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Camera Component    │
              │  (Captures photo)    │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ markLocalCaptured()  │
              │ (Zustand Store)      │
              └──────────┬───────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌─────────────┐  ┌────────────────┐
│ Save to DB   │  │ Update      │  │ Trigger        │
│              │  │ sideUploads │  │ useEffect      │
└──────────────┘  └─────────────┘  └────────┬───────┘
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │ getSideQuestion()    │
                                  │ (Find question data) │
                                  └──────────┬───────────┘
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │ ConditionModal Open  │
                                  │ (User answers)       │
                                  └──────────┬───────────┘
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │ submitLeadReportApi()│
                                  │ (Save answer)        │
                                  └──────────────────────┘
```

---

## 🧠 MENTAL MODEL

### Think of this screen as:

**A WIZARD with sequential steps:**

1. **Step 1:** Capture FRONT photo → Answer question
2. **Step 2:** Capture BACK photo → Answer question
3. **Step 3:** ... and so on
4. **Final:** All done → Next button enabled

### State layers:

1. **Backend** → Steps definition (what to capture)
2. **Store** → Captured data (what user did)
3. **Database** → Persistent copy (survives crashes)
4. **Local State** → UI flags (modal open/close)

### Data ownership:

- **Steps** → Backend owns, Store caches
- **Captures** → Store owns, Database persists
- **Answers** → API owns, Local state temporarily holds

---

## 🎯 KEY TAKEAWAYS

### ✅ What makes this production-grade?

1. **Offline-first** → Database persistence
2. **Type-safe** → TypeScript interfaces
3. **Error handling** → Try-catch + user feedback
4. **Performance** → useMemo, useCallback, useRef
5. **State management** → Zustand + Local hybrid
6. **Navigation** → Typed params
7. **Sequential UX** → Unlock logic
8. **Dynamic forms** → Question-driven modals
9. **Upload queue** → Background processing
10. **Safe areas** → iOS notch handling

### ❌ What beginners miss:

1. **Modal reset logic** → Stale data bugs
2. **Processed sides tracking** → Modal spam
3. **Database initialization** → Race conditions
4. **useFocusEffect** → useEffect doesn't work for navigation
5. **Conditional dependencies** → useEffect re-runs infinitely

---

## 🔥 BRUTAL REALITY CHECK

### Tu is file ko samajh gaya?

**If YES:**
✅ Tu mid-level React Native dev ban sakta hai
✅ Tu real production apps build kar sakta hai
✅ Tu interviews me impress kar sakta hai

**If NO:**
❌ Concepts weak hain (Hooks, State management)
❌ Architecture samajh nahi hai
❌ Re-read karo + code run karke dekh

---

## 💪 NEXT LEVEL CHALLENGES

### Want to test yourself?

1. **Add photo retake feature** → User can re-capture any side
2. **Add offline upload retry** → Failed uploads auto-retry
3. **Add photo preview modal** → Click thumbnail to zoom
4. **Add progress bar** → X/Y photos captured
5. **Optimize re-renders** → Use React.memo for ValuateCard

### Want comparison?

"Show me Redux Toolkit version of this"
"Show me Context API version"
"Draw component lifecycle diagram"

---

## 🎤 FINAL WORDS

Ye file **900 lines** hai but har line ka **purpose** hai.

Production code me:
- ❌ No shortcuts
- ❌ No "chalta hai"
- ✅ Every edge case handled
- ✅ Every error caught
- ✅ Every state tracked

**Agar tu isko master kar liya → you're ready for real apps.**

Agar questions hain, specific line number de:
"Line 450 me `processedSidesRef` ka exact use case samjha"

Main detailed answer dunga. But half-effort questions mat puch.

**NO MERCY. NO EXCUSES. ONLY RESULTS.** 💪🔥
