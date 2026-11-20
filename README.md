# Monitoring Stok & Tools TBS TCN — versi web (Vercel) · v1.3

Project ini siap di-deploy ke Vercel. Semua orang yang membuka link deployment-nya akan **melihat & mengubah data yang sama** (tersimpan di server lewat database Upstash Redis), bukan cuma tersimpan di browser masing-masing.

## Isi folder

```
index.html      -> seluruh aplikasi (dashboard, real stok, stock opname, barang masuk/keluar, tools, master kode spek)
api/state.js    -> serverless function untuk baca/simpan data (dipakai otomatis oleh index.html)
package.json    -> dependency @upstash/redis
```

## Langkah deploy

### 1. Deploy ke Vercel

**Cara tercepat (tanpa GitHub) — pakai Vercel CLI:**
```bash
npm install -g vercel
cd SiMoST_v1.3          # masuk ke folder ini
vercel                  # ikuti instruksi (login, pilih/buat project)
vercel --prod           # deploy ke production
```

**Atau lewat GitHub:**
1. Upload folder ini jadi repo baru di GitHub.
2. Di vercel.com -> **Add New Project** -> import repo tersebut.
3. Framework preset biarkan **"Other"**, klik **Deploy**.

Deployment pertama ini akan **gagal/error saat dibuka** dulu — itu wajar, karena database-nya belum dipasang (langkah 2).

### 2. Aktifkan database Upstash Redis (penyimpanan bersama)

> Vercel KV sudah dihentikan (di-sunset) dan dipindah ke Vercel Marketplace dengan nama **Upstash Redis**. Fungsinya sama persis seperti KV dulu, cuma nama & letak menunya berubah.

1. Buka project-nya di dashboard Vercel -> tab **Storage** (atau menu **Marketplace** di sidebar).
2. Cari **"Upstash for Redis"** (kadang muncul sebagai **"Upstash"** saja) -> klik **Add** / **Install**.
3. Kalau diminta, pilih **Create Database** (paket gratis cukup untuk pemakaian kecil), beri nama bebas.
4. Pastikan langkah **Connect Project** memilih project ini, lalu **Save** / **Connect**.
5. Vercel akan otomatis menambahkan environment variable yang dibutuhkan (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — kadang juga muncul dengan nama lama `KV_REST_API_URL` / `KV_REST_API_TOKEN`; kode di `api/state.js` sudah mendukung kedua nama tersebut) ke project ini.

**Kalau di dashboard benar-benar tidak ada opsi Storage/Marketplace** (jarang terjadi, biasanya karena akun/region tertentu), alternatif manual lewat Upstash langsung:
1. Buat akun gratis di upstash.com -> buat database Redis baru.
2. Di halaman database itu, salin **REST URL** dan **REST TOKEN**-nya.
3. Di Vercel: project ini -> **Settings** -> **Environment Variables** -> tambahkan manual:
   - `UPSTASH_REDIS_REST_URL` = (REST URL dari Upstash)
   - `UPSTASH_REDIS_REST_TOKEN` = (REST TOKEN dari Upstash)
4. Lanjut ke langkah 3 di bawah (redeploy).

### 3. Redeploy

Environment variable baru hanya berlaku setelah deploy ulang:
- Dashboard Vercel -> tab **Deployments** -> klik **...** pada deployment terakhir -> **Redeploy**.
- Atau jalankan `vercel --prod` lagi dari terminal.

### 4. Cek

Buka URL deployment-nya (mis. `https://nama-project.vercel.app`). Di pojok kanan atas harus muncul tulisan:

> **Tersimpan di server — dibagikan ke semua pengguna**

Kalau yang muncul malah **"Tersimpan di browser ini saja"**, berarti database Upstash belum ter-connect dengan benar, atau belum redeploy setelah connect — ulangi langkah 2–3.

## Catatan

- Data awal (isi 5 sheet Excel yang diunggah) sudah tertanam di `index.html` sebagai data awal. Begitu ada transaksi pertama, data disimpan ke database dan dipakai bersama sejak saat itu.
- Aplikasi ini otomatis mendeteksi cara ia dibuka: kalau dibuka langsung sebagai file (bukan lewat Vercel), ia akan memakai penyimpanan browser (localStorage) — datanya tidak dibagikan ke orang lain.
- Tombol **"Reset ke data awal"** mereset data untuk **semua orang**. Sekarang harus mengetik `RESET` untuk konfirmasi, dan ada tombol unduh backup di dialognya.

### Kunci dengan PIN (opsional)

Supaya tidak sembarang orang yang punya link bisa mengubah data: di Vercel -> **Settings** -> **Environment Variables** tambahkan `APP_PIN` = (PIN pilihan Anda), lalu redeploy. Setiap pengguna akan diminta PIN sekali, lalu PIN diingat di browser masing-masing. Tanpa `APP_PIN`, aplikasi tetap terbuka seperti sebelumnya.

## Perubahan v1.3 — 2 tema: White & Dark

- Pilihan tema di kanan atas: **☀️ White**, **🌙 Dark**, atau **💻 Auto** (ikut setelan terang/gelap HP atau laptop). Pilihan diingat per browser; default Auto.
- White mode dibuat ulang: latar putih bersih, kartu putih solid, garis abu-abu tipis, aksen ungu–pink.
- Dark mode tetap tema neon dari v1.2.

## Perubahan v1.2 — tampilan baru

- Font baru (Unbounded untuk judul, Space Grotesk untuk teks, JetBrains Mono untuk kode), tab berbentuk pill dengan ikon, kartu kaca (glass) dengan aksen gradien, tombol & status berbentuk pill, animasi halus pada modal dan notifikasi.
- Semua fungsi & data sama persis dengan v1.1.

## Perubahan v1.1

**Perbaikan bug**
- Kode spek yang tersimpan huruf kecil (`b2wn0286766m`, `b2wn010017ma`) tidak bisa dicatat keluar dan membuat baris dobel saat barang masuk. Sekarang semua kode spek otomatis dirapikan ke huruf besar.
- "Reset sesi opname sekarang" ikut menghapus riwayat opname bulan-bulan sebelumnya. Sekarang riwayat tetap aman, dan hasil hitung SKU non-REGIS ikut direset sesuai sesi.
- Kalau server gagal saat menyimpan, data diam-diam disimpan di browser saja lalu hilang saat halaman dibuka ulang. Sekarang muncul pesan gagal dan perubahan dibatalkan, jadi tidak ada yang mengira data sudah tersimpan.
- Hapus catatan "baru — tidak terdaftar" dan pinjam/kembali tools memakai nomor urut baris, sehingga bisa mengenai baris yang salah kalau data berubah. Sekarang memakai no. registrasi.
- Tanggal tidak divalidasi (bisa terisi `31/02/2026` atau teks bebas). Sekarang wajib format dd/mm/yyyy yang valid.
- Barang masuk per REGIS tidak menambah kolom MASUK PSB/PROJECT/POC, dan barang keluar per REGIS tidak menambah kolom KELUAR. Sekarang konsisten.
- Unit yang tadinya tercatat "baru — tidak terdaftar" di opname tetap nyangkut walau sudah didaftarkan lewat Barang Masuk. Sekarang otomatis pindah ke "sudah di-opname".
- Teks petunjuk No. Registrasi di Barang Masuk tetap merah setelah diisi.
- "Salin tabel ke Excel" gagal di sebagian browser, dan isi sel yang mengandung tab/enter merusak kolom.

**Optimasi**
- **Tidak saling timpa:** setiap simpan membawa nomor versi. Kalau orang lain menyimpan lebih dulu, aplikasi mengambil data terbaru lalu menerapkan ulang transaksi Anda di atasnya, termasuk cek ulang stok (unit yang sudah dikeluarkan orang lain tidak bisa dikeluarkan dua kali, tools yang sudah dipinjam tidak bisa dipinjam lagi).
- **Sinkron otomatis** setiap 15 detik dan saat tab dibuka kembali. Kalau Anda sedang mengisi form, data tidak langsung diganti; muncul pemberitahuan "Ada data baru".
- **Backup harian otomatis** di server (disimpan 14 hari, key `tcn-stock-state-v1:backup:YYYY-MM-DD`), plus tombol **Unduh backup** dan **Pulihkan** di pojok kanan atas.
- Pencarian lebih ringan (indeks kode spek & jeda ketik), daftar autocomplete kode spek tidak dibangun ulang setiap render.
- Filter baru di Real Stok: **"Stok ≠ jumlah no. registrasi"**. Ada 7 SKU dari data Excel yang stok akhirnya lebih besar dari jumlah no. registrasi yang tercatat (mis. B2WN01000462: stok 5, REGIS 2). Saat barang keluar, stok kode ini akan mengikuti jumlah REGIS, jadi sebaiknya lengkapi no. registrasinya dulu. Form Barang Keluar menampilkan peringatan untuk kode ini.
- Kompatibel dengan data lama: key database tetap sama, tidak perlu migrasi.
