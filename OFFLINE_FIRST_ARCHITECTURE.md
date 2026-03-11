# 🔥 OFFLINE-FIRST ARCHITECTURE - COMPLETE BLUEPRINT

> **Mission**: Make KwikCheck app work 100% offline. No internet? No problem. Everything syncs when network returns.

---

## 🎯 WHAT YOU WANT (PLAIN ENGLISH)

**Current Problem:**
- No network → App useless
- API calls block UI → App slow
- Data not cached → Every screen needs network

**After Implementation:**
- ✅ Login requires network (ONE TIME) → Fetches all data
- ✅ After login, all screens work without network
- ✅ Data saves locally FIRST
- ✅ Background sync when online
- ✅ App feels INSTANT (no API wait)
- ✅ User can work in field without network (after initial login)

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                      FIRST LOGIN (REQUIRES NETWORK)         │
│              ↓                                              │
│    Authenticate → Fetch ALL Data → Cache Locally           │
│    (Dropdowns, Tasks, Dashboard, etc.)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │   LOCAL DATABASE     │ ← ALL DATA CACHED
          │    (SQLite)          │   FROM LOGIN
          └──────────┬───────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│              APP NOW WORKS OFFLINE                          │
│         (User can work without network)                     │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │   USER ACTION        │ ← Create Lead, Valuate, etc.
          │   (Offline)          │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │   SAVE LOCALLY       │ ← INSTANT (No API wait)
          │   FIRST              │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │   SYNC QUEUE         │ ← Track what needs upload
          │   (Pending Actions)  │
          └──────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    OFFLINE MODE            ONLINE MODE
         │                       │
         ▼                       ▼
   Show Success          Background Sync
   (Data saved)          (Upload to server)
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
              ✓ USER HAPPY
    (App works everywhere, always fast)
```

---

## � LOGIN FLOW EXPLAINED

### **Critical Requirement: Login = Data Download**

```
┌─────────────────────────────────────────────────────────┐
│              USER OPENS APP (FIRST TIME)                │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Check Network       │
              └──────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    NO NETWORK                      HAS NETWORK
         │                               │
         ▼                               ▼
  ┌──────────────┐            ┌──────────────────┐
  │ Show Error   │            │ Allow Login      │
  │ Message      │            │ (Username + Pass)│
  └──────────────┘            └────────┬─────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │ 1️⃣ Authenticate User │
                            │    (API Call)        │
                            └──────────┬───────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │ 2️⃣ Fetch ALL Data    │
                            │    (Parallel API     │
                            │     Calls)           │
                            │                      │
                            │  • Companies         │
                            │  • States/Cities     │
                            │  • Dashboard Stats   │
                            │  • Tasks List        │
                            │  • Colors/Fuel Types │
                            │  • Vehicle Types     │
                            └──────────┬───────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │ 3️⃣ Save to Local DB  │
                            │    (SQLite Cache)    │
                            └──────────┬───────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │ 4️⃣ Navigate to       │
                            │    Dashboard         │
                            └──────────┬───────────┘
                                       │
                                       ▼
                 ┌─────────────────────────────────────────┐
                 │  APP NOW WORKS 100% OFFLINE             │
                 │  (All data cached, no more API needed)  │
                 └─────────────────────────────────────────┘
```

### **Why This Approach?**

✅ **Simple**: One-time network requirement
✅ **Fast**: After login, everything is instant (cached)
✅ **Reliable**: User can work all day offline
✅ **Smart**: Only syncs new work when online

❌ **Alternative (Offline Login)**: Would require constant online checks, complex credential management, no guarantee of data availability

---

### **What About Next Time (2nd Login, 3rd Login)?**

```
USER OPENS APP (2ND TIME OR LATER)
         │
         ▼
  ┌──────────────────┐
  │ Check Network    │
  └────────┬─────────┘
           │
     ┌─────┴─────┐
     │           │
 NO NETWORK   HAS NETWORK
     │           │
     ▼           ▼
┌─────────┐  ┌─────────────────────┐
│ Block   │  │ Allow Login         │
│ Login   │  │ → Re-fetch ALL data │
│ (Show   │  │ → Update cache      │
│ Error)  │  │ → Navigate          │
└─────────┘  └─────────────────────┘
```

**Key Point**: Every login requires network and refreshes all cached data. This ensures the user always has the latest information.

---

### **Daily Usage Example (Real Life)**

#### **Morning (9:00 AM)** - At Home/Office
```
☀️ User opens app
☀️ Has WiFi → Login button works
☀️ Enters credentials
☀️ System downloads:
   ✓ 50 companies
   ✓ 35 states + 500 cities  
   ✓ Dashboard data (pending leads, completed leads)
   ✓ 25 tasks assigned to user
   ✓ 12 vehicle colors, 5 fuel types
☀️ All => data stored in SQLite
☀️ Ready message: "App is ready for offline use!"
☀️ Navigates to dashboard
```

#### **Daytime (10:00 AM - 5:00 PM)** - In the Field
```
🚗 User visits customer locations
🚗 NO INTERNET in rural areas
🚗 Create New Lead → Saved locally ✓
🚗 Take photos → Stored locally ✓
🚗 Fill vehicle details → Cached ✓
🚗 Record valuation → Queued for upload ✓
🚗 Everything works instantly (no loading spinners!)
```

#### **Evening (6:00 PM)** - Back Home/Office
```
🏠 Phone connects to WiFi
🏠 App detects internet
🏠 Background sync starts automatically:
   ↑ Upload 3 new leads
   ↑ Upload 15 photos
   ↑ Upload 2 vehicle valuations
🏠 Sync completes in 30 seconds
🏠 User doesn't even notice (happens in background)
```

#### **Next Day (9:00 AM)** - Fresh Login
```
☀️ User logs in again
☀️ System downloads fresh data:
   ✓ New companies added yesterday
   ✓ New tasks assigned overnight
   ✓ Updated dashboard stats
☀️ Cache refreshed
☀️ Ready for another day!
```

---

## �📦 TECH STACK (WHAT YOU'LL USE)

### 1. **SQLite Database** (Already have: `react-native-sqlite-storage`)
- Store ALL app data locally
- Fast, reliable, works offline

### 2. **AsyncStorage** (Already in React Native)
- Store user credentials (encrypted)
- Store app settings
- Simple key-value pairs

### 3. **NetInfo** (Need to install)
```bash
npm install @react-native-community/netinfo
```
- Detect online/offline status
- Listen for network changes

### 4. **Sync Queue Manager** (Build custom)
- Track pending API calls
- Retry failed uploads
- Handle conflicts

### 5. **Encrypted Storage** (Install for security)
```bash
npm install react-native-encrypted-storage
```
- Store login credentials securely
- Token management

---

## 🗄️ DATABASE SCHEMA (EXPAND YOUR CURRENT DB)

### **Current Database:**
```sql
-- valuation_progress.db (Already exists)
CREATE TABLE valuation_progress (
  leadId TEXT PRIMARY KEY,
  regNo TEXT,
  prospectNo TEXT,
  vehicleType TEXT,
  totalCount INTEGER,
  uploadedCount INTEGER
);

CREATE TABLE valuation_captured_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  leadId TEXT,
  side TEXT,
  localUri TEXT,
  uploadStatus TEXT,
  uploadedAt TEXT
);
```

### **NEW TABLES TO ADD:**

#### 1️⃣ **User Data Table**
```sql
CREATE TABLE IF NOT EXISTS user_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT UNIQUE,
  username TEXT,
  email TEXT,
  mobileNo TEXT,
  employeeCode TEXT,
  token TEXT,
  lastSyncAt TEXT,
  isActive INTEGER DEFAULT 1
);
```

#### 2️⃣ **Sync Queue Table**
```sql
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queueType TEXT NOT NULL, -- 'login', 'lead', 'valuation', 'upload'
  apiEndpoint TEXT NOT NULL,
  requestBody TEXT, -- JSON string
  priority INTEGER DEFAULT 0, -- Higher = process first
  retryCount INTEGER DEFAULT 0,
  maxRetries INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'success', 'failed'
  errorMessage TEXT,
  createdAt TEXT,
  lastAttemptAt TEXT,
  syncedAt TEXT
);
```

#### 3️⃣ **Leads Table (Offline Cache)**
```sql
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  leadId TEXT UNIQUE,
  prospectNo TEXT,
  regNo TEXT,
  customerName TEXT,
  customerMobile TEXT,
  vehicleType TEXT,
  leadStatus TEXT,
  createdAt TEXT,
  updatedAt TEXT,
  isSynced INTEGER DEFAULT 0,
  localData TEXT -- JSON of full lead object
);
```

#### 4️⃣ **Dropdowns Cache Table**
```sql
CREATE TABLE IF NOT EXISTS cached_dropdowns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dropdownType TEXT UNIQUE, -- 'companies', 'vehicleTypes', 'states', etc.
  data TEXT, -- JSON array
  cachedAt TEXT,
  expiresAt TEXT
);
```

#### 5️⃣ **Vehicle Details Cache**
```sql
CREATE TABLE IF NOT EXISTS vehicle_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  leadId TEXT UNIQUE,
  registrationId TEXT,
  yearOfManufacture TEXT,
  make TEXT,
  model TEXT,
  variant TEXT,
  fuelType TEXT,
  color TEXT,
  chassisNumber TEXT,
  engineNumber TEXT,
  customerName TEXT,
  ownerSerial TEXT,
  isSynced INTEGER DEFAULT 0,
  localData TEXT, -- Full JSON
  createdAt TEXT,
  updatedAt TEXT
);
```

#### 6️⃣ **Dashboard Cache**
```sql
CREATE TABLE IF NOT EXISTS dashboard_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cacheKey TEXT UNIQUE, -- 'dashboard_stats', 'tasks_list'
  data TEXT, -- JSON
  cachedAt TEXT,
  expiresAt TEXT
);
```

---

## 🔧 IMPLEMENTATION PLAN (STEP-BY-STEP)

### **PHASE 1: DATABASE SETUP** ⏱️ 2-3 hours

#### File: `src/database/offlineDB.ts` (NEW FILE)

```typescript
import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db: SQLite.SQLiteDatabase | null = null;

export const initOfflineDB = async () => {
  if (db) return db;

  try {
    db = await SQLite.openDatabase({
      name: 'kwikcheck_offline.db',
      location: 'default',
    });

    console.log('[OfflineDB] Database opened successfully');

    // Create all tables
    await createTables();

    return db;
  } catch (error) {
    console.error('[OfflineDB] Failed to open database:', error);
    throw error;
  }
};

const createTables = async () => {
  if (!db) throw new Error('Database not initialized');

  const tables = [
    // User Data
    `CREATE TABLE IF NOT EXISTS user_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT UNIQUE,
      username TEXT,
      email TEXT,
      mobileNo TEXT,
      employeeCode TEXT,
      token TEXT,
      lastSyncAt TEXT,
      isActive INTEGER DEFAULT 1
    )`,

    // Sync Queue
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queueType TEXT NOT NULL,
      apiEndpoint TEXT NOT NULL,
      requestBody TEXT,
      priority INTEGER DEFAULT 0,
      retryCount INTEGER DEFAULT 0,
      maxRetries INTEGER DEFAULT 3,
      status TEXT DEFAULT 'pending',
      errorMessage TEXT,
      createdAt TEXT,
      lastAttemptAt TEXT,
      syncedAt TEXT
    )`,

    // Leads Cache
    `CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      leadId TEXT UNIQUE,
      prospectNo TEXT,
      regNo TEXT,
      customerName TEXT,
      customerMobile TEXT,
      vehicleType TEXT,
      leadStatus TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      isSynced INTEGER DEFAULT 0,
      localData TEXT
    )`,

    // Dropdowns Cache
    `CREATE TABLE IF NOT EXISTS cached_dropdowns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dropdownType TEXT UNIQUE,
      data TEXT,
      cachedAt TEXT,
      expiresAt TEXT
    )`,

    // Vehicle Details
    `CREATE TABLE IF NOT EXISTS vehicle_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      leadId TEXT UNIQUE,
      registrationId TEXT,
      yearOfManufacture TEXT,
      make TEXT,
      model TEXT,
      variant TEXT,
      fuelType TEXT,
      color TEXT,
      chassisNumber TEXT,
      engineNumber TEXT,
      customerName TEXT,
      ownerSerial TEXT,
      isSynced INTEGER DEFAULT 0,
      localData TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`,

    // Dashboard Cache
    `CREATE TABLE IF NOT EXISTS dashboard_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cacheKey TEXT UNIQUE,
      data TEXT,
      cachedAt TEXT,
      expiresAt TEXT
    )`,
  ];

  for (const query of tables) {
    await db.executeSql(query);
  }

  console.log('[OfflineDB] All tables created successfully');
};

export const getDB = () => {
  if (!db) throw new Error('Database not initialized. Call initOfflineDB() first');
  return db;
};

// Helper: Execute query with better error handling
export const executeQuery = async (query: string, params: any[] = []) => {
  const database = getDB();
  try {
    const result = await database.executeSql(query, params);
    return result;
  } catch (error) {
    console.error('[OfflineDB] Query failed:', { query, params, error });
    throw error;
  }
};
```

---

### **PHASE 2: SYNC QUEUE MANAGER** ⏱️ 4-5 hours

#### File: `src/services/syncQueue.manager.ts` (NEW FILE)

```typescript
import NetInfo from '@react-native-community/netinfo';
import { executeQuery, initOfflineDB } from '../database/offlineDB';
import { apiCallService } from './apiCallService';

interface SyncQueueItem {
  id?: number;
  queueType: 'login' | 'lead' | 'valuation' | 'upload' | 'vehicle_details';
  apiEndpoint: string;
  requestBody: any;
  priority?: number;
  retryCount?: number;
  maxRetries?: number;
}

class SyncQueueManager {
  private isProcessing = false;
  private listeners: Array<(count: number) => void> = [];

  constructor() {
    this.initialize();
  }

  private async initialize() {
    await initOfflineDB();
    this.startNetworkListener();
  }

  // Listen for network changes
  private startNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isProcessing) {
        console.log('[SyncQueue] Network detected, starting sync...');
        this.processQueue();
      }
    });
  }

  // Add item to sync queue
  async addToQueue(item: SyncQueueItem): Promise<number> {
    await initOfflineDB();

    const query = `
      INSERT INTO sync_queue 
      (queueType, apiEndpoint, requestBody, priority, retryCount, maxRetries, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `;

    const params = [
      item.queueType,
      item.apiEndpoint,
      JSON.stringify(item.requestBody),
      item.priority || 0,
      item.retryCount || 0,
      item.maxRetries || 3,
      new Date().toISOString(),
    ];

    const result = await executeQuery(query, params);
    const insertId = result[0].insertId;

    console.log('[SyncQueue] Added to queue:', { id: insertId, type: item.queueType });

    // Notify listeners
    this.notifyListeners();

    // Try to process immediately if online
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
      this.processQueue();
    }

    return insertId;
  }

  // Process all pending items
  async processQueue() {
    if (this.isProcessing) {
      console.log('[SyncQueue] Already processing...');
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.log('[SyncQueue] No network, skipping sync');
      return;
    }

    this.isProcessing = true;

    try {
      // Fetch pending items (ordered by priority)
      const query = `
        SELECT * FROM sync_queue 
        WHERE status = 'pending' AND retryCount < maxRetries
        ORDER BY priority DESC, createdAt ASC
        LIMIT 10
      `;

      const result = await executeQuery(query);
      const items = result[0].rows.raw();

      console.log('[SyncQueue] Processing', items.length, 'items');

      for (const item of items) {
        await this.processItem(item);
      }

      this.notifyListeners();
    } catch (error) {
      console.error('[SyncQueue] Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process single item
  private async processItem(item: any) {
    const updateStatus = async (status: string, errorMessage?: string) => {
      const query = `
        UPDATE sync_queue 
        SET status = ?, retryCount = retryCount + 1, lastAttemptAt = ?, errorMessage = ?, syncedAt = ?
        WHERE id = ?
      `;
      await executeQuery(query, [
        status,
        new Date().toISOString(),
        errorMessage || null,
        status === 'success' ? new Date().toISOString() : null,
        item.id,
      ]);
    };

    try {
      console.log('[SyncQueue] Processing item:', item.id, item.queueType);

      const requestBody = JSON.parse(item.requestBody);

      // Make API call
      const response = await apiCallService.post({
        service: item.apiEndpoint,
        body: requestBody,
      });

      // Check for errors
      if (response?.ERROR && response.ERROR !== '0') {
        throw new Error(response.MESSAGE || 'API returned error');
      }

      // Success
      await updateStatus('success');
      console.log('[SyncQueue] Item synced successfully:', item.id);

      // Update related local data (mark as synced)
      await this.updateLocalDataStatus(item);

    } catch (error: any) {
      console.error('[SyncQueue] Item failed:', item.id, error?.message);

      const status = item.retryCount + 1 >= item.maxRetries ? 'failed' : 'pending';
      await updateStatus(status, error?.message);
    }
  }

  // Update local data after successful sync
  private async updateLocalDataStatus(item: any) {
    const requestBody = JSON.parse(item.requestBody);

    switch (item.queueType) {
      case 'lead':
        if (requestBody.LeadId) {
          await executeQuery(
            'UPDATE leads SET isSynced = 1, updatedAt = ? WHERE leadId = ?',
            [new Date().toISOString(), requestBody.LeadId]
          );
        }
        break;

      case 'vehicle_details':
        if (requestBody.LeadId) {
          await executeQuery(
            'UPDATE vehicle_details SET isSynced = 1, updatedAt = ? WHERE leadId = ?',
            [new Date().toISOString(), requestBody.LeadId]
          );
        }
        break;

      case 'valuation':
        // Already handled by uploadQueue.manager
        break;
    }
  }

  // Get queue count
  async getQueueCount(): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`;
    const result = await executeQuery(query);
    return result[0].rows.item(0).count;
  }

  // Subscribe to queue changes
  subscribe(callback: (count: number) => void) {
    this.listeners.push(callback);
    this.getQueueCount().then(count => callback(count));

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private async notifyListeners() {
    const count = await this.getQueueCount();
    this.listeners.forEach(callback => callback(count));
  }

  // Clear failed items
  async clearFailedItems() {
    await executeQuery('DELETE FROM sync_queue WHERE status = "failed"');
    this.notifyListeners();
  }

  // Retry failed items
  async retryFailedItems() {
    await executeQuery(`
      UPDATE sync_queue 
      SET status = 'pending', retryCount = 0 
      WHERE status = 'failed'
    `);
    this.notifyListeners();
    this.processQueue();
  }
}

export const syncQueueManager = new SyncQueueManager();
```

---

### **PHASE 3: LOGIN WITH DATA FETCH** ⏱️ 3-4 hours

#### File: `src/services/auth.service.ts` (NEW FILE)

```typescript
import EncryptedStorage from 'react-native-encrypted-storage';
import NetInfo from '@react-native-community/netinfo';
import { executeQuery, initOfflineDB } from '../database/offlineDB';
import { apiCallService } from './apiCallService';
import { cachedAPIService } from './cachedAPI.service';

interface LoginCredentials {
  username: string;
  password: string;
}

interface UserData {
  userId: string;
  username: string;
  email: string;
  mobileNo: string;
  employeeCode: string;
  token: string;
}

class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data_cache';

  // Login (REQUIRES NETWORK - Fetches all data during login)
  async login(credentials: LoginCredentials): Promise<{ success: boolean; message: string; data?: UserData }> {
    await initOfflineDB();

    const netState = await NetInfo.fetch();

    // ❗ LOGIN REQUIRES NETWORK
    if (!netState.isConnected) {
      return {
        success: false,
        message: 'Network required for login. Please connect to internet.',
      };
    }

    try {
      // 1️⃣ Authenticate user
      const response = await apiCallService.post({
        service: 'App/webservice/Login',
        body: credentials,
      });

      if (response?.ERROR && response.ERROR !== '0') {
        return {
          success: false,
          message: response?.MESSAGE || 'Invalid credentials',
        };
      }

      // Extract user data from response
      const userData: UserData = {
        userId: response.UserId || response.Id,
        username: credentials.username,
        email: response.Email || '',
        mobileNo: response.MobileNo || '',
        employeeCode: response.EmployeeCode || '',
        token: response.Token || response.SessionToken || '',
      };

      // 2️⃣ Save user data to local database
      await this.saveUserData(userData);

      // 3️⃣ FETCH AND CACHE ALL DATA (This is the KEY part)
      console.log('[Auth] Login successful, fetching all data...');
      await this.fetchAndCacheAllData();

      console.log('[Auth] All data cached, user can now work offline');
      return { success: true, message: 'Login successful', data: userData };

    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      return { 
        success: false, 
        message: error?.message || 'Login failed. Please try again.' 
      };
    }
  }

  // 🔥 FETCH AND CACHE ALL DATA DURING LOGIN
  private async fetchAndCacheAllData() {
    try {
      console.log('[Auth] Starting data fetch...');

      // Fetch and cache in parallel for speed
      await Promise.allSettled([
        // 1. Companies
        cachedAPIService.getDropdown(
          'companies',
          'App/webservice/CompanyList',
          { Version: '2' },
          { forceRefresh: true }
        ),

        // 2. States and Cities
        cachedAPIService.getDropdown(
          'states',
          'App/webservice/StateCityList',
          { Version: '2' },
          { forceRefresh: true }
        ),

        // 3. Dashboard data
        this.fetchDashboardData(),

        // 4. Tasks list
        this.fetchTasksList(),

        // 5. Vehicle colors
        cachedAPIService.getDropdown(
          'colors',
          'App/webservice/DropDownListType',
          { Version: '2', DropDownName: 'ColorsType', category: '4W' },
          { forceRefresh: true }
        ),

        // 6. Fuel types
        cachedAPIService.getDropdown(
          'fuelTypes',
          'App/webservice/DropDownListType',
          { Version: '2', DropDownName: 'FuelType', category: '4W' },
          { forceRefresh: true }
        ),
      ]);

      console.log('[Auth] All data cached successfully');
    } catch (error) {
      console.error('[Auth] Error caching data:', error);
      // Don't fail login if cache fails
    }
  }

  private async fetchDashboardData() {
    try {
      const response = await apiCallService.post({
        service: 'App/webservice/DashBoard',
        body: { Version: '2' },
      });

      if (response?.ERROR === '0') {
        await cachedAPIService.cacheDashboard(response);
      }
    } catch (error) {
      console.error('[Auth] Failed to cache dashboard:', error);
    }
  }

  private async fetchTasksList() {
    try {
      const response = await apiCallService.post({
        service: 'App/webservice/LeadListStatusWise',
        body: { Version: '2', StatusId: '1,2,3,4,5,6,7,8,9' },
      });

      if (response?.ERROR === '0' && response.DataRecord) {
        await cachedAPIService.cacheTasks(response.DataRecord);
      }
    } catch (error) {
      console.error('[Auth] Failed to cache tasks:', error);
    }
  }

  // Save user data to local database
  private async saveUserData(userData: UserData) {
    const query = `
      INSERT OR REPLACE INTO user_data 
      (userId, username, email, mobileNo, employeeCode, token, lastSyncAt, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `;

    await executeQuery(query, [
      userData.userId,
      userData.username,
      userData.email,
      userData.mobileNo,
      userData.employeeCode,
      userData.token,
      new Date().toISOString(),
    ]);

    // Also save token for API calls
    await EncryptedStorage.setItem(this.TOKEN_KEY, userData.token);
  }

  // Get user data from local database
  private async getUserData(username: string): Promise<UserData | null> {
    const query = 'SELECT * FROM user_data WHERE username = ? AND isActive = 1 LIMIT 1';
    const result = await executeQuery(query, [username]);

    if (result[0].rows.length === 0) return null;

    const row = result[0].rows.item(0);
    return {
      userId: row.userId,
      username: row.username,
      email: row.email,
      mobileNo: row.mobileNo,
      employeeCode: row.employeeCode,
      token: row.token,
    };
  }

  // Save credentials (encrypted)
  private async saveCredentials(credentials: LoginCredentials) {
    await EncryptedStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify(credentials)
    );
  }

  // Get saved token
  async getToken(): Promise<string | null> {
    return await EncryptedStorage.getItem(this.TOKEN_KEY);
  }

  // Logout
  async logout() {
    await EncryptedStorage.removeItem(this.STORAGE_KEY);
    await EncryptedStorage.removeItem(this.TOKEN_KEY);
    
    // Mark user as inactive (don't delete data for sync purposes)
    await executeQuery('UPDATE user_data SET isActive = 0');
    
    console.log('[Auth] Logout successful');
  }

  // Check if user is logged in
  async isLoggedIn(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  // Get current user data
  async getCurrentUser(): Promise<UserData | null> {
    try {
      const query = 'SELECT * FROM user_data WHERE isActive = 1 LIMIT 1';
      const result = await executeQuery(query);

      if (result[0].rows.length === 0) return null;

      const row = result[0].rows.item(0);
      return {
        userId: row.userId,
        username: row.username,
        email: row.email,
        mobileNo: row.mobileNo,
        employeeCode: row.employeeCode,
        token: row.token,
      };
    } catch (error) {
      console.error('[Auth] Failed to get current user:', error);
      return null;
    }
  }
}

export const authService = new AuthService();
```

---

### **PHASE 4: CACHED API CALLS** ⏱️ 5-6 hours

#### File: `src/services/cachedAPI.service.ts` (NEW FILE)

```typescript
import NetInfo from '@react-native-community/netinfo';
import { executeQuery, initOfflineDB } from '../database/offlineDB';
import { apiCallService } from './apiCallService';
import { syncQueueManager } from './syncQueue.manager';

interface CacheConfig {
  ttl?: number; // Time to live in milliseconds (default: 24 hours)
  forceRefresh?: boolean;
}

class CachedAPIService {
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    initOfflineDB();
  }

  // Get cached dropdowns (companies, vehicle types, states, etc.)
  async getDropdown(
    dropdownType: string,
    apiEndpoint: string,
    requestBody: any,
    config: CacheConfig = {}
  ): Promise<any[]> {
    const { ttl = this.DEFAULT_TTL, forceRefresh = false } = config;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await this.getCachedData(dropdownType);
      if (cached) {
        console.log('[CachedAPI] Using cached data for:', dropdownType);
        return cached;
      }
    }

    // Check network
    const netState = await NetInfo.fetch();

    if (netState.isConnected) {
      try {
        // Fetch from API
        const response = await apiCallService.post({
          service: apiEndpoint,
          body: requestBody,
        });

        if (response?.ERROR && response.ERROR !== '0') {
          throw new Error(response.MESSAGE || 'API error');
        }

        const data = response.DataList || response.DataRecord || [];

        // Save to cache
        await this.saveToCache(dropdownType, data, ttl);

        console.log('[CachedAPI] Fetched and cached:', dropdownType);
        return data;

      } catch (error) {
        console.error('[CachedAPI] API call failed:', error);
        
        // Return stale cache if available
        const staleCache = await this.getCachedData(dropdownType, true);
        if (staleCache) {
          console.log('[CachedAPI] Using stale cache for:', dropdownType);
          return staleCache;
        }

        return [];
      }
    } else {
      // Offline: return cache (even if expired)
      console.log('[CachedAPI] Offline, using cache for:', dropdownType);
      const cached = await this.getCachedData(dropdownType, true);
      return cached || [];
    }
  }

  // Get cached data
  private async getCachedData(dropdownType: string, includeExpired = false): Promise<any[] | null> {
    const query = includeExpired
      ? 'SELECT * FROM cached_dropdowns WHERE dropdownType = ?'
      : 'SELECT * FROM cached_dropdowns WHERE dropdownType = ? AND datetime(expiresAt) > datetime("now")';

    const result = await executeQuery(query, [dropdownType]);

    if (result[0].rows.length === 0) return null;

    const row = result[0].rows.item(0);
    return JSON.parse(row.data);
  }

  // Save to cache
  private async saveToCache(dropdownType: string, data: any[], ttl: number) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);

    const query = `
      INSERT OR REPLACE INTO cached_dropdowns 
      (dropdownType, data, cachedAt, expiresAt)
      VALUES (?, ?, ?, ?)
    `;

    await executeQuery(query, [
      dropdownType,
      JSON.stringify(data),
      now.toISOString(),
      expiresAt.toISOString(),
    ]);
  }

  // Cache dashboard data
  async cacheDashboard(data: any, ttl = 60 * 60 * 1000) {
    await this.saveDashboardCache('dashboard_stats', data, ttl);
  }

  async getCachedDashboard(): Promise<any | null> {
    return await this.getDashboardCache('dashboard_stats');
  }

  // Cache tasks list
  async cacheTasks(data: any[], ttl = 60 * 60 * 1000) {
    await this.saveDashboardCache('tasks_list', data, ttl);
  }

  async getCachedTasks(): Promise<any[] | null> {
    return await this.getDashboardCache('tasks_list');
  }

  private async saveDashboardCache(cacheKey: string, data: any, ttl: number) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);

    const query = `
      INSERT OR REPLACE INTO dashboard_cache 
      (cacheKey, data, cachedAt, expiresAt)
      VALUES (?, ?, ?, ?)
    `;

    await executeQuery(query, [
      cacheKey,
      JSON.stringify(data),
      now.toISOString(),
      expiresAt.toISOString(),
    ]);
  }

  private async getDashboardCache(cacheKey: string): Promise<any | null> {
    const query = 'SELECT * FROM dashboard_cache WHERE cacheKey = ?';
    const result = await executeQuery(query, [cacheKey]);

    if (result[0].rows.length === 0) return null;

    const row = result[0].rows.item(0);
    return JSON.parse(row.data);
  }

  // Clear all cache
  async clearAllCache() {
    await executeQuery('DELETE FROM cached_dropdowns');
    await executeQuery('DELETE FROM dashboard_cache');
    console.log('[CachedAPI] All cache cleared');
  }

  // Clear expired cache
  async clearExpiredCache() {
    await executeQuery('DELETE FROM cached_dropdowns WHERE datetime(expiresAt) < datetime("now")');
    await executeQuery('DELETE FROM dashboard_cache WHERE datetime(expiresAt) < datetime("now")');
    console.log('[CachedAPI] Expired cache cleared');
  }
}

export const cachedAPIService = new CachedAPIService();
```

---

### **PHASE 5: UPDATE EXISTING FEATURES** ⏱️ 6-8 hours

#### 1️⃣ **Update Login Screen**

File: `src/pages/Auth/Login.tsx`

```typescript
// Add imports
import { authService } from '../../services/auth.service';
import NetInfo from '@react-native-community/netinfo';

// Replace your existing login handler
const handleLogin = async () => {
  if (!username || !password) {
    ToastAndroid.show('Please enter username and password', ToastAndroid.SHORT);
    return;
  }

  // Check network first
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    ToastAndroid.show(
      'Network required for login. Please connect to internet and try again.',
      ToastAndroid.LONG
    );
    return;
  }

  setIsLoading(true);

  try {
    // This will:
    // 1. Authenticate user
    // 2. Fetch all dropdowns, dashboard, tasks
    // 3. Cache everything locally
    const result = await authService.login({ username, password });

    if (result.success) {
      ToastAndroid.show(
        result.message + '\nApp is now ready for offline use!',
        ToastAndroid.SHORT
      );
      // Navigate to dashboard
      navigation.replace('Dashboard');
    } else {
      ToastAndroid.show(result.message, ToastAndroid.LONG);
    }
  } catch (error: any) {
    ToastAndroid.show(error?.message || 'Login failed', ToastAndroid.LONG);
  } finally {
    setIsLoading(false);
  }
};
```

#### 2️⃣ **Update CreateLead Store**

File: `src/features/createLead/store/createLead.store.ts`

```typescript
import { cachedAPIService } from '../../../services/cachedAPI.service';
import { syncQueueManager } from '../../../services/syncQueue.manager';
import NetInfo from '@react-native-community/netinfo';

// Update initialize function
initialize: async () => {
  set({ isLoading: true, error: null });
  
  try {
    // Fetch companies (with cache)
    const companies = await cachedAPIService.getDropdown(
      'companies',
      'App/webservice/CompanyList',
      { Version: '2' }
    );

    // Fetch states (with cache)
    const states = await cachedAPIService.getDropdown(
      'states',
      'App/webservice/StateCityList',
      { Version: '2' }
    );

    const clientCities = states.flatMap(s => s.CityName?.split(',') || []);

    set({
      dropdowns: {
        ...get().dropdowns,
        companies,
        states: states.map(s => s.StateName),
        clientCities,
      },
      isLoading: false,
    });
  } catch (error: any) {
    set({ error: error?.message || 'Failed to load data', isLoading: false });
  }
},

// Update submit function to work offline
submit: async () => {
  set({ isLoading: true, error: null });
  
  const { formData } = get();
  
  try {
    // Build request body
    const requestBody = {
      Version: '2',
      // ... your existing body
    };

    const netState = await NetInfo.fetch();

    if (netState.isConnected) {
      // Try online first
      try {
        const response = await apiCallService.post({
          service: 'App/webservice/LeadCreateEdit',
          body: requestBody,
        });

        if (response?.ERROR && response.ERROR !== '0') {
          throw new Error(response.MESSAGE || 'Failed to create lead');
        }

        set({ 
          successMessage: 'Lead created successfully', 
          isLoading: false 
        });

      } catch (error) {
        // If online fails, queue it
        await this.queueForSync(requestBody);
      }
    } else {
      // Offline: save locally and queue for sync
      await this.saveLeadLocally(requestBody);
      await this.queueForSync(requestBody);
    }
  } catch (error: any) {
    set({ error: error?.message || 'Failed to create lead', isLoading: false });
  }
},

// Helper: Save lead locally
saveLeadLocally: async (requestBody: any) => {
  const query = `
    INSERT OR REPLACE INTO leads 
    (leadId, prospectNo, regNo, customerName, customerMobile, vehicleType, leadStatus, createdAt, updatedAt, isSynced, localData)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `;

  const now = new Date().toISOString();
  const leadId = `LOCAL_${Date.now()}`; // Temp ID

  await executeQuery(query, [
    leadId,
    requestBody.ProspectNo || '',
    requestBody.RegNo || '',
    requestBody.CustomerName || '',
    requestBody.CustomerMobileNo || '',
    requestBody.Vehicle || '',
    'Pending',
    now,
    now,
    JSON.stringify(requestBody),
  ]);

  console.log('[CreateLead] Saved locally:', leadId);
},

// Helper: Queue for sync
queueForSync: async (requestBody: any) => {
  await syncQueueManager.addToQueue({
    queueType: 'lead',
    apiEndpoint: 'App/webservice/LeadCreateEdit',
    requestBody,
    priority: 5,
  });

  set({ 
    successMessage: 'Lead saved offline. Will sync when online.', 
    isLoading: false 
  });
},
```

#### 3️⃣ **Update Dashboard Store**

File: `src/store/useDashboardStore.ts`

```typescript
import { cachedAPIService } from '../services/cachedAPI.service';

// Update fetchDashboardData
fetchDashboardData: async () => {
  set({ isLoading: true, error: null });

  try {
    // Try to get cached data first
    const cachedData = await cachedAPIService.getCachedDashboard();
    
    if (cachedData) {
      set({
        totalCount: cachedData.totalCount,
        pendingCount: cachedData.pendingCount,
        // ... other fields
        isLoading: false,
      });
    }

    // Then fetch fresh data in background
    const netState = await NetInfo.fetch();
    
    if (netState.isConnected) {
      const response = await apiCallService.post({
        service: 'App/webservice/DashBoard',
        body: { Version: '2' },
      });

      if (response?.ERROR === '0') {
        const dashboardData = {
          totalCount: response.TotalCount || 0,
          pendingCount: response.PendingCount || 0,
          // ... other fields
        };

        // Update cache
        await cachedAPIService.cacheDashboard(dashboardData);

        set({
          ...dashboardData,
          isLoading: false,
        });
      }
    } else {
      // If cached data not available and offline
      if (!cachedData) {
        set({ 
          error: 'No cached data available. Please connect to internet.',
          isLoading: false 
        });
      }
    }
  } catch (error: any) {
    console.error('[Dashboard] Error:', error);
    set({ error: error?.message || 'Failed to load dashboard', isLoading: false });
  }
},
```

#### 4️⃣ **Update MyTasks Store**

File: `src/store/useMyTasksStore.ts`

```typescript
import { cachedAPIService } from '../services/cachedAPI.service';

// Update initialize
initialize: async () => {
  set({ loading: true });

  try {
    // Try cached first
    const cachedTasks = await cachedAPIService.getCachedTasks();
    
    if (cachedTasks) {
      set({ tasks: cachedTasks, loading: false });
    }

    // Fetch fresh data if online
    const netState = await NetInfo.fetch();
    
    if (netState.isConnected) {
      const response = await apiCallService.post({
        service: 'App/webservice/LeadListStatusWise',
        body: { 
          Version: '2',
          StatusId: '1,2,3,4,5,6,7,8,9',
        },
      });

      if (response?.ERROR === '0' && response.DataRecord) {
        // Cache the tasks
        await cachedAPIService.cacheTasks(response.DataRecord);

        set({ tasks: response.DataRecord, loading: false });
      }
    } else if (!cachedTasks) {
      set({ 
        loading: false,
        // Show empty state with message
      });
    }
  } catch (error: any) {
    console.error('[MyTasks] Error:', error);
    set({ loading: false });
  }
},
```

#### 5️⃣ **Update Vehicle Details**

File: `src/pages/VehicleDetails/index.tsx`

```typescript
import { syncQueueManager } from '../../services/syncQueue.manager';
import { executeQuery, initOfflineDB } from '../../database/offlineDB';

// Add at component initialization
useEffect(() => {
  initOfflineDB();
  loadSavedVehicleDetails();
}, []);

// Load saved vehicle details if available
const loadSavedVehicleDetails = async () => {
  try {
    const query = 'SELECT * FROM vehicle_details WHERE leadId = ? LIMIT 1';
    const result = await executeQuery(query, [carId]);

    if (result[0].rows.length > 0) {
      const saved = result[0].rows.item(0);
      const localData = JSON.parse(saved.localData);
      
      setCarData({
        ...carData,
        ...localData,
      });
      
      ToastAndroid.show('Loaded saved data', ToastAndroid.SHORT);
    }
  } catch (error) {
    console.error('[VehicleDetails] Failed to load saved data:', error);
  }
};

// Update HandleSubmit
const HandleSubmit = async () => {
  try {
    // Validate fields...
    
    const requestBody = {
      Id: 1,
      LeadId: leadData?.Id || carId,
      // ... your existing payload
    };

    // Save locally first
    await saveVehicleDetailsLocally(requestBody);

    // Try to submit if online, otherwise queue
    const netState = await NetInfo.fetch();

    if (netState.isConnected) {
      try {
        const response = await apiCallService.post({
          service: 'App/webservice/LeadReportDataCreateedit',
          body: { Version: '2', ...requestBody },
        });

        if (response?.ERROR === '0') {
          ToastAndroid.show('Saved successfully', ToastAndroid.LONG);
          navigation.pop(2);
        } else {
          throw new Error(response?.MESSAGE || 'Failed to save');
        }
      } catch (error) {
        await queueForSync(requestBody);
      }
    } else {
      await queueForSync(requestBody);
    }
  } catch (error: any) {
    ToastAndroid.show(error?.message || 'Error saving data', ToastAndroid.SHORT);
  }
};

const saveVehicleDetailsLocally = async (data: any) => {
  const query = `
    INSERT OR REPLACE INTO vehicle_details 
    (leadId, registrationId, yearOfManufacture, make, model, variant, fuelType, 
     color, chassisNumber, engineNumber, customerName, ownerSerial, isSynced, 
     localData, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `;

  const now = new Date().toISOString();

  await executeQuery(query, [
    data.LeadId,
    carData.registrationId,
    carData.yearOfManufacture,
    carData.make,
    carData.model,
    carData.variant,
    carData.vehicleFuelType,
    carData.color,
    carData.chassisNumber,
    carData.engineNumber,
    carData.customerName,
    carData.ownerSerial,
    JSON.stringify(data),
    now,
    now,
  ]);

  console.log('[VehicleDetails] Saved locally');
};

const queueForSync = async (requestBody: any) => {
  await syncQueueManager.addToQueue({
    queueType: 'vehicle_details',
    apiEndpoint: 'App/webservice/LeadReportDataCreateedit',
    requestBody: { Version: '2', ...requestBody },
    priority: 4,
  });

  ToastAndroid.show('Saved offline. Will sync when online.', ToastAndroid.LONG);
  navigation.pop(2);
};
```

---

### **PHASE 6: NETWORK STATUS INDICATOR** ⏱️ 1-2 hours

#### File: `src/components/NetworkStatus.tsx` (NEW FILE)

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      
      if (online !== isOnline) {
        setIsOnline(!!online);
        
        if (!online) {
          // Show banner
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        } else {
          // Hide banner after 2 seconds
          setTimeout(() => {
            Animated.timing(slideAnim, {
              toValue: -100,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }, 2000);
        }
      }
    });

    return unsubscribe;
  }, [isOnline]);

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          backgroundColor: isOnline ? '#4CAF50' : '#F44336',
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Icon 
        name={isOnline ? 'wifi' : 'wifi-off'} 
        size={20} 
        color="#fff" 
      />
      <Text style={styles.text}>
        {isOnline ? 'Back Online' : 'Offline Mode'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 9999,
    elevation: 10,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

Add to App.tsx:
```typescript
import { NetworkStatus } from './src/components/NetworkStatus';

// Inside your app return
return (
  <>
    <NavigationContainer>
      {/* Your navigation */}
    </NavigationContainer>
    <NetworkStatus />
  </>
);
```

---

### **PHASE 7: SYNC STATUS SCREEN** ⏱️ 2-3 hours

#### File: `src/pages/SyncStatus/SyncStatus.tsx` (NEW FILE)

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { syncQueueManager } from '../../services/syncQueue.manager';
import { executeQuery } from '../../database/offlineDB';
import { COLORS } from '../../constants/Colors';

interface QueueItem {
  id: number;
  queueType: string;
  status: string;
  createdAt: string;
  retryCount: number;
  errorMessage: string | null;
}

export const SyncStatus = () => {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadQueueItems();
  }, []);

  const loadQueueItems = async () => {
    try {
      const query = 'SELECT * FROM sync_queue ORDER BY createdAt DESC LIMIT 50';
      const result = await executeQuery(query);
      const rows = result[0].rows.raw();
      setItems(rows);
    } catch (error) {
      console.error('[SyncStatus] Failed to load queue:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadQueueItems();
    setIsRefreshing(false);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await syncQueueManager.processQueue();
    await loadQueueItems();
    setIsSyncing(false);
  };

  const handleRetryFailed = async () => {
    await syncQueueManager.retryFailedItems();
    await loadQueueItems();
  };

  const handleClearFailed = async () => {
    await syncQueueManager.clearFailedItems();
    await loadQueueItems();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return { name: 'check-circle', color: '#4CAF50' };
      case 'failed':
        return { name: 'alert-circle', color: '#F44336' };
      case 'pending':
        return { name: 'clock-outline', color: '#FF9800' };
      case 'processing':
        return { name: 'sync', color: '#2196F3' };
      default:
        return { name: 'help-circle', color: '#999' };
    }
  };

  const renderItem = ({ item }: { item: QueueItem }) => {
    const icon = getStatusIcon(item.status);

    return (
      <View style={styles.item}>
        <Icon name={icon.name} size={24} color={icon.color} />
        
        <View style={styles.itemContent}>
          <Text style={styles.itemType}>{item.queueType}</Text>
          <Text style={styles.itemDate}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
          {item.errorMessage && (
            <Text style={styles.errorText} numberOfLines={2}>
              {item.errorMessage}
            </Text>
          )}
        </View>

        <View style={styles.itemStatus}>
          <Text style={[styles.statusText, { color: icon.color }]}>
            {item.status}
          </Text>
          {item.retryCount > 0 && (
            <Text style={styles.retryText}>
              Retries: {item.retryCount}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const failedCount = items.filter(i => i.status === 'failed').length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sync Status</Text>
        <TouchableOpacity onPress={handleSyncNow} disabled={isSyncing}>
          {isSyncing ? (
            <ActivityIndicator color={COLORS.AppTheme.primary} />
          ) : (
            <Icon name="sync" size={24} color={COLORS.AppTheme.primary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{failedCount}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
      </View>

      {failedCount > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleRetryFailed}>
            <Text style={styles.actionButtonText}>Retry Failed</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]} 
            onPress={handleClearFailed}
          >
            <Text style={styles.actionButtonText}>Clear Failed</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="check-all" size={48} color="#999" />
            <Text style={styles.emptyText}>All synced!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.AppTheme.primary,
  },
  stats: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.AppTheme.primary,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.AppTheme.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  itemStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  retryText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});
```

Add to navigation:
```typescript
<Stack.Screen name="SyncStatus" component={SyncStatus} />
```

Add button in Dashboard to navigate to SyncStatus.

---

## 📝 IMPLEMENTATION CHECKLIST

### Week 1: Foundation
- [ ] Install dependencies (NetInfo, EncryptedStorage)
- [ ] Create offline database schema
- [ ] Test database initialization
- [ ] Build sync queue manager
- [ ] Test queue add/process

### Week 2: Authentication & Caching
- [ ] Build auth service (login with data fetch)
- [ ] Test login flow (verify all data cached)
- [ ] Build cached API service
- [ ] Add network check before login
- [ ] Add network status indicator

### Week 3: Feature Updates
- [ ] Update CreateLead for offline
- [ ] Update Dashboard with cache
- [ ] Update MyTasks with cache
- [ ] Update VehicleDetails offline save
- [ ] Test all screens offline

### Week 4: Sync & Polish
- [ ] Build sync status screen
- [ ] Test background sync
- [ ] Handle conflict resolution
- [ ] Add retry logic
- [ ] Test complete flow

---

## 🔥 TESTING STRATEGY

### Manual Testing:
1. **Network Check**: Try login without network → Should show error message
2. **Data Fetch Test**: Login with network → Verify all data cached (check database)
3. **Offline Work Test**: After login, turn on airplane mode → Use entire app → Create leads, valuate
4. **Sync Test**: Turn off airplane mode → Verify offline work syncs to server
5. **Slow Network Test**: Use throttled network during login → Check user experience
6. **App Kill Test**: Use app offline → Kill app → Reopen → Verify data persists

### Edge Cases:
- Login without network (should block with message)
- Login with slow network (show progress)
- Data fetch fails during login (partial cache)
- Cache expiry after many days offline
- Network drops during data sync
- Large queue (100+ items)
- Failed sync retry limits

---

## ⚡ PERFORMANCE TIPS

### 1. Batch Sync
```typescript
// Instead of syncing one-by-one
for (const item of items) {
  await sync(item); // ❌ SLOW
}

// Batch sync
await Promise.allSettled(items.map(item => sync(item))); // ✅ FAST
```

### 2. Lazy Cache Loading
```typescript
// Load cache in background
setTimeout(() => {
  cachedAPIService.getCachedDashboard();
}, 1000);
```

### 3. Pagination for Large Lists
```typescript
// Load 20 at a time
const query = 'SELECT * FROM leads LIMIT 20 OFFSET ?';
```

---

## 🎯 FINAL RESULT

### User Experience:
1. **Login** → Requires network → Fetches ALL data → Caches locally ✅
2. **After Login** → App works completely offline ✅
3. **Dashboard** → Shows cached data instantly (no API wait) ✅
4. **Create Lead** → Saves locally, syncs later ✅
5. **Valuation** → Photos saved locally, uploads in background ✅
6. **Vehicle Details** → Saved offline, syncs when online ✅

### Speed Improvements:
- **Before**: 2-3 seconds API wait on every screen → User frustrated
- **After**: Instant response (data cached from login) → User happy 🚀

### Reliability:
- **Before**: No network = Can't use app at all
- **After**: One-time login with network → App works everywhere offline ✅

### Workflow:
1. **Morning**: Login with internet (fetches all data)
2. **Daytime**: Work in field without network (everything cached)
3. **Evening**: Connect to internet → Auto-sync all offline work ✅

---

## 🔥 BRUTAL REALITY CHECK

**This is production-grade offline-first architecture with network-dependent login.**

**Implementation time**: 3-4 weeks (full-time)

**Skills required**:
- ✅ SQLite database management
- ✅ Async/await patterns
- ✅ Network state management
- ✅ Queue systems
- ✅ Data caching strategies
- ✅ Data synchronization

**Key Concept:**
⚡ Login REQUIRES network (no offline login)
⚡ During login, ALL data is fetched and cached
⚡ After successful login, app works 100% offline
⚡ Offline work syncs when network returns

**Agar tu isko implement kar liya:**
✅ Tu senior-level React Native dev ban gaya
✅ Offline-first apps ka expert ho gaya
✅ Production architecture samajh gaya
✅ Smart caching strategies master kar liya

---

## 💪 NEXT STEPS

1. **Read this document 2-3 times** until clear
2. **Start with Phase 1** (Database setup)
3. **Test each phase** before moving forward
4. **Don't skip phases** - each depends on previous
5. **Ask specific questions** when stuck

**Agar koi step confusing hai, specific line number/function name de, detailed samjhaunga.**

**NO MERCY. NO SHORTCUTS. BUILD IT RIGHT.** 🔥
