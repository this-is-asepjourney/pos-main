# Panduan Deploy Gratis Firebase untuk NusaPOS

Panduan ini memakai jalur gratis dan menghindari Firebase Storage sepenuhnya.

Yang dipakai:

- Firebase Spark plan.
- Firebase Authentication untuk login Email/Password.
- Cloud Firestore untuk database POS.
- Firebase Hosting (Classic) untuk publish web publik gratis.

Yang tidak dipakai:

- Firebase Storage.
- Cloud Functions.
- Firebase Extensions.
- Firebase AI Logic.
- Remote Config.
- Realtime Database.
- Payment gateway berbayar.

Catatan: gratis tetap punya kuota. Selama tidak upgrade ke Blaze/berbayar, Firebase tidak akan menagih otomatis, tetapi layanan bisa dibatasi jika kuota gratis habis.

## 1. Prasyarat Lokal

Masuk ke root project:

```bash
cd c:\xampp\htdocs\pos-main
```

Install dependency:

```bash
npm install
```

Install Firebase CLI:

```bash
npm install -g firebase-tools
```

Login Firebase:

```bash
firebase login
```

## 2. Buat Project Firebase Gratis

1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Klik **Add project**.
3. Isi nama project, contoh `pos-umkm`.
4. Saat diminta Google Analytics, pilih **Disable Google Analytics** agar sederhana.
5. Setelah project dibuat, cek plan di **Project settings > Usage and billing**.
6. Pastikan masih **Spark plan**.

Jangan upgrade ke Blaze jika ingin tetap tanpa biaya.

## 3. Buat Web App Firebase

1. Masuk ke **Project settings**.
2. Di bagian **Your apps**, klik icon Web.
3. Nama app: `NusaPOS Web`.
4. Jangan centang setup hosting jika tidak diperlukan.
5. Klik **Register app**.
6. Salin config Firebase Web App.

## 4. Isi `.env.local`

Buat file dari template:

```bash
copy .env.example .env.local
```

Isi hanya env yang dibutuhkan project:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=isi_dari_firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=isi_dari_firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=isi_dari_firebase
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=isi_dari_firebase
NEXT_PUBLIC_FIREBASE_APP_ID=isi_dari_firebase

# Cloudinary untuk upload gambar produk (opsional)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=isi_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=isi_unsigned_upload_preset
NEXT_PUBLIC_CLOUDINARY_FOLDER=pos-products
```

Tidak perlu `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` karena project ini tidak memakai Firebase Storage.

Jangan upload `.env.local` ke GitHub.

## 5. Aktifkan Authentication Gratis

1. Buka Firebase Console.
2. Masuk ke **Build > Authentication**.
3. Klik **Get started**.
4. Buka tab **Sign-in method**.
5. Aktifkan **Email/Password**.
6. Jangan aktifkan provider lain dulu.

Buat user admin:

```text
Authentication > Users > Add user
```

Contoh:

```text
Email: admin@nusapos.local
Password: buat_password_sendiri
```

User ini dipakai login di `/login`.

## 5.1. Set Role User (Admin/Kasir)

Setelah user dibuat di Authentication, buat dokumen user di Firestore:

```text
Collection: users
Document ID: <uid_dari_auth_user>
```

Isi data:

```json
{
  "name": "Owner",
  "email": "admin@nusapos.local",
  "role": "admin"
}
```

Role yang didukung:

- `admin`: akses dashboard + manage produk (CRUD) + categories + transactions + kasir.
- `cashier`: akses halaman kasir (`/`) saja.

## 6. Aktifkan Firestore Gratis

1. Buka **Build > Firestore Database**.
2. Klik **Create database**.
3. Pilih **Production mode**.
4. Pilih region yang tersedia dan dekat, contoh `asia-southeast1`.
5. Selesaikan pembuatan database.

Collection yang dipakai:

```text
users
categories
products
transactions
```

### Tambahan struktur untuk alur pengembalian

Agar fitur return berjalan penuh, dokumen `transactions` kini memakai field tambahan:

```text
status: "rented" | "overdue" | "returned"
checkoutChecklist: { condition, accessories, photoNotes }
returnChecklist: { condition, accessories, photoNotes }
returnedAt
actualReturnDate
lateDays
lateFeeAmount
```

Dan dokumen `products` akan diupdate `stock` saat:

- checkout sewa (stok berkurang)
- pengembalian (stok bertambah)

## 7. Firebase Init Tanpa Storage

Jalankan:

```bash
firebase init
```

Pilih fitur ini saja:

```text
[x] Firestore
[x] Emulators
[x] Authentication
```

Jangan pilih:

```text
[ ] Storage
[ ] Functions
[ ] Hosting
[ ] Remote Config
[ ] Extensions
[ ] Realtime Database
[ ] AI Logic
```

Hosting dipakai untuk publish web statis hasil build Next.js.

Storage tidak dipilih karena project ini sengaja tidak memakai Firebase Storage.

## 8. Jawaban Saat `firebase init`

Saat memilih project:

```text
Use an existing project
```

Pilih project Firebase yang sudah dibuat.

Firestore rules file:

```text
firestore.rules
```

Firestore indexes file:

```text
firestore.indexes.json
```

Emulator yang dipilih:

```text
Authentication Emulator
Firestore Emulator
```

Port emulator biarkan default.

## 9. Firestore Rules Aman

Pastikan `firestore.rules` tidak memakai rules default sementara seperti:

```js
allow read, write: if request.time < timestamp.date(...);
```

Gunakan rules berikut:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    match /users/{userId} {
      allow read: if signedIn();
      allow create: if signedIn() && request.auth.uid == userId;
      allow update: if signedIn() && request.auth.uid == userId;
      allow delete: if false;
    }

    match /categories/{categoryId} {
      allow read: if signedIn();
      allow create, update, delete: if signedIn();
    }

    match /products/{productId} {
      allow read: if signedIn();
      allow create, update, delete: if signedIn();
    }

    match /transactions/{transactionId} {
      allow read, create: if signedIn();
      allow update, delete: if false;
    }
  }
}
```

Deploy rules Firestore:

```bash
firebase deploy --only firestore:rules
```

### 9.1 Rules untuk modul pengembalian

Pastikan `firestore.rules` terbaru sudah mengizinkan:

- staff (`admin`/`cashier`) update stok produk untuk flow sewa+return (`stock`, `updatedAt`)
- staff memproses return transaksi dengan field:
  - `status`, `actualReturnDate`, `returnedAt`
  - `returnChecklist`
  - `lateDays`, `lateFeeAmount`, `totalPrice`
  - `paidAmount`, `changeAmount`, `updatedAt`

Setelah update rules:

```bash
firebase deploy --only firestore:rules
```

## 10. Tidak Perlu Deploy Storage

Jangan jalankan:

```bash
firebase deploy --only storage
```

Project ini tidak punya target Storage di `firebase.json`, jadi command tersebut memang tidak dibutuhkan.

Jika muncul error:

```text
No targets in firebase.json match '--only storage'
```

Itu normal untuk project ini karena Storage sengaja tidak dipakai. Abaikan command Storage dan cukup deploy:

```bash
firebase deploy --only firestore:rules
```

## 11. Gambar Produk Tanpa Storage

Project ini tetap punya field `imageUrl`, tetapi nilainya hanya URL opsional.

Pilihan gratis:

- Kosongkan field gambar.
- Pakai URL gambar eksternal yang sudah tersedia.
- Pakai gambar placeholder publik.
- Simpan file gambar statis di folder `public` jika jumlahnya sedikit.

Contoh URL lokal dari folder `public`:

```text
/products/americano.jpg
```

Letakkan file di:

```text
public/products/americano.jpg
```

Untuk saat ini UI tetap berjalan meskipun `imageUrl` kosong.

## 12. Seed Data Awal Gratis

Cara paling mudah:

1. Jalankan app lokal.
2. Login dengan user admin.
3. Buka `/products`.
4. Tambah kategori dan produk dari UI.

Jalankan:

```bash
npm run dev
```

Buka:

```text
http://localhost:3000/login
```

Kategori awal:

```text
Coffee
Non Coffee
Food
Dessert
```

Contoh produk:

```text
Nama: Americano
Harga: 20000
Stok: 50
Kategori: Coffee
Image URL: kosongkan
```

## 13. Test Lokal

Jalankan:

```bash
npm run dev
```

Test urutan ini:

1. Login di `/login`.
2. Buka `/products`.
3. Tambah kategori.
4. Tambah produk.
5. Buka `/`.
6. Tambahkan produk ke cart.
7. Input nominal bayar.
8. Klik checkout.
9. Cek Firestore collection `transactions`.
10. Pastikan stok produk berkurang.

## 14. Test Build Production

Sebelum deploy:

```bash
npm run lint
npm run build
```

Jika sukses, frontend siap dipublish.

## 15. Deploy Frontend Gratis ke Firebase Hosting (Publik)

Karena target gratis, pakai Firebase Hosting Classic (bukan App Hosting).

1. Build static Next.js:

```bash
npm run build
```

2. Pastikan folder output `out` terbentuk.
3. Deploy ke Firebase Hosting:

```bash
firebase deploy --only hosting
```

4. Setelah selesai, akses URL publik dari output CLI:

```text
https://<project-id>.web.app
https://<project-id>.firebaseapp.com
```

Jika belum pernah init Hosting, jalankan sekali:

```bash
firebase init hosting
```

Jawaban saat init:

```text
Use an existing project
Public directory: out
Configure as single-page app: Yes
Set up automatic builds with GitHub: No
```

Env frontend tetap sama:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Jangan tambahkan `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` karena tidak dipakai.

Catatan:

- Karena project ini client-side (Firestore/Auth di browser), static export aman dipakai.
- Kamu tetap bisa custom domain dari menu Hosting.

## 16. Deploy Firestore Rules

Deploy hanya Firestore rules:

```bash
firebase deploy --only firestore:rules
```

Untuk deploy lengkap frontend + rules:

```bash
firebase deploy --only hosting,firestore:rules
```

Tidak perlu:

```bash
firebase deploy --only storage
firebase deploy --only functions
```

## 17. Checklist Gratis

- Firebase project masih Spark plan.
- Tidak ada billing account yang ditautkan jika ingin benar-benar tanpa risiko tagihan.
- Authentication Email/Password aktif.
- Firestore Database aktif.
- Firestore rules sudah dideploy.
- Firebase Storage tidak dipakai.
- Cloud Functions tidak dipakai.
- Extensions tidak dipakai.
- Realtime Database tidak dipakai.
- AI Logic tidak dipakai.
- Frontend dideploy ke Firebase Hosting (Classic).
- Env lokal/proses build tidak berisi `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.

## 18. Tips Hemat Kuota

- Jangan import data dummy terlalu banyak.
- Simpan `categoryName` di produk agar tidak perlu query tambahan.
- Simpan item lengkap di transaksi agar tidak perlu join/query produk lagi.
- Hapus transaksi testing yang tidak diperlukan.
- Gunakan gambar statis lokal di `public` jika benar-benar butuh gambar.

## 19. Troubleshooting

Jika app masih demo mode:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Pastikan semuanya terisi di `.env.local` sebelum build.

Jika login gagal:

1. Pastikan Email/Password aktif.
2. Pastikan user sudah dibuat di Firebase Authentication.
3. Pastikan env Firebase benar.

Jika data tidak bisa ditulis:

1. Pastikan sudah login.
2. Pastikan Firestore rules sudah deploy.
3. Pastikan nama collection sesuai: `categories`, `products`, `transactions`.
