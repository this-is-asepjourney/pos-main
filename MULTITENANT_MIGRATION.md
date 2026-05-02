# Bro-POS — Multi-Tenant Migration Guide

Panduan ini menjelaskan cara menjalankan refactor multi-tenant di project ini.

## Apa yang berubah?

| Sebelum (flat) | Sesudah (multi-tenant) |
|---|---|
| `users/` | `users/` (mapping global) + `tenants/{tid}/members/` |
| `products/` | `tenants/{tid}/products/` |
| `categories/` | `tenants/{tid}/categories/` |
| `transactions/` | `tenants/{tid}/transactions/` |
| `attendance/` | `tenants/{tid}/attendance/` |
| – | `tenants/{tid}/branches/` |
| – | `tenants/{tid}/reports_daily/` (agregator) |
| – | `subscriptions/{tid}` (billing) |
| – | `plans/{planId}` (paket SaaS) |

Role baru: **`owner`**, `admin`, `cashier`. Owner mewarisi semua kemampuan admin.

## Komponen baru di codebase

- `src/lib/tenant.ts` — path helper (`productsCol(tid)`, `transactionDoc(tid, id)`, dll).
- `src/services/tenant-service.ts` — onboarding tenant, list memberships, dll.
- `src/components/app-provider.tsx` — context multi-tenant: `tenantId`, `role`, `branchActive`, `memberships`, `switchTenant`, `needsOnboarding`.
- `src/app/onboarding/page.tsx` — pembuatan tenant baru (self-service trial 30 hari).
- `src/app/select-tenant/page.tsx` — daftar toko untuk user multi-tenant (mis. franchise / konsultan).
- `firestore.rules` — rules baru pakai custom claims (+ fallback membership lookup untuk transisi).
- `firestore.indexes.json` — index siap deploy.
- `functions/` — Cloud Functions: `setActiveTenant`, `syncTenantClaims`, `onTransactionCreated`, `onMemberWritten`.
- `scripts/migrate-to-multitenant.ts` — migrasi data lama ke struktur baru.

## Demo mode

Tanpa `.env.local` (Firebase belum dikonfigurasi), aplikasi memakai `tenantId = "demo"` dengan data dari `src/lib/demo-data.ts`. Semua service mendeteksi ini lewat `isDemoTenant()` dan mem-bypass Firestore.

## Setup pertama kali (project baru)

```bash
# 1. Install dependencies utama
npm install

# 2. Install dependencies cloud functions
cd functions && npm install && cd ..

# 3. Login Firebase
npx firebase login

# 4. Pilih project
npx firebase use pos-umkm-a109d

# 5a. Deploy Firestore rules + indexes (cukup plan Spark / gratis)
npx firebase deploy --only firestore:rules,firestore:indexes

# 5b. Deploy Cloud Functions (WAJIB plan Blaze — pay-as-you-go)
# Tanpa Blaze, langkah ini gagal dengan error Cloud Build API.
npx firebase deploy --only functions
```

**Perintah yang benar:** gunakan `npx firebase ...` atau `firebase ...` (global CLI). Bukan `npm firebase ...` — itu bukan perintah npm.

**Folder `pos-umkm/`:** jika Anda pernah menjalankan `firebase init functions` dan membuat codebase kedua, itu duplikat. Repo ini hanya memakai satu codebase di `functions/`. `firebase.json` sudah disetel agar hanya deploy `functions/`.

Setelah deploy:

1. Buka aplikasi → register/login user pertama.
2. Halaman `/onboarding` akan muncul otomatis → isi nama toko → **Buat toko**.
3. Anda menjadi `owner` dengan trial 30 hari.

## Migrasi project lama (sudah ada data flat)

> Lakukan di **staging** dulu sebelum production.

### Langkah 1 — Backup

```bash
# Export Firestore (Firebase Console → Firestore → Export)
# Atau via gcloud:
gcloud firestore export gs://<your-bucket>/backup-$(date +%Y%m%d)
```

### Langkah 2 — Persiapkan service account

1. Firebase Console → **Project Settings** → **Service Accounts** → **Generate new private key**.
2. Simpan ke `scripts/serviceAccount.json` (sudah di `.gitignore`).

### Langkah 3 — Edit konfigurasi script

Buka `scripts/migrate-to-multitenant.ts` dan ubah:

```ts
const LEGACY_TENANT_ID = "tenant-bro-pos-001";   // ID tenant baru
const TENANT_NAME      = "Toko Saya";
const OWNER_UID        = "<UID admin lama>";     // dapatkan dari Firebase Auth
```

### Langkah 4 — Jalankan migrasi

```bash
npm install -D tsx
npx tsx scripts/migrate-to-multitenant.ts
```

Skrip akan:

1. Membuat dokumen `tenants/{tid}` + `branches/main` + `subscriptions/{tid}`.
2. Membuat membership `tenants/{tid}/members/{uid}` untuk semua user.
3. Set custom claims `{ tenantId, role, branchIds }` ke setiap user.
4. **Revoke refresh token** semua user (mereka harus login ulang).
5. Memindahkan `categories`, `products`, `transactions`, `attendance` ke subcollection.

### Langkah 5 — Deploy aplikasi versi multi-tenant

```bash
npm run build
npx firebase deploy --only hosting,firestore:rules,firestore:indexes,functions
```

### Langkah 6 — Verifikasi

- Login dengan akun yang ada → harus langsung masuk ke tenant lama.
- Buat user baru → harus diarahkan ke `/onboarding`.
- Cek collection lama (`/products`, `/transactions`, dll) — sekarang TIDAK terbaca aplikasi (sudah di subcollection). Aman dihapus setelah 1–2 minggu observasi.

### Langkah 7 — Hapus collection lama (opsional, setelah aman)

```bash
# Via Firebase Console: Firestore → koleksi → delete collection
# Atau via Admin SDK:
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./scripts/serviceAccount.json')) });
const db = admin.firestore();
['products','categories','transactions','attendance'].forEach(async name => {
  const snap = await db.collection(name).get();
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  console.log('Deleted legacy', name);
});
"
```

## Cara kerja keamanan

### Layer 1: Custom claims (cepat, hemat read)

Saat user melakukan `setActiveTenant({ tenantId })`, Cloud Function akan:

1. Memverifikasi user adalah anggota aktif tenant tersebut.
2. Set custom claims di token-nya: `{ tenantId, role, branchIds }`.

Selanjutnya **setiap query Firestore** membawa claims ini, dan rules cek `request.auth.token.tenantId == tid` tanpa perlu `get()` ke Firestore.

### Layer 2: Fallback membership lookup (untuk transisi)

Jika user belum punya custom claims (misalnya belum sempat panggil `setActiveTenant`), rules akan **fallback** ke `get()` dokumen `tenants/{tid}/members/{uid}` untuk verifikasi. Ini menambah 1 read per request, tetapi membuat aplikasi tetap jalan tanpa Cloud Function di-deploy.

> **Rekomendasi production**: Deploy Cloud Functions sehingga semua user pakai claims (Layer 1).

### Isolasi tenant

- Path subcollection `tenants/{tid}/...` membuat query terisolasi by design.
- Rules `isInTenant(tid)` memastikan user hanya bisa baca/tulis tenant tempat dia jadi member.

## Tips hemat kuota Firestore

1. **Limit + pagination**: semua listener menggunakan `limit()`. Pertimbangkan tambah `startAfter()` untuk pagination.
2. **Aggregator harian**: Cloud Function `onTransactionCreated` menulis ke `reports_daily/{date}_{branch}`. Dashboard cukup baca 1 doc untuk lihat omzet harian.
3. **Field `dateKey` & `monthKey`** di transaction memudahkan filter laporan tanpa range query mahal.
4. **Custom claims** menghilangkan 1 read per request (signifikan di POS yang sering query).
5. **Indexes** sudah disiapkan di `firestore.indexes.json`.

## Roadmap fitur SaaS

Struktur ini sudah siap untuk:

- ✅ **Multi cabang** — field `branchId` di tx & attendance, `stockByBranch` di product, collection `branches/`.
- ✅ **Langganan bulanan** — collection `subscriptions/{tid}`, rules `subActive(tid)` melakukan hard-stop saat expired.
- ✅ **Laporan owner** — `reports_daily` siap di-query lintas tanggal.
- ✅ **Franchise (multi tenant per owner)** — array `users.tenantIds[]`, `switchTenant()` di context.

## FAQ

**Q: Saya cuma 1 toko, perlu pakai multi-tenant?**
A: Ya, struktur ini tidak menambah biaya signifikan dan membuat scaling ke depan jauh lebih mudah.

**Q: Bisa pakai tanpa deploy Cloud Functions?**
A: Bisa, tetapi setiap request akan ada 1 extra Firestore read (fallback ke membership doc). Untuk volume tinggi, deploy Cloud Functions sangat disarankan.

**Q: Bagaimana migrasi user yang sudah login?**
A: Skrip migrasi memanggil `auth.revokeRefreshTokens(uid)` sehingga semua sesi aktif akan di-logout di refresh berikutnya. User akan login ulang dan otomatis dapat tenant lama.
