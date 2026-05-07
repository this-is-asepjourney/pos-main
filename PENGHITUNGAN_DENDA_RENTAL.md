# Penghitungan Denda Rental (JIROLU)

Dokumen ini menjelaskan aturan hitung yang dipakai aplikasi untuk sewa dan denda keterlambatan.

## 1) Aturan Dasar

- Tarif di master produk adalah **tarif hari ke-1**.
- Jika lama sewa lebih dari 1 hari, ada penambahan tarif per hari sesuai aturan flyer.
- Denda dihitung terpisah dari total sewa, berdasarkan kategori barang dan jumlah hari terlambat.

## 2) Rumus Total Sewa

### 2.1 Rumus per item

Untuk setiap item:

- `lineRental = price * qty * (1 + 1.2 * (rentalDays - 1))`

Keterangan:

- `price`: tarif hari ke-1 per unit
- `qty`: jumlah unit item
- `rentalDays`: lama sewa (minimal 1)

### 2.2 Subtotal sewa

- `rentalSubtotalBeforeHoliday = jumlah semua lineRental`

### 2.3 Pengali liburan akhir tahun (opsional)

- Jika tanggal ambil 28–31 Desember, sistem memakai:
  - `holidayMultiplier = NEXT_PUBLIC_RENTAL_YEAR_END_MULTIPLIER` (default `1`)
- Jika bukan 28–31 Desember:
  - `holidayMultiplier = 1`

Lalu:

- `baseTotalPrice = round(rentalSubtotalBeforeHoliday * holidayMultiplier)`

## 3) Rumus Denda Keterlambatan (Regulasi Terbaru)

### 3.1 Prinsip regulasi

- Denda dasar: **20% per hari** dari nilai sewa.
- Kategori normal (tenda, backpack, sleeping set, dll): basis tarif **100%**.
- Kategori perlampuan: basis tarif **50%**.
- Kategori sekali pakai: basis tarif **0%** (bebas denda).
- Denda berlaku untuk setiap tambah hari sewa di luar perjanjian awal (`lateDays`).

### 3.2 Formula rate efektif per kategori

- `effectiveLateRate = 20% * categoryBaseFactor`
- Normal: `categoryBaseFactor = 1` → `effectiveLateRate = 20%`
- Perlampuan: `categoryBaseFactor = 0.5` → `effectiveLateRate = 10%`
- Sekali pakai: `categoryBaseFactor = 0` → `effectiveLateRate = 0%`

### 3.3 Denda per hari

Untuk setiap item:

- `lineBase = round(lineRental * holidayMultiplier)`
- `lineLateFeePerDay = lineBase * effectiveLateRate`

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
- Tidak masuk tanggal liburan (`holidayMultiplier=1`)
- Terlambat `1` hari

Langkah:

1. `lineRental = 70.000 * 1 * (1 + 1.2*(2-1)) = 154.000`
2. `baseTotalPrice = 154.000`
3. Rate denda kategori Tenda = `20%` (normal, basis 100%)
4. `lateFeeAmount = 154.000 * 20% * 1 = 30.800`
5. `totalPrice = 154.000 + 30.800 = 184.800`

## 6) Catatan Operasional

- Konsistensi nama kategori penting agar rate denda otomatis terbaca benar:
  - Gunakan nama seperti `Perlampuan` dan `Sekali Pakai`.
- Jika ingin ubah kebijakan, bagian yang biasa diubah:
  - kategori/rate denda
  - multiplier akhir tahun
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

### 7.2 Kategori perlampuan (denda efektif 10% per hari)

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
