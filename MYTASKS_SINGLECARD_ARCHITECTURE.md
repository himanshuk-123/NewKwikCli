# MyTasks Page & SingleCard Component - Deep Architecture Analysis

## 📋 Table of Contents
1. [File Overview](#file-overview)
2. [Data Flow](#data-flow)
3. [Component Architecture](#component-architecture)
4. [Detailed Function Breakdown](#detailed-function-breakdown)
5. [Connection Map](#connection-map)
6. [State Management](#state-management)
7. [Navigation Flow](#navigation-flow)

---

## 📁 File Overview

### **SingleCard.tsx** (`src/components/SingleCard.tsx`)
**Purpose:** A reusable UI card component that displays individual task/lead information  
**Type:** Presentational Component (Pure UI, minimal logic)  
**Receives:** Props with lead data and callbacks  
**Outputs:** Interactive card with buttons and icons  

### **MyTasks/index.tsx** (`src/pages/MyTasks/index.tsx`)
**Purpose:** Main page container for displaying filtered list of user tasks  
**Type:** Container Component (Business logic, state management)  
**Receives:** Redux/Zustand store data via hooks  
**Outputs:** Full page with header, search, tasks list, and pagination  

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         API/Backend                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
            ┌──────────────────────────────────┐
            │  useMyTasksStore() [Zustand]    │
            │  • tasks[]                       │
            │  • isLoading                     │
            │  • currentVehicle                │
            │  • pageNumber                    │
            └──────────────────┬───────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ↓                     ↓
            ┌─────────────────┐  ┌──────────────────┐
            │ MyTasksPage     │  │ useValuatedLeads │
            │ (Container)     │  │ Count (Dashboard)│
            │                 │  │                  │
            │ • Fetch data    │  │ • Count leads    │
            │ • Filter        │  │ • Dashboard show │
            │ • Transform     │  └──────────────────┘
            └────────┬────────┘
                     │
        ┌────────────┴────────────┐
        │   Data Transform        │
        │   Convert API data →    │
        │   SingleCardType        │
        └────────────┬────────────┘
                     │
                     ↓
          ┌────────────────────────┐
          │   SingleCard Component │
          │   • Displays data      │
          │   • Handles clicks     │
          │   • Renders UI         │
          └────────────┬───────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ↓                             ↓
    ┌─────────────────┐        ┌─────────────┐
    │  onValuateClick │        │ onAppointment│
    │  → Navigate to  │        │ → Set Date   │
    │    Valuate page │        │  & Confirm   │
    └─────────────────┘        └─────────────┘
```

---

## 🏗️ Component Architecture

### **Hierarchy & Props Flow**

```
MyTasksPage (Container)
├── Hooks/State Management
│   ├── useMyTasksStore() ─────────────────┐
│   ├── useState(searchText)               │
│   ├── useState(selectedVehicleType)     │
│   └── useFocusEffect()                   │
│                                          │
├── Helper Functions                      │
│   └── isBillingAllowed()                 │
│                                          │
├── UI Sections                            │
│   ├── IconStrip (Vehicle Filter)         │
│   ├── SearchBar                          │
│   └── TasksList                          │
│       └── filteredTasks.map() ───────────┼──────────────────┐
│           │                             │                   │
│           ├── Data Transformation       │                   │
│           │   └── Converts API data    │                   │
│           │       to SingleCardType    │                   │
│           │                             │                   │
│           └── SingleCard Component ←────┘                   │
│               ├── Props: {                                   │
│               │   data: SingleCardType,                     │
│               │   vehicleType: string,                      │
│               │   onValuateClick: function,                 │
│               │   onAppointmentClick: function              │
│               │ }                       │                   │
│               │                                              │
│               ├── Sub-components                             │
│               │   ├── CardTile (repeating)                  │
│               │   │   └── RenderIcon()                      │
│               │   │       ├── Request Id icon               │
│               │   │       ├── Chassis No icon               │
│               │   │       ├── Client icon                   │
│               │   │       └── Location icon                 │
│               │   │                                         │
│               │   └── Footer Buttons                        │
│               │       ├── Appointment (outline)             │
│               │       └── Valuate (primary)                 │
│               │                                              │
│               └── Extra Elements ←──────────────────────────┘
│                   ├── Phone/Edit Icons                      │
│                   └── Cash Badge (conditional)
│
└── Pagination Controls
    ├── Previous Button
    ├── Page Display
    └── Next Button
```

---

## 🔧 Detailed Function Breakdown

### **MyTasks/index.tsx Functions**

#### 1. **Store Hook: `useMyTasksStore()`**
```typescript
const {
  tasks,              // LeadListStatuswiseRespDataRecord[] - raw API data
  isLoading,          // boolean - loading state
  initialize,         // () => Promise - fetch data from API
  setVehicle,         // (vehicleType) => void - filter by vehicle type
  countsByVehicle,    // {vehicleType: count} - badge counts
  currentVehicle,     // string - currently selected vehicle
  reset,              // () => void - clear data
  confirmAppointment  // (leadId, date) => Promise - confirm appointment
} = useMyTasksStore();
```

**Purpose:** Access centralized Zustand store managing all task-related state  
**Connected To:** Backend API calls, vehicle filtering, pagination  
**Flow:** Store fetches data from API → caches in memory → component reads  

---

#### 2. **useFocusEffect Hook**
```typescript
useFocusEffect(
  useCallback(() => {
    initialize();  // ← Called every time screen comes into focus
    return undefined;
  }, [initialize])
);
```

**Purpose:** Refresh task list when user navigates back to MyTasks screen  
**Trigger:** React Navigation focus event  
**Flow:** Screen focused → initialize() → fetch fresh data → update tasks state  
**Why:** Ensures user sees latest tasks after returning from other screens  

---

#### 3. **`handleVehicleChange(vehicleType)`**
```typescript
const handleVehicleChange = (vehicleType: string) => {
  setSelectedVehicleType(vehicleType);  // Update local UI state
  setVehicle(vehicleType);              // Trigger store to fetch filtered data
};
```

**Purpose:** Handle vehicle type filter click  
**Connected To:**
- Icon strip buttons (2W, 3W, 4W, FE, CV, CE)
- Store's `setVehicle()` API filter function
- Local state `selectedVehicleType` (for UI highlight)

**Flow:**
```
User clicks "4W" icon
    ↓
handleVehicleChange("4W") triggered
    ↓
setSelectedVehicleType("4W") [UI highlight]
setVehicle("4W") [API filter]
    ↓
Store fetches 4W vehicles only
    ↓
tasks state updated
    ↓
Component re-renders with filtered list
```

---

#### 4. **Data Filtering: `filteredTasks` (useMemo)**
```typescript
const filteredTasks = useMemo(() => {
  if (!searchText.trim()) return tasks;  // No search = all tasks
  
  const search = searchText.trim().toLowerCase();
  return tasks.filter((item) =>
    item.LeadUId?.toLowerCase().includes(search) ||
    item.CustomerName?.toLowerCase().includes(search) ||
    item.ChassisNo?.toLowerCase().includes(search) ||
    item.RegNo?.toLowerCase().includes(search)
  );
}, [tasks, searchText]);
```

**Purpose:** Filter tasks by search text in real-time  
**Search Fields:**
- `LeadUId` - Unique lead identifier
- `CustomerName` - Customer name
- `ChassisNo` - Vehicle chassis number
- `RegNo` - Vehicle registration number

**Performance:** `useMemo` prevents recalculation on every render  
**Flow:**
```
User types in search box
    ↓
setSearchText() updates
    ↓
useMemo detects dependency change [tasks, searchText]
    ↓
Filters tasks array
    ↓
Returns filtered results
    ↓
UI re-renders with matches only
```

---

#### 5. **Data Transformation in .map()**
```typescript
filteredTasks.map((item, index) => {
  const isRepoCase = item.LeadTypeName?.toLowerCase() === "repo";
  
  return (
    <SingleCard
      key={index}
      data={{
        id: item.LeadUId?.toUpperCase(),
        regNo: item.RegNo?.toUpperCase(),
        vehicleName: item.Vehicle,
        chassisNo: item.ChassisNo || "NA",
        client: isRepoCase ? item.companyname : item.CustomerName,
        isCash: isBillingAllowed(item),
        location: isRepoCase ? item.YardName : item.cityname,
        // ... rest of data
      }}
      vehicleType={selectedVehicleType}
      onValuateClick={() => { /* navigation */ }}
      onAppointmentClick={() => { /* appointment */ }}
    />
  );
})
```

**Purpose:** Convert API response format → SingleCard expected format  
**Key Transformations:**
- `LeadTypeName` determines data mapping (Repo vs Retail vs others)
- Conditional field selection (repo uses `companyname`, retail uses `CustomerName`)
- Boolean `isRepoCase` used for conditional rendering throughout

**Why Separate:** 
- Keeps API schema separate from UI schema
- Easier to change API without breaking UI
- Reusable transformation logic

---

#### 6. **`isBillingAllowed(item)` Helper**
```typescript
const isBillingAllowed = (item: LeadListStatuswiseRespDataRecord) => {
  let result = false;
  if (!item.LeadTypeName) return result;

  switch (item.LeadTypeName?.toLowerCase()) {
    case "retail":
      result = parseInt(item.RetailBillType, 10) === 2;
      break;
    case "repo":
      result = parseInt(item.RepoBillType, 10) === 2;
      break;
    case "cando":
      result = parseInt(item.CandoBillType, 10) === 2;
      break;
    case "asset":
      result = parseInt(item.AssetBillType, 10) === 2;
      break;
  }
  return result;
};
```

**Purpose:** Determine if cash badge should be shown on card  
**Logic:** If BillType === 2, cash collection is allowed  
**Used By:** `data.isCash` prop passed to SingleCard  
**Flow:** SingleCard receives `isCash` → conditionally renders cash badge  

---

#### 7. **Navigation: `onValuateClick` Callback**
```typescript
onValuateClick={() => {
  navigation.navigate("Valuate", {
    leadId: item.Id,                          // Numeric ID
    displayId: item.LeadUId?.toUpperCase(),   // Formatted display ID
    vehicleType: selectedVehicleType,         // Current filter
    leadData: item,                           // Full lead object
  });
}}
```

**Purpose:** Navigate to Valuate page with context  
**Parameters Sent:**
- `leadId`: Used for database queries
- `displayId`: Used for screen header
- `vehicleType`: Context for which vehicle was selected
- `leadData`: Full lead info for ValuationPage to use

**Connected To:** SingleCard's "Valuate" button → `props.onValuateClick()`

---

#### 8. **Appointment: `onAppointmentClick` Callback**
```typescript
onAppointmentClick={() => {
  DateTimePickerAndroid.open({
    value: new Date(),
    minimumDate: new Date(),
    mode: 'date',
    onChange: async (event, date) => {
      if (event.type === 'dismissed' || !date) return;

      try {
        await confirmAppointment(item.Id?.toString() || '', date);
        ToastAndroid.show('Appointment set successfully', ToastAndroid.SHORT);
      } catch {
        ToastAndroid.show('Failed to set appointment', ToastAndroid.SHORT);
      }
    },
  });
}}
```

**Purpose:** Show date picker and confirm appointment  
**Flow:**
```
User clicks "Appointment" button on SingleCard
    ↓
DateTimePickerAndroid opens
    ↓
User selects date
    ↓
confirmAppointment(leadId, date) called from store
    ↓
API call sent to backend
    ↓
Toast shows success/error
```

**Connected To:** SingleCard's "Appointment" button (outline)  

---

### **SingleCard.tsx Functions**

#### 1. **`CardTile` Sub-component**
```typescript
const CardTile = ({ textPrimary, textSecondary }: CardTileProps) => {
  const RenderIcon = () => {
    switch (textPrimary) {
      case "Request Id":
        return <MaterialCommunityIcons name="clipboard-text-outline" ... />
      case "Chassis No.":
        return <MaterialCommunityIcons name="car" ... />
      case "Client":
      case "Customer":
      case "Location":
        return <Feather name="..." ... />
    }
  };
  
  return (
    <View style={cardTile.container}>
      <RenderIcon />
      <Text>{textPrimary}</Text>
      <Text>{textSecondary}</Text>
    </View>
  );
};
```

**Purpose:** Reusable row component showing label + icon + value  
**Used By:** Called multiple times in card body to show:
- Request ID
- Client/Customer name
- Chassis number
- Location

**Icon Selection:** Matches label text to appropriate icon type  

---

#### 2. **Main `SingleCard` Component**
```typescript
const SingleCard = (props: Props) => {
  const isRepoCase = props.data.leadType?.toLowerCase() === "repo";
  const navigation = useNavigation();
  
  return (
    <View style={cardTile.card}>
      {/* Header Section */}
      <View style={styles.topContainer}>
        <Text>{props.data.regNo}</Text>
        <Text>{props.data.vehicleName}</Text>
      </View>

      {/* Body: CardTile repetitions */}
      <View style={cardTile.body}>
        <CardTile textPrimary="Request Id" textSecondary={...} />
        {/* More CardTiles */}
      </View>

      {/* Footer: Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={props.onAppointmentClick}>
          <Text>Appointment</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={props.onValuateClick}>
          <Text>Valuate</Text>
        </TouchableOpacity>
      </View>

      {/* Side Status Bar */}
      <View style={cardTile.status} />

      {/* Top Right: Phone/Edit Icons */}
      <View style={styles.iconContainer}>
        {/* Phone & Edit icons */}
      </View>

      {/* Bottom Left: Cash Badge (conditional) */}
      {props.data.isCash && (
        <View style={styles.iconTextContainer}>
          <Text>₹ {props.data.cashToBeCollected}</Text>
          <Text>Cash to be collected</Text>
        </View>
      )}
    </View>
  );
};
```

**Receives (Props):**
```typescript
{
  data: SingleCardType,              // Lead/task data
  vehicleType: string,                // For context
  onValuateClick: () => void,         // Navigate to Valuate
  onAppointmentClick: () => void,     // Open date picker
}
```

**Renders:** Static UI card with all lead information  
**Interactivity:** Two main buttons trigger callbacks to parent  

---

## 🔗 Connection Map

### **How Components Connect**

```
┌──────────────────────────────────────────────────────────────┐
│                    MyTasksPage Container                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ STORE CONNECTION (useMyTasksStore)                  │   │
│  │ • tasks (API data)                                   │   │
│  │ • initialize() - Fetch on focus                     │   │
│  │ • setVehicle() - Filter API                         │   │
│  │ • confirmAppointment() - Set appointment            │   │
│  └─────────────────────────────────────────────────────┘   │
│                        │                                     │
│         ┌──────────────┴──────────────┐                     │
│         │                             │                     │
│         ↓                             ↓                     │
│  ┌──────────────┐           ┌───────────────┐              │
│  │ Icon Filter  │           │ Search Filter │              │
│  │ (DisplayIcon)│           │ (TextInput)   │              │
│  │      ↓       │           │      ↓        │              │
│  │ setVehicle() │           │ setSearchText │              │
│  └──────────────┘           └───────────────┘              │
│         │                             │                     │
│         └──────────────┬──────────────┘                     │
│                        │                                    │
│              ┌─────────↓─────────┐                         │
│              │ useMemo:          │                         │
│              │ filteredTasks     │                         │
│              │ (memoized array)  │                         │
│              └─────────┬─────────┘                         │
│                        │                                    │
│         ┌──────────────↓──────────────┐                    │
│         │  Transform Data             │                    │
│         │  API → SingleCardType       │                    │
│         └──────────────┬──────────────┘                    │
│                        │                                    │
│      ┌─────────────────↓───────────────────┐              │
│      │  .map() iterate filteredTasks       │              │
│      │  Create SingleCard for each         │              │
│      └──────────────┬──────────────────────┘              │
│                     │                                      │
│                     ↓                                      │
│      ┌──────────────────────────────────┐                │
│      │  SingleCard Component Instance   │                │
│      │  (Repeated for each task)        │                │
│      │                                  │                │
│      │  props.data        ←─────────────┼─ Transformed │
│      │  props.vehicleType ←─────────────┼─ Context data
│      │  props.onValuate   ←─────────────┼─ Callback   │
│      │  props.onAppointment ←───────────┼─ Callback   │
│      │                                  │                │
│      │  Renders:                        │                │
│      │  • Header (regNo, vehicleName)   │                │
│      │  • Body (CardTiles x N)          │                │
│      │  • Footer (2 buttons)            │                │
│      │  • Icons & cash badge (conditional) │            │
│      │                                  │                │
│      │  User clicks:                    │                │
│      │  • Button 1 → onValuateClick()   │                │
│      │  • Button 2 → onAppointmentClick │                │
│      └──┬───────────────────────────┬───┘                │
│         │                           │                     │
│         ↓                           ↓                     │
│    ┌─────────┐              ┌─────────────────┐          │
│    │Navigate │              │DatePicker +     │          │
│    │to Valuate              │confirmAppointment           │
│    │Screen   │              │API Call         │          │
│    └─────────┘              └─────────────────┘          │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 State Management Flow

### **Local State vs Store State**

#### **MyTasks Local State:**
```typescript
searchText           // User's search input (text)
selectedVehicleType  // Which vehicle type selected (string)
```

**Purpose:** UI state only, managed locally  
**Why:** Doesn't need to persist across app navigation  

#### **MyTasks Store State (Zustand):**
```typescript
tasks[]             // All leads (from API)
isLoading           // Fetch status
currentVehicle      // Currently filtered vehicle
pageNumber          // Pagination
countsByVehicle     // Count badges
```

**Purpose:** Shared state across screens  
**Why:** Needs to persist and be accessible from Dashboard, ValuatedLeads, etc.  

#### **Derived State:**
```typescript
filteredTasks       // Computed from tasks + searchText
isRepoCase          // Computed from item.LeadTypeName
isBillingAllowed()  // Computed from BillType
```

**Not stored:** Calculated on-demand, no memory waste  

---

## 🧭 Navigation Flow

### **From MyTasks → To Valuate**

```
1. User sees task in SingleCard
2. User clicks "Valuate" button
3. SingleCard fires: props.onValuateClick()
4. MyTasksPage handler executes:
   
   navigation.navigate("Valuate", {
     leadId: item.Id,                      // 12345
     displayId: item.LeadUId?.toUpperCase(), // "LD-12345"
     vehicleType: selectedVehicleType,     // "4W"
     leadData: item,                       // Full object
   })

5. React Navigation pushes "Valuate" screen
6. ValuationPage component mounted
7. ValuationPage reads route.params:
   - leadId for database queries
   - displayId for header
   - vehicleType for vehicle context
   - leadData for additional info
```

### **From Valuate → Back to MyTasks**

```
1. User navigates back (Android back button or back arrow)
2. MyTasks screen regains focus
3. useFocusEffect triggers: initialize()
4. Store refetches latest tasks from API
5. Updated task list displayed
```

---

## 📊 Type Definitions & Data Contracts

### **LeadListStatuswiseRespDataRecord (API Response)**
```typescript
{
  Id: number,
  LeadUId: string,              // "LD-12345"
  CustomerName: string,
  CustomerMobileNo: string,
  Vehicle: string,              // "Maruti Swift"
  VehicleType: string,          // "4W"
  LeadTypeName: string,         // "retail" | "repo" | "cando" | "asset"
  RegNo: string,                // "KA01AB1234"
  ChassisNo: string,
  EngineNo: string,
  RetailBillType: string,       // "0" | "1" | "2"
  RepoBillType: string,
  CandoBillType: string,
  AssetBillType: string,
  RetailFeesAmount: number,
  RepoFeesAmount: number,
  YardName: string,             // For repo cases
  cityname: string,
  companyname: string,          // For repo cases
  // ... more fields
}
```

### **SingleCardType (UI Data Model)**
```typescript
{
  id: string,
  regNo?: string,
  vehicleName: string,
  requestId: string,
  mode?: string,
  client: string,
  companyName: string,
  isCash: boolean,
  chassisNo: string,
  location: string,
  vehicleStatus: string,
  vehicleType?: string,
  engineNo?: string,
  cashToBeCollected?: string | number,
  make?: string,
  model?: string,
  vehicleFuelType?: string,
  ownershipType?: string,
  HPAStatus?: string,
  mobileNumber?: string,
  leadType?: string,
  leadId?: string | number,
}
```

### **DisplayProps (SingleCard Props)**
```typescript
{
  value: number,
  text: string,
  icon: string,
  color: "Grey" | "Orange" | "Blue" | "Green",
  redirectTo?: string,
}
```

---

## 🔄 Key Data Transformations

### **API Response → UI Display**

```
API: item.LeadUId = "ld-12345"
│
├─ Transform: .toUpperCase()
│
└─> UI: "LD-12345" (displayed in header)
```

```
API: item.LeadTypeName = "repo"
│
├─ Conditional Logic:
│  if repo → use item.companyname
│  else → use item.CustomerName
│
└─> UI: "XYZ Motors" (client field)
```

```
API: item.RetailBillType = "2"
│
├─ Check: parseInt(item.RetailBillType, 10) === 2
│
├─ Result: true/false
│
└─> UI: Show/hide cash badge with amount
```

```
API: item.BlablaBla = raw data
│
├─ Transform: Complete object mapping
│  SingleCardType shape
│
└─> SingleCard Component receives clean data
```

---

## 📱 User Interaction Flows

### **Flow 1: Search a Task**

```
User Types "Swift" in search box
    ↓
onChange → setSearchText("swift")
    ↓
Local state updates
    ↓
useMemo detects searchText change
    ↓
Filters tasks:
  task.CustomerName.includes("swift") OR
  task.ChassisNo.includes("swift") OR
  task.LeadUId.includes("swift") OR
  task.RegNo.includes("swift")
    ↓
filteredTasks array updates
    ↓
.map() creates new SingleCards for matches
    ↓
UI re-renders with filtered list only
```

---

### **Flow 2: Switch Vehicle Type**

```
User Clicks "4W" icon
    ↓
handleVehicleChange("4W")
    ↓
setSelectedVehicleType("4W") → Icon highlights
setVehicle("4W") → Store action
    ↓
Store API call: fetchTasks(vehicleType="4W")
    ↓
Backend filters: Only 4W vehicles
    ↓
tasks state updates with new data
    ↓
.map() creates SingleCards for 4W only
    ↓
UI re-renders with vehicle-specific list
```

---

### **Flow 3: Valuate a Task**

```
User Clicks "Valuate" button on SingleCard
    ↓
SingleCard fires: props.onValuateClick()
    ↓
MyTasksPage handler:
  navigation.navigate("Valuate", {
    leadId: 12345,
    displayId: "LD-12345",
    vehicleType: "4W",
    leadData: {...full object...}
  })
    ↓
React Navigation transitions to Valuate page
    ↓
ValuationPage mounts
    ↓
ValuationPage uses route.params to:
  • Set database queries (leadId)
  • Display header (displayId)
  • Context checks (vehicleType)
  • Pre-populate data (leadData)
```

---

### **Flow 4: Set Appointment**

```
User Clicks "Appointment" button on SingleCard
    ↓
SingleCard fires: props.onAppointmentClick()
    ↓
MyTasksPage opens DateTimePickerAndroid
    ↓
User selects date from calendar
    ↓
onChange callback:
  1. Validate date is dismissed or selected
  2. Call store.confirmAppointment(leadId, date)
  3. Wait for API call to backend
  4. If success: Toast "Appointment set successfully"
  5. If fail: Toast "Failed to set appointment"
    ↓
Appointment confirmed in backend
    ↓
Next refresh shows updated status
```

---

## 🎨 Styling & Visual Connection

### **Card Structure**

```
┌─────────────────────────────────────────┐
│ [REG-NO]  Vehicle Name      [Phone] [Edit]
│─────────────────────────────────────────│  ← Top Section
│                                         │
│ 📋 Request Id    LD-12345              │
│ 👤 Client        XYZ Motors            │  ← Body (CardTiles)
│ 🏢 Customer      Ahmed Khan            │
│ 📍 Location      Bangalore             │
│                                         │
│              [Appointment] [Valuate]   │  ← Footer (Buttons)
│                                         │
│ ₹ 5000  Cash to be collected [Hand]   │  ← Cash Badge (if isCash)
│                                         │
│ │ (Status bar, red)                    │  ← Right border
└─────────────────────────────────────────┘
```

---

## 🔍 Performance Optimizations

### **useMemo for filteredTasks**
```typescript
Prevents recalculation on every render
Dependencies: [tasks, searchText]
Only recalculates when these change
Cost: O(n) filtering when deps change
Benefit: Smoother UI, less CPU
```

### **useCallback for navigate handlers**
```typescript
Each onValuateClick and onAppointmentClick
wrapped in useCallback (inside .map())
Prevents function recreation on every render
Helps React identify same callback identity
```

### **Conditional Rendering for Cash Badge**
```typescript
{props.data.isCash && <View>...</View>}
Only renders if condition true
Saves DOM nodes and memory
Conditional check happens at prop level
```

---

## 📋 Summary: Function Connection Web

```
┌─────────────────────────────────────────────────┐
│           INITIALIZATION (useEffect)            │
│   useFocusEffect → initialize() from store     │
└──────────────────────┬──────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ↓                             ↓
┌───────────────────┐       ┌────────────────┐
│ handleVehicleChange        │ Search Input   │
│ • setSelectedVehicleType   │ • setSearchText│
│ • setVehicle(store)        │ (Local state)  │
└───────────────────┘       └────────────────┘
        │                             │
        └──────────────┬──────────────┘
                       │
              ┌────────↓────────┐
              │   filteredTasks │
              │   (useMemo)     │
              └────────┬────────┘
                       │
              ┌────────↓────────────────┐
              │  .map(item, index)      │
              │  Transform API → UI     │
              │  Create SingleCard      │
              └────────┬────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ↓                             ↓
┌──────────────────┐        ┌─────────────────┐
│ onValuateClick   │        │ onAppointmentClick
│ • Sends params   │        │ • Opens date picker
│ • Navigate route │        │ • Calls confirm API
└──────────────────┘        └─────────────────┘
```

---

## 🎯 Key Takeaways

### **MyTasks Page Responsibilities:**
1. ✅ Fetch & manage task data (via store)
2. ✅ Filter by vehicle type
3. ✅ Search by text
4. ✅ Transform API format → UI format
5. ✅ Handle navigation to other screens
6. ✅ Handle appointment confirmations

### **SingleCard Responsibilities:**
1. ✅ Display task information (props driven)
2. ✅ Render visual hierarchy
3. ✅ Show conditional elements (cash badge)
4. ✅ Trigger parent callbacks (onClick handlers)
5. ✅ **NO business logic** - Pure presentation

### **Data Flow Direction:**
- **One-way**: MyTasks → SingleCard (props down)
- **Callbacks**: SingleCard → MyTasks (actions up)
- **No side effects**: Components are predictable

### **State Distribution:**
- **Store**: Shared, persisted data (tasks, pagination)
- **Local**: UI-only state (searchText, selectedVehicleType)
- **Derived**: Computed values (filteredTasks, isRepoCase)

---

**End of Documentation**
