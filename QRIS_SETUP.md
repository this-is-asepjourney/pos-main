# Panduan QRIS Otomatis

Fitur QRIS checkout di Bro-POS menggunakan payload QRIS statis merchant, lalu aplikasi membuat QRIS dinamis sesuai total belanja.

## Cara Kerja

1. Kasir memilih metode pembayaran `QRIS`.
2. Aplikasi mengambil total belanja.
3. Aplikasi membuat payload QRIS dinamis dengan nominal tersebut.
4. QR ditampilkan di panel checkout.
5. Setelah pelanggan membayar, kasir klik `Checkout Sekarang`.

Catatan penting: fitur ini tidak memverifikasi status pembayaran otomatis dari bank. Untuk verifikasi otomatis, perlu integrasi payment gateway seperti Midtrans, Xendit, DOKU, atau penyedia QRIS resmi lain.

## Setup `.env.local`

Tambahkan payload QRIS statis merchant:

```env
NEXT_PUBLIC_QRIS_STATIC_PAYLOAD=isi_payload_qris_statis_kamu
```

Payload QRIS biasanya berupa teks panjang yang dimulai seperti:

```text
00020101021126...
```

Setelah mengubah `.env.local`, restart development server:

```bash
npm run dev
```

Untuk production static export, build dan deploy ulang:

```bash
npm run build
firebase deploy --only hosting
```

## Cara Mendapatkan Payload QRIS Statis

Cara paling mudah:

1. Buka gambar QRIS merchant milik usaha kamu.
2. Scan dengan aplikasi QR scanner yang bisa menampilkan raw text QR.
3. Salin seluruh teks payload QRIS.
4. Masukkan ke `NEXT_PUBLIC_QRIS_STATIC_PAYLOAD`.

Pastikan payload berasal dari QRIS merchant milik kamu sendiri.

## Troubleshooting

### QRIS Tidak Muncul

Cek:

- `NEXT_PUBLIC_QRIS_STATIC_PAYLOAD` sudah terisi.
- Server sudah direstart setelah mengubah `.env.local`.
- Cart memiliki item dan total belanja lebih dari 0.

### Checkout QRIS Tidak Bisa Diklik

Checkout QRIS akan nonaktif jika payload QRIS belum dikonfigurasi. Isi `NEXT_PUBLIC_QRIS_STATIC_PAYLOAD`, lalu restart server.

### QR Tidak Bisa Dibayar

Cek:

- Payload QRIS statis benar dan lengkap.
- QRIS merchant masih aktif.
- Nominal transaksi valid.
- Aplikasi pembayar mendukung QRIS dinamis.

## File Terkait

Generator payload QRIS:

```text
src/lib/qris.ts
```

Tampilan QRIS di checkout:

```text
src/components/cart-panel.tsx
```
