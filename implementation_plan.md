# Migrasi POS Kasir Multitenant: Firebase → MySQL

Mengubah seluruh backend project POS dari Firebase/Firestore ke MySQL yang sudah disiapkan di VM Ubuntu (`34.50.98.189`). Semua file/folder Firebase yang tidak lagi digunakan akan dihapus.

## User Review Required

> [!IMPORTANT]
> **Auth akan menggunakan custom JWT + bcrypt**. User/password disimpan di tabel MySQL, login melalui API route Next.js, session disimpan via JWT token di cookie. Ini menggantikan Firebase Auth sepenuhnya.

> [!WARNING]
> **Perubahan ini bersifat breaking** — seluruh data di Firestore tidak akan dimigrasi secara otomatis. Setelah migrasi, data harus diisi ulang dari MySQL. Jika ada data penting di Firestore, harus di-backup terlebih dahulu.

> [!IMPORTANT]
> **Next.js `output: "export"` akan dihapus** karena kita butuh API routes (server-side) untuk koneksi MySQL. Aplikasi akan berjalan sebagai Next.js server (bukan static export). Deploy via `next start` atau Docker.

## Open Questions

> [!IMPORTANT]
> **Supabase**: `.env.local` saat ini berisi kredensial Supabase. Apakah Supabase masih digunakan untuk fitur lain (storage, dll)? Jika tidak, semua konfigurasi Supabase akan dihapus juga.

## Arsitektur Baru

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Browser     │────▸│  Next.js Server  │────▸│  MySQL 8.x   │
│  (React UI)  │◂────│  API Routes      │◂────│  VM Ubuntu   │
│              │     │  /api/*          │     │  34.50.98.189 │
└─────────────┘     └──────────────────┘     └──────────────┘
```

- **Frontend**: React components tetap, hanya `fetch('/api/...')` menggantikan Firestore SDK calls
- **Backend**: Next.js API routes (`src/app/api/`) sebagai REST API
- **Database**: MySQL via `mysql2` package (connection pool)
- **Auth**: JWT token di HttpOnly cookie, password di-hash dengan bcrypt

## File & Folder yang Akan Dihapus

| Path | Alasan |
|------|--------|
| `.firebase/` | Firebase cache |
| `.firebaserc` | Firebase project config |
| `firebase.json` | Firebase hosting/firestore config |
| `firestore.rules` | Firestore security rules |
| `firestore.indexes.json` | Firestore indexes |
| `functions/` | Cloud Functions (seluruh folder) |
| `scripts/migrate-to-multitenant.ts` | Migration script Firebase |
| `scripts/.gitignore` | Akan kosong |
| `n/` | Folder tidak terpakai (hanya 1 file HTML) |
| `pos-umkm/` | Sub-project tidak terpakai |
| `skills/` | Firebase skills folder |
| `skills-lock.json` | Skills lock file |
| `FIREBASE_DEPLOYMENT.md` | Docs Firebase deployment |
| `MULTITENANT_MIGRATION.md` | Docs Firestore migration |
| `CLOUDINARY_SETUP.md` | Docs Cloudinary (opsional, tetap ada jika masih pakai) |
| `QRIS_SETUP.md` | Docs QRIS setup |
| `src/lib/firebase.ts` | Firebase SDK config |
| `src/lib/cloudinary.ts` | Tetap (masih bisa dipakai upload gambar) |
| `src/lib/demo-data.ts` | Demo data Firestore |
| `src/lib/tenant.ts` | Firestore collection refs |
| `postcss.config.mjs` | TailwindCSS postcss config tetap |

## Proposed Changes

### 1. Database Schema (MySQL)

#### [NEW] `database/schema.sql`

SQL migration file untuk membuat semua tabel di MySQL:

```sql
-- Tenants
CREATE TABLE tenants (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  owner_uid VARCHAR(64) NOT NULL,
  status ENUM('trial','active','suspended') DEFAULT 'trial',
  plan ENUM('free','pro','business') DEFAULT 'free',
  branch_count INT DEFAULT 1,
  settings JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users (global, untuk auth)
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  default_tenant_id VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Branches
CREATE TABLE branches (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Members (tenant membership)
CREATE TABLE members (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('owner','admin','cashier') DEFAULT 'cashier',
  branch_ids JSON,
  status ENUM('active','disabled') DEFAULT 'active',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_tenant_user (tenant_id, user_id)
);

-- Categories
CREATE TABLE categories (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Products
CREATE TABLE products (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_lower VARCHAR(255),
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  category_id VARCHAR(64),
  category_name VARCHAR(255),
  image_url TEXT,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  stock_by_branch JSON,
  total_stock INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Transactions
CREATE TABLE transactions (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  invoice_code VARCHAR(100) NOT NULL,
  branch_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64),
  user_name VARCHAR(255),
  total_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  change_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_method ENUM('cash','qris','debit') DEFAULT 'cash',
  status ENUM('completed','voided','refunded') DEFAULT 'completed',
  date_key VARCHAR(10),
  month_key VARCHAR(7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Transaction Items
CREATE TABLE transaction_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  qty INT NOT NULL DEFAULT 1,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

-- Attendance / Shifts
CREATE TABLE attendance (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(255),
  role ENUM('owner','admin','cashier'),
  branch_id VARCHAR(64),
  status ENUM('active','closed') DEFAULT 'active',
  opening_cash DECIMAL(15,2),
  closing_cash DECIMAL(15,2),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Subscriptions
CREATE TABLE subscriptions (
  tenant_id VARCHAR(64) PRIMARY KEY,
  plan_id VARCHAR(50),
  status ENUM('trial','active','past_due','cancelled') DEFAULT 'trial',
  trial_ends_at TIMESTAMP NULL,
  current_period_start TIMESTAMP NULL,
  current_period_end TIMESTAMP NULL,
  payment_method VARCHAR(50),
  last_payment_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

---

### 2. Package Dependencies

#### [MODIFY] [package.json](file:///d:/pos-main-1/package.json)

**Hapus:**
- `firebase`
- `cloudinary` (package server-side, tidak terpakai di client)
- `next-cloudinary`

**Tambah:**
- `mysql2` — MySQL client dengan connection pool
- `bcryptjs` — Hash password
- `jose` — JWT signing/verification (edge-compatible, ringan)
- `uuid` — Generate unique IDs (menggantikan Firestore auto-id)

---

### 3. Database Connection Layer

#### [NEW] [db.ts](file:///d:/pos-main-1/src/lib/db.ts)

MySQL connection pool menggunakan `mysql2/promise`. Membaca env vars `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`.

#### [NEW] [auth.ts](file:///d:/pos-main-1/src/lib/auth.ts)

JWT utilities: `signToken()`, `verifyToken()`, `getSession()` (baca cookie dari request). Menggunakan `jose` library.

#### [MODIFY] [format.ts](file:///d:/pos-main-1/src/lib/format.ts)

Hapus import `FirestoreDate` type. `toDate()` hanya menerima `Date | string | null`.

---

### 4. API Routes (Backend)

Semua API routes di `src/app/api/`:

#### [NEW] `src/app/api/auth/login/route.ts`
- POST: verify email/password via bcrypt, return JWT cookie

#### [NEW] `src/app/api/auth/logout/route.ts`
- POST: clear JWT cookie

#### [NEW] `src/app/api/auth/me/route.ts`
- GET: return current user + tenant info dari JWT

#### [NEW] `src/app/api/auth/register/route.ts`
- POST: register user baru + buat tenant (onboarding)

#### [NEW] `src/app/api/products/route.ts`
- GET: list products by tenant
- POST: create product

#### [NEW] `src/app/api/products/[id]/route.ts`
- PUT: update product
- DELETE: delete product

#### [NEW] `src/app/api/products/[id]/restock/route.ts`
- POST: restock product

#### [NEW] `src/app/api/categories/route.ts`
- GET: list categories
- POST: create category

#### [NEW] `src/app/api/categories/[id]/route.ts`
- PUT: update category
- DELETE: delete category

#### [NEW] `src/app/api/transactions/route.ts`
- GET: list transactions
- POST: checkout (create transaction + update stock)

#### [NEW] `src/app/api/transactions/[id]/route.ts`
- PUT: update transaction

#### [NEW] `src/app/api/attendance/route.ts`
- GET: list shifts

#### [NEW] `src/app/api/attendance/start/route.ts`
- POST: start shift

#### [NEW] `src/app/api/attendance/[id]/end/route.ts`
- POST: end shift

#### [NEW] `src/app/api/dashboard/route.ts`
- GET: dashboard stats

#### [NEW] `src/app/api/tenants/route.ts`
- POST: create tenant

#### [NEW] `src/app/api/tenants/members/route.ts`
- GET: list members
- POST: invite member

#### [NEW] `src/app/api/tenants/switch/route.ts`
- POST: switch active tenant

---

### 5. Service Layer (Client-side, fetch-based)

Semua service di `src/services/` akan di-rewrite dari Firestore SDK → `fetch('/api/...')`.

#### [MODIFY] [product-service.ts](file:///d:/pos-main-1/src/services/product-service.ts)
- Hapus semua import Firestore
- `getProducts()` → `fetch('/api/products')`
- `createProduct()` → `POST /api/products`
- `updateProduct()` → `PUT /api/products/:id`
- `deleteProduct()` → `DELETE /api/products/:id`
- `getCategories()` → `fetch('/api/categories')`
- Hapus `subscribeProducts` / `subscribeCategories` (realtime) → ganti polling/refetch
- `restockProduct()` → `POST /api/products/:id/restock`

#### [MODIFY] [transaction-service.ts](file:///d:/pos-main-1/src/services/transaction-service.ts)
- `getTransactions()` → `fetch('/api/transactions')`
- `checkout()` → `POST /api/transactions`
- `updateTransaction()` → `PUT /api/transactions/:id`
- Hapus `subscribeTransactions` → ganti polling/refetch

#### [MODIFY] [tenant-service.ts](file:///d:/pos-main-1/src/services/tenant-service.ts)
- Semua function pakai fetch ke `/api/tenants/*`

#### [MODIFY] [dashboard-service.ts](file:///d:/pos-main-1/src/services/dashboard-service.ts)
- `getDashboardStats()` → `fetch('/api/dashboard')`

#### [MODIFY] [attendance-service.ts](file:///d:/pos-main-1/src/services/attendance-service.ts)
- Semua function pakai fetch ke `/api/attendance/*`
- Hapus subscribe (realtime) → ganti polling/refetch

---

### 6. Types

#### [MODIFY] [pos.ts](file:///d:/pos-main-1/src/types/pos.ts)
- Hapus `import { Timestamp } from "firebase/firestore"`
- `FirestoreDate` → `DateField = Date | string | null`
- Semua type tetap, hanya rename field type

---

### 7. Auth & Provider (Frontend)

#### [MODIFY] [app-provider.tsx](file:///d:/pos-main-1/src/components/app-provider.tsx)
- Hapus semua Firebase Auth imports
- Login: `POST /api/auth/login`
- Logout: `POST /api/auth/logout`
- Check session: `GET /api/auth/me` saat mount
- State management tetap React Context

---

### 8. UI Pages (Minimal changes)

#### [MODIFY] [page.tsx (kasir)](file:///d:/pos-main-1/src/app/page.tsx)
- Ganti `subscribeProducts` → `getProducts` + useEffect refetch
- Ganti `subscribeCategories` → `getCategories` + useEffect refetch

#### [MODIFY] [login/page.tsx](file:///d:/pos-main-1/src/app/login/page.tsx)
- Hapus referensi Firebase, pakai `useAuth().login`

#### [MODIFY] [onboarding/page.tsx](file:///d:/pos-main-1/src/app/onboarding/page.tsx)
- Registrasi via `/api/auth/register`

#### [MODIFY] Halaman products, transactions, attendance, dashboard
- Ganti dari subscribe → fetch + refetch

---

### 9. Config & Env

#### [MODIFY] [.env.local](file:///d:/pos-main-1/.env.local)
```env
# MySQL
MYSQL_HOST=34.50.98.189
MYSQL_PORT=3306
MYSQL_USER=admin
MYSQL_PASSWORD=password-kuat
MYSQL_DATABASE=pos_db

# JWT
JWT_SECRET=<random-64-char-string>

# Cloudinary (opsional)
# NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dopsdcyey
# NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ml_default

# QRIS (opsional)
# NEXT_PUBLIC_QRIS_STATIC_PAYLOAD=
```

#### [MODIFY] [next.config.ts](file:///d:/pos-main-1/next.config.ts)
- Hapus `output: "export"` (butuh server untuk API routes)

#### [DELETE] `.firebaserc`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`

---

### 10. Cleanup Files & Folders

| Action | Path |
|--------|------|
| DELETE | `.firebase/` |
| DELETE | `.firebaserc` |
| DELETE | `firebase.json` |
| DELETE | `firestore.rules` |
| DELETE | `firestore.indexes.json` |
| DELETE | `functions/` (seluruh folder) |
| DELETE | `scripts/` (seluruh folder) |
| DELETE | `n/` (seluruh folder) |
| DELETE | `pos-umkm/` (seluruh folder) |
| DELETE | `skills/` (seluruh folder) |
| DELETE | `skills-lock.json` |
| DELETE | `FIREBASE_DEPLOYMENT.md` |
| DELETE | `MULTITENANT_MIGRATION.md` |
| DELETE | `CLOUDINARY_SETUP.md` |
| DELETE | `QRIS_SETUP.md` |
| DELETE | `src/lib/firebase.ts` |
| DELETE | `src/lib/demo-data.ts` |
| DELETE | `src/lib/tenant.ts` |

---

## Verification Plan

### Automated Tests
```bash
# 1. Pastikan schema MySQL bisa dijalankan
mysql -h 34.50.98.189 -u admin -p pos_db < database/schema.sql

# 2. Build Next.js (pastikan tidak ada error TypeScript)
npm run build

# 3. Start dev server
npm run dev
```

### Manual Verification
1. Buka `/login` → register user baru → otomatis buat tenant
2. Login dengan credential yang dibuat
3. Buka halaman produk → tambah kategori + produk
4. Buka halaman kasir → tambah ke cart → checkout
5. Buka halaman transaksi → lihat riwayat
6. Buka dashboard → lihat statistik
7. Test attendance (start/end shift)
