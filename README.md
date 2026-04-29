# NusaPOS - Professional Cashier System

Sistem POS kasir profesional berbasis Next.js App Router, TypeScript, Tailwind, dan Firebase. Project ini mengikuti blueprint di `bluprint.md` dengan koleksi Firestore `users`, `categories`, `products`, dan `transactions`.

## Setup

```bash
npm install
cp .env.example .env.local
```

Isi `.env.local` dengan konfigurasi Firebase Web App. Jika env belum diisi, aplikasi berjalan dalam demo mode memakai data contoh agar UI tetap bisa diuji.

Jika ingin upload gambar produk via Cloudinary, isi juga:

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` (unsigned preset)
- `NEXT_PUBLIC_CLOUDINARY_FOLDER` (opsional, default contoh: `pos-products`)

## Development

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Fitur

- Kasir cepat dengan pencarian produk, filter kategori, cart sidebar, pembayaran, kembalian, dan checkout.
- Role-based access: `admin` untuk dashboard + manage produk/categories/transaksi, `cashier` untuk halaman kasir.
- Dashboard owner berisi omzet, jumlah transaksi, rata-rata transaksi, stok rendah, grafik, dan produk terlaris.
- Manajemen produk dan kategori dengan struktur data Firestore terdenormalisasi (CRUD). Gambar produk bisa via URL manual atau upload Cloudinary, tanpa Firebase Storage.
- Riwayat transaksi dengan detail invoice dan item transaksi tersimpan penuh.
- `firestore.rules` dengan validasi role `admin` dan `cashier`.

## Firebase

Deploy rules awal:

```bash
firebase deploy --only firestore:rules
```

Untuk produksi, buat user lewat Firebase Auth, lalu isi koleksi `users` sesuai role `admin` atau `cashier` (doc ID harus sama dengan `uid` user Auth).

Project ini tidak memakai Firebase Storage agar tetap sederhana dan bebas dari ketergantungan storage. Jika butuh gambar produk, gunakan URL gambar eksternal yang sudah tersedia.
