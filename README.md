# TEPAT — Triase Evaluasi Perbaikan dan Anggaran Terukur

> Sistem Pendukung Keputusan Geospasial untuk Prioritas Perbaikan Infrastruktur Mikro Jalan dan Optimasi Alokasi Anggaran.

**Tautan Produksi:** [https://infratriage.vercel.app](https://infratriage.vercel.app)

---

## Daftar Isi

1. [Tentang TEPAT](#1-tentang-tepat)
2. [Fitur Utama](#2-fitur-utama)
3. [Panduan Coba Cepat untuk Juri](#3-panduan-coba-cepat-untuk-juri)
4. [Cara Menjalankan Secara Lokal](#4-cara-menjalankan-secara-lokal)
5. [Arsitektur Sistem](#5-arsitektur-sistem)
6. [Mesin Skor dan Klasterisasi](#6-mesin-skor-dan-klasterisasi)
7. [Simulasi Anggaran dan Uji Ketahanan Biaya](#7-simulasi-anggaran-dan-uji-ketahanan-biaya)
8. [Analisis Sensitivitas Bobot](#8-analisis-sensitivitas-bobot)
9. [Pengujian Otomatis](#9-pengujian-otomatis)
10. [Keterbatasan dan Asumsi](#10-keterbatasan-dan-asumsi)
11. [Rencana Pengembangan (Roadmap)](#11-rencana-pengembangan-roadmap)
12. [Atribusi Data dan Lisensi](#12-atribusi-data-dan-lisensi)

---

## 1. Tentang TEPAT

Pengelolaan pengaduan infrastruktur jalan konvensional umumnya hanya berfungsi sebagai penampung tiket laporan warga tanpa kemampuan analitis untuk menentukan titik mana yang harus ditangani lebih dulu saat anggaran terbatas. Akibatnya, laporan ganda di titik yang sama dihitung terpisah, pembagian dana perbaikan kerap dilakukan manual berdasarkan urutan waktu masuk (*First-In First-Out*) tanpa mempertimbangkan efisiensi biaya, serta keputusan prioritas rentan bias subjektif. **TEPAT** hadir sebagai platform pendukung keputusan geospasial yang secara otomatis menggabungkan (*cluster*) laporan warga berbasis kedekatan spasial, menghitung skor urgensi multi-kriteria 0–100 yang transparan dan dapat dijelaskan (*explainable*), serta merekomendasikan alokasi anggaran optimal menggunakan pendekatan algoritma *Dynamic Programming* (Knapsack 0/1) yang dilengkapi simulasi ketahanan biaya terhadap ketidakpastian lapangan.

---

## 2. Fitur Utama

- **Peta Interaktif dan Klasterisasi Spasial:** Visualisasi peta berbasis Leaflet dengan penggabungan otomatis titik kerusakan ganda berdasarkan radius toleransi spesifik per kategori masalah. Pin peta diwarnai otomatis sesuai tingkat urgensi (Kritis, Tinggi, Sedang) dan dapat menampilkan layer fasilitas vital di sekitarnya.
- **Laporan Baru dengan Bukti Foto:** Warga atau petugas dapat menambahkan laporan langsung dengan mengklik koordinat di peta. Dilengkapi kompresi gambar otomatis di peramban dan penyimpanan foto privat di *cloud storage* yang hanya dapat diakses melalui tautan berbatas waktu (*signed URL*).
- **Skor Prioritas yang Dapat Dijelaskan (*Explainable AI/Scoring*):** Setiap klaster dinilai melalui 5 kriteria terukur dengan rincian kontribusi poin yang transparan (tanpa konsep *black-box*).
- **Simulasi 4 Strategi Alokasi Anggaran:** Membandingkan rekomendasi paket perbaikan antara *Dynamic Programming* (Knapsack 0/1), *Greedy Skor per Biaya*, *Skor Tertinggi Dulu*, dan *Urutan Masuk (FIFO)* terhadap pagu anggaran yang ditentukan pengguna.
- **Uji Ketahanan Biaya (*Cost Robustness Test*):** Pengujian simulasi Monte Carlo 100 percobaan dengan variasi fluktuasi biaya acak independen $\pm 30\%$ per titik guna mengukur stabilitas paket rekomendasi dan risiko pembengkakan biaya (*cost overrun*).
- **Tabel Asumsi Biaya yang Dapat Disesuaikan:** Pengguna dapat mengubah estimasi biaya perbaikan per kategori dan tingkat keparahan selama sesi analisis untuk menyesuaikan kondisi harga setempat.
- **Bobot Interaktif dan Analisis Sensitivitas:** Slider penyesuaian bobot proporsional (total selalu 100%) dilengkapi kalkulasi kestabilan peringkat berbasis Korelasi Peringkat Spearman dan tumpang tindih 10 besar (*Top-10 Overlap*).
- **Skenario Demo Interaktif:** Simulasi dinamis pembuktian validasi warga, mendemonstrasikan kenaikan skor urgensi titik dari 63 (Tinggi) menjadi 81 (Kritis) saat jumlah pelapor bertambah.
- **Penyimpanan Data per Pengunjung:** Setiap pengunjung browser memiliki ruang data independen menggunakan pengenal UUID v4 di `localStorage` tanpa keharusan login atau pembuatan akun.
- **Mode Lokal Otomatis:** Apabila koneksi server atau basis data *cloud* tidak terjangkau, aplikasi otomatis beralih ke Mode Lokal (*in-memory*) sehingga seluruh fungsi analisis dan simulasi tetap berjalan lancar tanpa kendala.

---

## 3. Panduan Coba Cepat untuk Juri

Untuk menguji seluruh kemampuan utama sistem dalam waktu singkat, ikuti 6 langkah terstruktur berikut:

1. **Buka Aplikasi:**
   Kunjungi tautan produksi [https://infratriage.vercel.app](https://infratriage.vercel.app) pada peramban web.
2. **Periksa Transparansi Skor:**
   Buka tab **Peringkat** pada panel kanan. Klik kartu laporan teratas untuk menyorot lokasinya di peta. Selanjutnya, klik tab **Detail** untuk melihat indikator lingkaran skor urgensi, estimasi biaya, dan rincian 5 lencana poin kontribusi kriteria.
3. **Simulasikan Alokasi Anggaran:**
   Buka tab **Anggaran**. Tentukan nominal pagu (misalnya gunakan preset **100 Jt**), lalu klik tombol **"Simulasikan 4 Strategi Rekomendasi"**. Amati perbandingan 4 kartu strategi: perhatikan bagaimana strategi *Dynamic Programming (DP)* memberikan cakupan skor tertinggi dibandingkan metode konvensional *Urutan Masuk (FIFO)*.
4. **Jalankan Uji Ketahanan Biaya:**
   Pada bagian bawah tab Anggaran, temukan kartu **Uji Ketahanan Biaya**. Klik tombol **"Jalankan Uji Ketahanan Biaya"**. Sistem akan memproses 100 percobaan fluktuasi biaya ($\pm 30\%$) secara bertahap dan menampilkan metrik tumpang tindih Jaccard, titik inti stabil ($\ge 90\%$), proyeksi kelebihan biaya rencana dasar persentil 90 (P90), serta kalimat evaluasi risiko otomatis.
5. **Ubah Asumsi Biaya Perbaikan:**
   Masih di tab Anggaran, klik tombol akordeon **"Atur asumsi biaya"**. Ubah salah satu nilai biaya (misalnya ubah *Jalan berlubang - Sedang* dari `Rp 7.500.000` menjadi `Rp 10.000.000`). Perhatikan kemunculan lencana *"Asumsi biaya diubah"*, lalu klik kembali tombol **"Simulasikan 4 Strategi Rekomendasi"** untuk mengamati pergeseran paket titik yang dipilih algoritma. Klik tombol *"Kembalikan ke bawaan"* untuk mereset.
6. **Jalankan Skenario Demo:**
   Perhatikan panel **Skenario demo** mengambang di atas peta (sudut kanan bawah area peta). Klik tombol **"Mulai"**; sistem akan menempatkan laporan kerusakan lubang jalan baru berstatus Tinggi (skor 63, pin oranye) di dekat fasilitas vital nyata. Selanjutnya, klik tombol **"Bertahap"**; saksikan penambahan laporan warga secara otomatis dari 1 hingga 10 pelapor, di mana skor urgensi bergerak naik secara *real-time* hingga menembus angka **81 (Kritis)** dan warna pin seketika berubah menjadi merah.

---

## 4. Cara Menjalankan Secara Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) versi 18.x atau yang lebih baru (disarankan Node.js LTS).
- Pengelola paket `npm`.

### Langkah Instalasi

1. **Kloning Repositori:**
   ```bash
   git clone <URL_REPOSITORI>
   cd infratriage
   ```

2. **Instal Dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Lingkungan (Opsional untuk Supabase):**
   Secara *default*, sistem dapat langsung dijalankan tanpa konfigurasi tambahan dalam **Mode Lokal**. Apabila ingin mengaktifkan persistensi *cloud* dan fitur unggah foto bukti ke Supabase, buat berkas `.env.local` di direktori utama:
   ```env
   SUPABASE_URL=https://<project-id>.supabase.co
   SUPABASE_SECRET_KEY=<service_role_secret_key>
   ```
   *Catatan: Pastikan skrip SQL pada `supabase/schema.sql` telah dieksekusi di Dashboard SQL Supabase dan bucket privat bernama `report-photos` telah dibuat.*

4. **Jalankan Server Pengembangan:**
   ```bash
   npm run dev
   ```
   Buka peramban pada alamat `http://localhost:3000`.

5. **Jalankan Rangkaian Pengujian:**
   ```bash
   npm test
   ```

6. **Kompilasi Produksi:**
   ```bash
   npm run build
   ```

> **Mode Lokal:** Apabila variabel lingkungan `SUPABASE_URL` dan `SUPABASE_SECRET_KEY` tidak dikonfigurasi, atau jika server basis data tidak dapat dijangkau, TEPAT otomatis beralih ke Mode Lokal (*in-memory state*). Seluruh fitur analitis, penambahan laporan, pengelompokan, pembobotan, dan simulasi anggaran tetap berfungsi penuh.

---

## 5. Arsitektur Sistem

Aplikasi dibangun menggunakan arsitektur modern berbasis komponen pada ekosistem Next.js App Router, memadukan reaktivitas klien untuk kalkulasi geospasial cepat dengan penanganan sisi server untuk persistensi data yang aman.

```
[ Antarmuka Peramban (Browser Client) ]
  ├── React 19 State (React Context & useReducer)
  ├── Mesin Keputusan Geospasial (lib/infratriage)
  ├── Peta Visual (react-leaflet & Leaflet)
  └── Pengenal Pengunjung: localStorage ('infratriage_visitor_id')
         │
         │ (Permintaan HTTP Fetch dengan Header 'x-visitor-id')
         ▼
[ Server Next.js Route Handlers ]
  ├── GET / POST / DELETE  /api/reports        (Validasi skema, kuota, & persistensi baris)
  └── GET / POST           /api/reports/photo  (Upload foto 2MB & pembuatan Signed URL 10 mnt)
         │
         │ (Koneksi Server-to-Server via SUPABASE_SECRET_KEY)
         ▼
[ Infrastruktur Supabase ]
  ├── PostgreSQL Database (Tabel 'public.reports' terisolasi per visitor_id)
  └── Private Storage Bucket ('report-photos')
```

### Struktur Folder Utama
```
infratriage/
├── app/                        # Next.js App Router
│   ├── api/reports/            # Route Handler: CRUD data laporan
│   │   └── photo/              # Route Handler: Unggah & signed URL foto
│   ├── globals.css             # Desain token warna dan gaya global
│   ├── layout.tsx              # Tata letak dasar aplikasi
│   └── page.tsx                # Halaman utama aplikasi
├── components/                 # Komponen antarmuka (UI)
│   ├── map/                    # Komponen peta Leaflet, overlay, & demo controls
│   ├── panel/                  # Tab Peringkat, Detail, Anggaran, & Bobot
│   ├── AddReportForm.tsx       # Formulir input laporan dan kompresi foto
│   ├── CommandCenter.tsx       # Tata letak ruang kerja utama (Split-screen)
│   └── TopNav.tsx              # Header sistem dan navigasi tab
├── data/                       # Data spasial fasilitas vital Yogyakarta (OSM)
├── lib/
│   ├── infratriage/            # MESIN KEPUTUSAN UTAMA (Murni fungsional, teruji)
│   │   ├── cluster.ts          # Algoritma pengelompokan spasial per radius
│   │   ├── config.ts           # Asumsi bobot, ambang batas, dan tabel biaya
│   │   ├── costRobustness.ts   # Simulasi ketahanan biaya Monte Carlo (Mulberry32)
│   │   ├── engine.ts           # Pipeline integrasi triase end-to-end
│   │   ├── knapsack.ts         # Algoritma Knapsack DP, Greedy, TopScore, FIFO
│   │   ├── scoring.ts          # Perhitungan skor 5 kriteria & lencana penjelasan
│   │   ├── seed.ts             # Pembangkit data simulasi sintetis
│   │   └── sensitivity.ts      # Analisis sensitivitas peringkat (Spearman & Top-k)
│   ├── demo.ts                 # Logika skenario demo deterministik
│   ├── persistence.ts          # Klien sinkronisasi data & deteksi Mode Lokal
│   ├── photos.ts               # Utilitas kompresi foto di sisi klien
│   ├── reducer.ts              # Pengelola status global (App Reducer)
│   └── store.tsx               # Penyedia AppContext
├── supabase/
│   └── schema.sql              # Skema tabel database dan konfigurasi RLS
└── tests/                      # 18 berkas pengujian otomatis (Vitest)
```

---

## 6. Mesin Skor dan Klasterisasi

### Pengelompokan Spasial (*Clustering*)
Laporan kerusakan yang masuk dikelompokkan ke dalam satu klaster jika berada dalam radius toleransi kategori yang sama. Koordinat klaster diperbarui secara dinamis menggunakan titik pusat rata-rata (*centroid*) dari seluruh laporan di dalamnya:
- **Jalan berlubang (`lubang`):** 20 meter
- **Drainase tersumbat (`drainase`):** 35 meter
- **Lampu jalan mati (`lampu_jalan`):** 15 meter
- **Trotoar rusak (`trotoar`):** 25 meter

### Komponen Skor Urgensi Multi-Kriteria
Skor urgensi klaster bernilai antara 0 hingga 100, dihitung menggunakan pembobotan linier terdistribusi dari 5 komponen:

$$\text{Urgensi} = \sum_{i=1}^{5} (w_i \times c_i)$$

| Komponen Kriteria | Bobot Bawaan | Rentang Nilai | Formula dan Penjelasan Perhitungan |
|---|:---:|:---:|---|
| **Tingkat Kerusakan (`bahaya`)** | **0,3 (30%)** | 0 – 100 | Nilai dasar kategori $\times$ keparahan fisik.<br>• *Lubang:* Ringan = 45, Sedang = 70, Berat = 90<br>• *Drainase:* Ringan = 30, Sedang = 50, Berat = 65<br>• *Lampu Jalan:* Ringan = 20, Sedang = 35, Berat = 55<br>• *Trotoar:* Ringan = 10, Sedang = 20, Berat = 30<br>Ditambah **Penalti Insiden (+15)** jika ada kecelakaan (maksimal 100). |
| **Klasifikasi Jalan (`kelas`)** | **0,2 (20%)** | 40 – 100 | Volume dan hirarki fungsi ruas jalan:<br>• Jalan Arteri: 100 poin<br>• Jalan Kolektor: 70 poin<br>• Jalan Lokal: 40 poin |
| **Fasilitas Vital (`vital`)** | **0,2 (20%)** | 30 – 100 | Jarak Euclidean ke fasilitas vital terdekat (rumah sakit, sekolah, pasar):<br>• Jarak $< 200\text{ m}$: 100 poin<br>• Jarak $200 - 500\text{ m}$: 75 poin<br>• Jarak $> 500\text{ m}$ (atau tidak ada data): 30 poin |
| **Dukungan Kerumunan (`kerumunan`)** | **0,2 (20%)** | 0 – 100 | Jumlah pelapor independen unik ($n$) di dalam klaster:<br>• Dihitung $n \times 10\text{ poin}$ (maksimal 100 poin pada $\ge 10$ pelapor). |
| **Usia Laporan (`usia`)** | **0,1 (10%)** | 0 – 100 | Durasi masalah belum tertangani sejak laporan pertama masuk:<br>• Dihitung $(\text{Hari} / 30) \times 100\text{ poin}$ (mencapai 100 poin penuh pada $\ge 30$ hari). |

### Ambang Batas Tingkat Prioritas
Tingkat prioritas ditentukan dari skor akhir yang dibulatkan:
- **Kritis (`kritis`):** Skor $\ge 80$ (Penanda Pin Merah)
- **Tinggi (`tinggi`):** Skor $50 - 79$ (Penanda Pin Oranye)
- **Sedang (`sedang`):** Skor $< 50$ (Penanda Pin Kuning)

---

## 7. Simulasi Anggaran dan Uji Ketahanan Biaya

### 4 Strategi Rekomendasi
Aplikasi menyediakan simulator alokasi anggaran dengan 4 pendekatan strategi matematis yang dapat dipilih langsung melalui antarmuka:

| Nama Strategi di UI | Tag Penjelas | Algoritma dan Sasaran Optimasi |
|---|---|---|
| **Dynamic Programming (DP)** | *Rekomendasi Optimal* | Memaksimalkan total skor urgensi menggunakan algoritma Knapsack 0/1 dengan diskritisasi satuan biaya Rp 100.000. Memberikan kombinasi perbaikan paling bernilai tanpa pernah melampaui pagu anggaran. |
| **Greedy Skor per Biaya** | *Efisiensi Biaya* | Mengurutkan kandidat berdasarkan rasio efisiensi tertinggi ($\frac{\text{Skor}}{\text{Biaya}}$) dan mengambil kandidat selama anggaran masih mencukupi. Cepat dan mendekati optimal. |
| **Skor Tertinggi Dulu** | *Prioritas Terparah* | Mendahulukan titik dengan nilai skor urgensi mutlak tertinggi tanpa memperhitungkan efisiensi biaya. Sering kali menghabiskan anggaran pada sedikit titik berat. |
| **Urutan Masuk (FIFO)** | *Baseline Tradisional* | Memilih laporan yang paling lama masuk terlebih dahulu (simulasi alokasi antrean birokrasi manual konvensional tanpa optimasi). |

Setiap kartu strategi menyajikan 4 metrik perbandingan:
1. **Titik:** Jumlah titik kerusakan yang berhasil didanai.
2. **Biaya:** Total nominal anggaran terpakai beserta persentase serapannya terhadap pagu.
3. **Cakupan Skor:** Persentase total skor titik terpilih terhadap total skor seluruh kandidat yang menunggu perbaikan.
4. **Kritis:** Rasio titik berstatus Kritis yang tertangani terhadap total seluruh titik kritis ($X/Y$).

### Tabel Asumsi Biaya Perbaikan
Biaya perbaikan tiap klaster dihitung berdasarkan kategori dan tingkat keparahannya.

> **PENTING — ASUMSI ILUSTRATIF:** Angka biaya berikut merupakan nilai asumsi awal untuk keperluan simulasi sistem, bukan standar satuan harga resmi pemerintah daerah.

| Kategori Masalah | Ringan (Tingkat 1) | Sedang (Tingkat 2) | Berat (Tingkat 3) |
|---|:---:|:---:|:---:|
| Jalan berlubang | Rp 3.000.000 | Rp 7.500.000 | Rp 15.000.000 |
| Drainase tersumbat | Rp 4.000.000 | Rp 9.000.000 | Rp 20.000.000 |
| Lampu jalan mati | Rp 3.000.000 | Rp 4.500.000 | Rp 7.000.000 |
| Trotoar rusak | Rp 5.000.000 | Rp 12.000.000 | Rp 25.000.000 |

*Catatan: Pengguna dapat mengedit seluruh nilai biaya ini melalui menu collapsible **"Atur asumsi biaya"** di antarmuka tab Anggaran (rentang validasi input Rp 100.000 s.d. Rp 1.000.000.000). Perubahan bersifat sementara selama sesi berlangsung dan tidak mengubah data baku basis data.*

### Uji Ketahanan Biaya (*Cost Robustness Test*)
Biaya pelaksanaan fisik di lapangan sering kali meleset dari estimasi perencana akibat kondisi tanah, cuaca, atau kenaikan material. Fitur ini melakukan simulasi Monte Carlo untuk menguji ketahanan rekomendasi DP:
- **Metodologi:** 100 kali percobaan simulasi, di mana biaya setiap titik diganggu secara acak independen dengan faktor pengali antara **0,7 hingga 1,3** ($\pm 30\%$).
- **PRNG Deterministik:** Menggunakan generator bilangan acak berbenih tetap (Mulberry32, `seed = 42`) sehingga hasil pengujian 100% konsisten dan dapat direproduksi oleh juri kapan saja.
- **Hasil yang Dilaporkan:**
  - *Tumpang Tindih Titik (Jaccard Index):* Rata-rata dan nilai terendah kemiripan titik terpilih dalam simulasi terhadap hasil rencana dasar.
  - *Titik Inti:* Jumlah titik yang selalu terpilih pada $\ge 90\%$ percobaan (titik yang sangat kokoh untuk diprioritaskan).
  - *Kelebihan Biaya Rencana Dasar (*Cost Overrun*):* Persentase potensi pembengkakan biaya jika paket pekerjaan dasar tetap dipaksakan berjalan saat harga aktual naik (dilaporkan dalam rata-rata, maksimum, dan persentil 90/P90).
  - *Percobaan Melebihi Pagu:* Persentase skenario di mana total biaya melebihi anggaran yang tersedia.
  - *Saran Kontingensi Otomatis:* Kalimat evaluasi yang merekomendasikan besaran cadangan kontingensi yang perlu dialokasikan untuk memitigasi risiko lonjakan biaya.

---

## 8. Analisis Sensitivitas Bobot

Untuk menguji apakah urutan prioritas rentan terhadap manipulasi atau perbedaan preferensi pemangku kepentingan, TEPAT menyertakan fitur analisis sensitivitas pada tab **Bobot**:
- **Simulasi Pergeseran:** Menguji dampak pergeseran relatif $\pm 20\%$ (`delta = 0.2`) pada masing-masing dari 5 kriteria secara independen (lalu menormalkan kembali total bobot ke 100%).
- **Evaluasi Kestabilan:**
  - **Korelasi Peringkat Spearman (*Spearman's Rank Correlation*):** Mengukur korelasi monotonik antara daftar peringkat dasar dan daftar peringkat setelah bobot diubah (skala $-1$ hingga $+1$).
  - **Tumpang Tindih 10 Besar (*Top-10 Overlap*):** Menghitung persentase klaster 10 besar yang tetap bertahan di 10 besar saat bobot digeser.
  - **Kriteria Paling Sensitif:** Mengidentifikasi secara eksplisit kriteria mana yang paling berpengaruh dalam mengubah susunan 10 besar klaster prioritas.

---

## 9. Pengujian Otomatis

Rangkaian pengujian otomatis dijalankan menggunakan Vitest untuk memastikan keandalan mesin keputusan, integritas algoritma, dan validitas alur data.

**Hasil Verifikasi Saat Ini:**
```
Test Files  18 passed (18)
     Tests  201 passed (201)
```

### Cakupan Pengujian (18 Berkas Tes)
1. `tests/reducer.test.ts` (7 tes): Pengujian alur *state management*, transisi status klaster, dan penanganan aksi aplikasi.
2. `tests/knapsack.test.ts` (12 tes): Verifikasi matematis algoritma Knapsack DP 0/1, batas anggaran, diskritisasi biaya, dan perbandingan strategi Greedy, TopScore, serta FIFO.
3. `tests/photos.test.ts` (25 tes): Pengujian kompresi gambar klien, validasi tipe MIME (JPEG/WebP), pembuatan signed URL, dan pengelolaan status unggahan.
4. `tests/vitals.test.ts` (5 tes): Validasi parsing data fasilitas vital OpenStreetMap, pemetaan kategori, dan verifikasi rentang koordinat geografis.
5. `tests/hydrateReports.test.ts` (3 tes): Pengujian hidrasi laporan dari basis data Supabase ke memori browser dan penggabungan dengan data awal.
6. `tests/reportDraft.test.ts` (16 tes): Validasi pembentukan draf laporan antarmuka, penomoran otomatis pelapor, dan inferensi kelas jalan.
7. `tests/engine.test.ts` (12 tes): Integrasi mesin triase *end-to-end* (penerimaan laporan, klasterisasi spasial, penilaian skor, dan pemeringkatan).
8. `tests/weights.test.ts` (9 tes): Validasi normalisasi bobot proporsional (total selalu 1,0) dan pencegahan nilai negatif atau non-numerik.
9. `tests/scoring.test.ts` (17 tes): Pengujian akurasi perhitungan 5 komponen skor urgensi, penalti insiden, dan konsistensi pembulatan poin lencana penjelasan.
10. `tests/cluster.test.ts` (12 tes): Pengujian radius penggabungan spasial per kategori, pembaruan koordinat centroid klaster, dan pencegahan duplikasi.
11. `tests/persistence.test.ts` (7 tes): Pengujian siklus simpan-ambil laporan, mekanisme UUID pengunjung pada `localStorage`, batas waktu *timeout*, dan pengalihan ke Mode Lokal.
12. `tests/markerStyle.test.ts` (14 tes): Validasi token warna penanda peta (Kritis, Tinggi, Sedang), radius dinamis berbasis jumlah pelapor, dan ikon visual.
13. `tests/format.test.ts` (20 tes): Pengujian fungsi format mata uang Rupiah, parsing input angka, konversi jarak meter/kilometer, dan format tanggal lokal.
14. `tests/reportValidation.test.ts` (7 tes): Validasi payload API server, verifikasi struktur JSON, batas ukuran body, dan format UUID v4.
15. `tests/costRobustness.test.ts` (12 tes): Verifikasi simulasi ketahanan biaya Monte Carlo (Mulberry32), akurasi indeks Jaccard, persentil 90 *cost overrun*, dan eksekusi bertahap (*chunked execution*).
16. `tests/demo.test.ts` (7 tes): Pengujian determinisme skenario demo, pemilihan titik jangkar fasilitas vital riil, dan kenaikan skor dari 63 ke 81.
17. `tests/flow.test.ts` (7 tes): Integrasi alur lengkap pengguna mulai dari penambahan laporan, pengelompokan otomatis, simulasi anggaran, hingga eksekusi penjadwalan.
18. `tests/costTable.test.ts` (9 tes): Validasi batas biaya kustom (Rp 100.000 s.d. Rp 1.000.000.000), kloning tabel sesi, kalkulasi biaya dinamis, dan fungsi reset ke nilai awal.

---

## 10. Keterbatasan dan Asumsi

Sebagai bentuk kejujuran akademis dan teknis dalam evaluasi sistem pendukung keputusan:

1. **Data Laporan dan Nilai Biaya adalah Simulasi:** Seluruh data kerusakan infrastruktur dan nominal biaya perbaikan merupakan data sintetis yang dibangkitkan untuk demonstrasi, bukan data riil pemerintah daerah.
2. **Bobot, Radius Klaster, dan Ambang Prioritas adalah Asumsi:** Nilai bobot kriteria, radius penggabungan spasial (15–35 m), dan batas skor kritis ($\ge 80$) merupakan asumsi perancangan awal yang perlu dikalibrasi lebih lanjut bersama dinas teknis terkait (misalnya Dinas Pekerjaan Umum).
3. **Biaya Bukan Harga Satuan Resmi:** Tabel estimasi biaya perbaikan adalah nilai pendekatan tetap per kategori/keparahan, bukan hasil survei lapangan mendalam atau Harga Satuan Pokok Kegiatan (HSPK) resmi.
4. **Agregasi Tingkat Bahaya Memakai Nilai Maksimum:** Tingkat keparahan klaster dihitung menggunakan nilai maksimum dari seluruh laporan di dalamnya (`Math.max`). Hal ini berarti satu laporan berstatus "berat" dapat mengangkat derajat bahaya klaster secara keseluruhan, yang berpotensi menimbulkan bias jika ada pelapor yang melebih-lebihkan kondisi.
5. **Karakteristik Optimasi Knapsack (DP):** Algoritma *Dynamic Programming* berfokus memaksimalkan total skor urgensi gabungan. Dalam kondisi anggaran terbatas, algoritma dapat lebih memilih mendanai beberapa titik bernilai sedang berbiaya murah daripada satu titik kritis yang berbiaya sangat mahal. Oleh karena itu, indikator pemantauan titik kritis ($X/Y$) selalu ditampilkan pada kartu strategi sebagai bahan pertimbangan manusia (*human-in-the-loop*).
6. **Foto Bukti Belum Memengaruhi Skor:** Foto yang diunggah pelapor saat ini hanya berfungsi sebagai dokumen bukti visual bagi verifikator dan belum dianalisis otomatis dengan kecerdasan buatan (*Computer Vision*) untuk memengaruhi skor urgensi.
7. **Tanggal Referensi Simulasi Tetap (5 November 2026):** Untuk menjamin hasil pengujian dan demonstrasi yang deterministik bagi juri di mana pun dan kapan pun, sistem menggunakan tanggal acuan simulasi tetap yaitu `5 November 2026` (`2026-11-05T00:00:00.000Z`). Laporan baru yang dibuat selama sesi pengujian akan bertanggal hari simulasi tersebut sehingga komponen usia laporan bernilai 0 hari secara konsisten.
8. **Batas Kuota Pengunjung:** Untuk melindungi infrastruktur *cloud*, setiap pengunjung dibatasi maksimal menyimpan 100 laporan dan mengunggah 10 foto bukti.

---

## 11. Rencana Pengembangan (Roadmap)

Untuk pengembangan menuju sistem operasional skala penuh di masa mendatang:

- [ ] **Kendala Wajib Titik Kritis (*Hard Constraint Budgeting*):** Menambahkan opsi pada algoritma alokasi anggaran agar seluruh titik berstatus Kritis wajib didanai terlebih dahulu sebelum sisa anggaran dialokasikan untuk optimasi titik lainnya.
- [ ] **Modul Verifikasi Lapangan (*Field Inspector Workflow*):** Alur kerja validasi fisik di lapangan oleh petugas dinas sebelum status klaster dinaikkan dari *Menunggu* menjadi *Terjadwal*.
- [ ] **Validasi Foto Otomatis Berbasis AI:** Pemanfaatan model *Computer Vision* untuk mendeteksi jenis kerusakan fisik dan mengonfirmasi tingkat keparahan jalan dari foto secara otomatis.
- [ ] **Manajemen Akses Berbasis Peran (*Role-Based Access Control / RBAC*):** Pemisahan hak akses antara Pelapor Warga, Petugas Lapangan, Analis Perencana Anggaran, dan Kepala Dinas.
- [ ] **Kalibrasi Biaya Terintegrasi HSPK/SSH Daerah:** Integrasi modul biaya dengan Standar Satuan Harga (SSH) dan Standar Biaya Masukan (SBM) resmi pemerintah kota/kabupaten.
- [ ] **Integrasi Kanal Pengaduan Nasional:** Penyediaan antarmuka API dua arah untuk menerima tiket aduan dari platform nasional seperti SP4N-LAPOR!.

---

## 12. Atribusi Data dan Lisensi

### Atribusi Sumber Data
- **Data Fasilitas Vital:** Data sebaran fasilitas umum (rumah sakit/fasilitas kesehatan, sekolah/pendidikan, dan pasar) di Kota Yogyakarta diekstraksi dari **OpenStreetMap** melalui Overpass API. Data ini tersedia di bawah lisensi *Open Database License* (ODbL).
  - *Atribusi:* **&copy; OpenStreetMap contributors**.
- **Peta Dasar (*Map Tiles*):** Menggunakan ubin peta dari OpenStreetMap dan CartoDB.

### Lisensi
Proyek perangkat lunak ini dirancang dan dikembangkan sebagai prototipe sistem pendukung keputusan untuk kompetisi pemrograman. Kode sumber dilisensikan di bawah **MIT License**.
