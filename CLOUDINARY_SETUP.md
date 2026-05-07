# Panduan Koneksi Cloudinary

Panduan ini dipakai agar upload foto produk di halaman `Produk` bisa otomatis masuk ke Cloudinary dan URL gambarnya tersimpan di Firestore.

## 1. Buat Akun dan Ambil Cloud Name

1. Buka [Cloudinary Console](https://console.cloudinary.com/).
2. Login atau buat akun baru.
3. Masuk ke halaman `Dashboard`.
4. Salin nilai `Cloud name`.

Contoh:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=my-cloud-name
```

## 2. Buat Upload Preset Unsigned

Upload dari browser harus memakai `unsigned upload preset`, bukan `API Secret`.

1. Di Cloudinary Console, buka `Settings`.
2. Masuk ke menu `Upload`.
3. Cari bagian `Upload presets`.
4. Klik `Add upload preset`.
5. Ubah `Signing Mode` menjadi `Unsigned`.
6. Isi nama preset, misalnya:

```text
pos_products_unsigned
```

7. Simpan preset.

Masukkan nama preset itu ke `.env.local`:

```env
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=pos_products_unsigned
```

## 3. Isi File `.env.local`

Pastikan `.env.local` memiliki konfigurasi Cloudinary seperti ini:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=isi_cloud_name_kamu
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=isi_upload_preset_unsigned_kamu
NEXT_PUBLIC_CLOUDINARY_FOLDER=pos-products
```

Keterangan:

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`: Cloud name dari dashboard Cloudinary.
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`: nama upload preset dengan mode `Unsigned`.
- `NEXT_PUBLIC_CLOUDINARY_FOLDER`: folder tujuan gambar produk di Cloudinary. Boleh diganti, misalnya `nusa-pos/products`.

Jangan masukkan `API Secret` ke variable `NEXT_PUBLIC_*`, karena variable ini bisa terbaca di browser.

## 4. Restart Development Server

Setelah mengubah `.env.local`, matikan lalu jalankan ulang server:

```bash
npm run dev
```

Next.js perlu restart agar env baru terbaca.

## 5. Tes Upload Produk

1. Buka aplikasi.
2. Login sebagai admin.
3. Masuk ke halaman `Produk`.
4. Isi:
   - Nama produk
   - Harga
   - Stok
   - Kategori
5. `SKU` dan `Barcode` boleh dikosongkan.
6. Klik `Pilih Gambar Produk`.
7. Pilih file gambar.
8. Klik `Simpan`.

Jika berhasil:

- Foto akan muncul di Cloudinary pada folder yang diatur di `NEXT_PUBLIC_CLOUDINARY_FOLDER`.
- Data produk akan tersimpan di Firestore dengan field `imageUrl`.
- Produk akan muncul di daftar produk dan halaman kasir.

## 6. Troubleshooting

### Tombol Pilih Gambar Tidak Bisa Dipakai

Kemungkinan env Cloudinary belum lengkap. Cek `.env.local`:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

Keduanya harus terisi, lalu restart `npm run dev`.

### Muncul Pesan Upload Gambar Gagal

Cek hal berikut:

- Upload preset sudah `Unsigned`.
- Nama upload preset di `.env.local` sama persis dengan yang ada di Cloudinary.
- Cloud name benar.
- File yang dipilih adalah gambar.

### Gambar Berhasil Upload Tapi Produk Tidak Tersimpan

Ini biasanya bukan masalah Cloudinary, tapi permission Firestore. Cek:

- User sudah login.
- Dokumen `users/{uid}` di Firestore memiliki:

```js
role: "admin"
```

- Rules Firestore sudah di-deploy:

```bash
firebase deploy --only firestore:rules
```

### Sudah Deploy Hosting Tapi Cloudinary Tetap Tidak Berubah

Project ini memakai static export. Env `NEXT_PUBLIC_*` akan ikut tertanam saat build. Setelah mengubah `.env.local`, jalankan ulang build dan deploy:

```bash
npm run build
firebase deploy --only hosting
```

## 7. File yang Menggunakan Cloudinary

Upload Cloudinary diproses di:

```text
src/lib/cloudinary.ts
```

Form tambah/edit produk memakai helper tersebut di:

```text
src/app/products/page.tsx
```
