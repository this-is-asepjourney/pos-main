# Penghitungan Denda Rental (JIROLU)

Dokumen ini menjelaskan aturan hitung yang dipakai aplikasi untuk sewa dan denda keterlambatan.

## 1) Aturan Dasar

- Tarif di master produk adalah **tarif hari ke-1**.
- Jika lama sewa lebih dari 1 hari, ada penambahan tarif per hari sesuai aturan flyer.
- Denda dihitung terpisah dari total sewa, berdasarkan kategori barang dan jumlah hari terlambat.

## 2) Rumus Total Sewa

### 2.1 Rumus per item

Untuk setiap item:

- `lineRental = price * qty * rentalDays`

Keterangan:

- `price`: tarif hari ke-1 per unit
- `qty`: jumlah unit item
- `rentalDays`: lama sewa (minimal 1)

### 2.2 Subtotal sewa (Total Harga Sewa)

- `baseTotalPrice = round(jumlah semua lineRental)`

## 3) Rumus Denda Keterlambatan (Regulasi Terbaru)

### 3.1 Prinsip regulasi

- Regulasi denda berlaku untuk keterlambatan (`lateDays` > 0).
- Jika barang normal: diambil **20%** dari total sewa (`lineBase`) per hari terlambat.
- Jika item perlampuan: diambil **50%** (setengah) dari Harga sewa dasar (`price * qty`) per hari terlambat.
- Denda berlaku untuk semua barang kecuali barang sekali pakai (bebas denda, contoh: gas, koyo, dll).

### 3.2 Denda per hari

Untuk setiap item:

- `lineBase = round(lineRental)` (Total sewa item untuk seluruh durasi sewa)
- `itemBasePrice = price * qty` (Harga sewa harian item)
- Jika normal: `lineLateFeePerDay = lineBase * 20%`
- Jika perlampuan: `lineLateFeePerDay = itemBasePrice * 50%`
- Jika sekali pakai: `lineLateFeePerDay = 0`

Kemudian:

- `lateFeePerDay = jumlah semua lineLateFeePerDay`
- `lateFeeAmount = lateFeePerDay * lateDays`

Keterangan:

- `lateDays`: jumlah hari tambahan di luar perjanjian awal (minimal 0)

## 4) Total Akhir Transaksi

- `totalPrice = baseTotalPrice + lateFeeAmount`

## 5) Contoh Singkat

Misal:

- Tenda JAVA 6 (kategori Tenda), `price=70.000`, `qty=1`
- Lama sewa `2` hari
- Terlambat `1` hari

Langkah:

1. `lineRental = 70.000 * 1 * (1 + 1.2*(2-1)) = 154.000`
2. `baseTotalPrice = 154.000`
3. Rate denda kategori Tenda = `20%` (normal)
4. `lateFeeAmount = 154.000 * 20% * 1 = 30.800`
5. `totalPrice = 154.000 + 30.800 = 184.800`

## 6) Catatan Operasional

- Konsistensi nama kategori penting agar rate denda otomatis terbaca benar:
  - Gunakan nama seperti `Perlampuan` dan `Sekali Pakai`.
- Jika ingin ubah kebijakan, bagian yang biasa diubah:
  - kategori/rate denda
  - rumus hari tambahan sewa

## 7) Input Category yang Harus Dipakai (Agar Terhubung Regulasi Denda)

Sistem membaca kategori berdasarkan **teks nama kategori** (case-insensitive).  
Jadi, penamaan saat input kategori di halaman produk harus konsisten.

### 7.1 Kategori normal (denda 20% per hari)

Masuk kategori normal jika **tidak** mengandung keyword perlampuan atau sekali pakai.

Contoh input kategori:

- `Tenda`
- `Backpack`
- `Sleeping Set`
- `Cooking Set`
- `Sepatu`

### 7.2 Kategori perlampuan (denda efektif 50% per hari)

Agar terbaca sebagai perlampuan, nama kategori perlu mengandung salah satu keyword:

- `perlampuan`
- `penerangan`
- `lampu`
- `lighting`

Contoh input kategori yang direkomendasikan:

- `Perlampuan`
- `Lighting Set`
- `Lampu`

### 7.3 Kategori sekali pakai (bebas denda)

Agar terbaca bebas denda, nama kategori perlu mengandung salah satu keyword:

- `sekali pakai`
- `consumable`
- `habis pakai`

Contoh input kategori yang direkomendasikan:

- `Sekali Pakai`
- `Consumable`

### 7.4 Rekomendasi standar penamaan (disarankan dipakai tim)

Untuk menghindari salah hitung denda, gunakan standar berikut:

- `Perlampuan` untuk semua item lampu/penerangan
- `Sekali Pakai` untuk item consumable (gas, dll)
- selain itu gunakan kategori normal (contoh: `Tenda`, `Carrier`, `Sleeping Set`)
