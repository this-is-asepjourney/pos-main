# NusaPOS (Bro-POS) - Professional Cashier System

Sistem POS kasir profesional modern berbasis Next.js App Router, TypeScript, Tailwind CSS, didukung oleh **Database PostgreSQL Homelab**, penyimpanan gambar **Silo (S3-Compatible Object Storage)**, integrasi **Personal API Platform (PAP Core)**, dan deployment otomatis via **Personal Server Manager (PSM)**.

---

## 🌟 Arsitektur Homelab & Ekosistem Terpadu

```text
┌─────────────────────────────────────────────────────────────┐
│                   Personal Server Manager (PSM)             │
│            (Deploy via Git / Dockerfile / Standalone)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────▼──────────────────┐
            │       Aplikasi POS Cashier (Next.js)│
            │           Port: 3000                │
            └──────┬───────────┬───────────┬──────┘
                   │           │           │
       PostgreSQL  │      S3   │           │ Webhook / API
       Port: 5432  │           │           │ Port: 8000
                   ▼           ▼           ▼
       ┌───────────────┐ ┌───────────┐ ┌──────────────────────┐
       │ PostgreSQL DB │ │ Silo (S3) │ │ PAP Core (API Utama) │
       │  (Home Lab)   │ │  Storage  │ │  (Stock UMKM Sync)   │
       └───────────────┘ └───────────┘ └──────────────────────┘
```

1. **PostgreSQL Server (:5432)**:
   - Menyimpan tabel `users`, `categories`, `products`, `transactions`, dan `attendance`.
   - Menggunakan connection pool performa tinggi (`pg`).
   - Auto-migrasi dan auto-seeding saat pertama kali aplikasi dijalankan.
2. **Silo Object Storage (:9000)**:
   - Silo / MinIO S3 API untuk upload foto produk.
   - Endpoint aman via Next.js Route Handler `/api/upload` (credential S3 tetap aman di sisi server).
3. **Personal API Platform / PAP Core (:8000)**:
   - Terintegrasi dengan endpoint integrasi Stock UMKM (`/api/v1/integrations/stock-umkm/products`).
   - Mendukung penarikan/impor produk langsung dari PAP Core.
   - Mengirim notifikasi event checkout transaksi ke PAP Core (`inventory.updated`).
   - Menerima webhook event masuk di `/api/webhooks/pap`.
4. **Personal Server Manager (PSM)**:
   - Ready deploy via Git repository atau drag-and-drop ZIP.
   - Dockerfile multi-stage production standalone (Node.js 20 Alpine).
   - Auto-injeksi kredensial database PostgreSQL homelab oleh PSM.

---

## 🚀 Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local

# 3. Jalankan inisialisasi tabel database PostgreSQL (Opsional, otomatis jalan di server)
npm run db:init

# 4. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## 🔑 Akun Default (Seeded)

Saat database diinisialisasi pertama kali, sistem membuat akun default:

| Role | Email | Password | Akses |
|---|---|---|---|
| **Admin / Owner** | `admin@pos.local` | `Admin12345!` | Dashboard, Produk, Transaksi, Absensi, Kasir |
| **Kasir** | `kasir@pos.local` | `Kasir12345!` | Halaman Kasir & Absensi Shift |

---

## ⚙️ Variabel Lingkungan (.env)

| Variabel | Default Homelab | Deskripsi |
|---|---|---|
| `PORT` | `3000` | Port aplikasi Next.js |
| `DATABASE_URL` | `postgresql://appuser:admin12345@192.168.25.101:5432/pos_db` | URL koneksi PostgreSQL utama (diinjeksi otomatis oleh PSM) |
| `POSTGRES_HOST` | `192.168.25.101` | Host PostgreSQL |
| `POSTGRES_PORT` | `5432` | Port PostgreSQL |
| `POSTGRES_DB` | `pos_db` | Nama database |
| `POSTGRES_USER` | `appuser` | Username PostgreSQL |
| `POSTGRES_PASSWORD` | `admin12345` | Password PostgreSQL |
| `SILO_ENDPOINT` | `http://192.168.25.101:9000` | Endpoint S3 Silo / MinIO |
| `SILO_ACCESS_KEY` | `admin` | Access Key Silo |
| `SILO_SECRET_KEY` | `admin12345` | Secret Key Silo |
| `SILO_BUCKET` | `homelab-storage` | Nama bucket Silo |
| `SILO_PUBLIC_URL` | `http://192.168.25.101:9000/homelab-storage` | Base URL publik foto produk |
| `PAP_API_URL` | `http://192.168.25.101:8000/api/v1` | URL API PAP Core |
| `PAP_API_KEY` | `pap_key_pos_cashier_default_secret_key_2026` | API Key terdaftar di PAP Core |

---

## 🐳 Deployment melalui Personal Server Manager (PSM)

1. Buka dashboard **Personal Server Manager** (`http://192.168.25.101:3005`).
2. Masuk ke menu **Projects** → **Add New Project**:
   - **Name**: `pos-cashier`
   - **Framework**: `Next.js`
   - **Source Type**: `Git` (URL repo Anda, branch `Main`) atau `ZIP`
   - **Port**: `3000:3000`
3. Konfigurasi Database di PSM:
   - Pilih database PostgreSQL homelab (`pos_db`). PSM akan otomatis menyiapkan database dan menginjeksi `DATABASE_URL`.
4. Tambahkan Environment Variables di tab Secrets / Config PSM:
   - `SILO_ENDPOINT=http://192.168.25.101:9000`
   - `SILO_ACCESS_KEY=admin`
   - `SILO_SECRET_KEY=admin12345`
   - `SILO_BUCKET=homelab-storage`
   - `PAP_API_URL=http://192.168.25.101:8000/api/v1`
   - `PAP_API_KEY=pap_key_pos_cashier_default_secret_key_2026`
5. Klik **Deploy**!
   - PSM Agent akan mem-build multi-stage `Dockerfile` standalone, menjalankan kontainer, dan menghubungkannya dengan database serta storage secara otomatis.

---

## 📦 Struktur Endpoint API

- `POST /api/auth/login` - Login pengguna (PostgreSQL + Bcrypt)
- `GET /api/auth/me` - Cek sesi pengguna aktif
- `POST /api/auth/logout` - Logout pengguna
- `GET /api/products` - Daftar semua produk
- `POST /api/products` - Tambah produk baru
- `PUT /api/products/[id]` - Ubah produk
- `POST /api/products/[id]/restock` - Tambah stok produk
- `DELETE /api/products/[id]` - Hapus produk
- `GET /api/categories` - Daftar kategori
- `POST /api/categories` - Tambah kategori
- `PUT /api/categories` - Ubah kategori
- `DELETE /api/categories?id=...` - Hapus kategori
- `GET /api/transactions` - Riwayat transaksi
- `POST /api/transactions` - Checkout keranjang (atomic stock update + sync ke PAP Core)
- `GET /api/attendance` - Status absensi & shift kasir
- `POST /api/attendance` - Mulai shift kerja
- `PUT /api/attendance` - Akhiri shift kerja
- `GET /api/dashboard` - Statistik penjualan harian & produk terlaris
- `POST /api/upload` - Upload gambar ke Silo S3 Storage
- `GET, POST /api/pap` - Status & Sinkronisasi katalog produk dari PAP Core (Stock UMKM)
- `POST /api/webhooks/pap` - Penerima webhook event dari PAP Core
- `GET /api/init` - Inisialisasi & verifikasi tabel PostgreSQL
