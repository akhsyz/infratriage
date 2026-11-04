# PRD — TEPAT

**TEPAT**: Sistem Pendukung Keputusan Geospasial untuk Prioritas Perbaikan Infrastruktur Mikro.
Kepanjangan: **T**riase **E**valuasi **P**erbaikan dan **A**nggaran **T**erukur. Studi kasus: Kota Yogyakarta.

Sistem pendukung keputusan geospasial untuk memprioritaskan perbaikan infrastruktur mikro (jalan berlubang, drainase, lampu jalan, trotoar) di Kota Yogyakarta. Prototipe untuk ISCOMFEST 2026 (Lomba Programming).

> Catatan nama: nama produk di semua tampilan, dokumen, dan video adalah **TEPAT**. Nama folder dan paket internal `lib/infratriage/` sengaja TIDAK diganti (nama internal; mengganti berarti memperbaiki impor dan tes).

> Status dokumen: dasar kerja untuk pembangunan UI. Mesin keputusan sudah selesai dan dites di `lib/infratriage/` (jangan diubah). Dokumen ini hanya mengatur UI, state, dan integrasinya.

## 1. Latar masalah (persona hipotetis)

Aplikasi pengaduan menampung tiket, tetapi tidak membantu menentukan titik mana yang harus diperbaiki lebih dulu saat anggaran terbatas.

Persona **Staf perencana pemeliharaan jalan** (hipotetis, dibuat untuk PRD ini, bukan hasil wawancara):
- Sekarang: membaca daftar laporan berurutan sesuai waktu masuk dan menilai urgensi dengan perkiraan sendiri.
- Laporan ganda untuk titik yang sama terhitung terpisah, sehingga titik yang ramai dilaporkan sulit terlihat.
- Anggaran bulanan dibagi tanpa simulasi.

## 2. Tujuan dan bukan-tujuan

**Tujuan**
1. Menggabungkan laporan ganda otomatis dan menampilkannya di peta.
2. Memberi skor urgensi 0-100 yang bisa dijelaskan per komponen.
3. Merekomendasikan kombinasi titik perbaikan untuk anggaran tertentu dan membandingkannya dengan cara lain (greedy, skor tertinggi, urutan masuk).
4. Menunjukkan seberapa stabil peringkat bila bobot diubah.
5. Demo 10 menit yang meyakinkan (skenario 63 menjadi 81).

**Bukan-tujuan (jangan dikerjakan)**
Login/registrasi, database, ORM, backend terpisah (Express/Fastify), upload foto, notifikasi, peta offline, multi-user, integrasi API pemerintah, penulisan ulang mesin.

## 3. Prinsip kejujuran (wajib tampil di UI)

- Semua laporan kerusakan adalah **data simulasi**. Tampilkan `SEED_DISCLAIMER` permanen.
- Fasilitas vital berasal dari OpenStreetMap: atribusi "© OpenStreetMap contributors".
- Bobot, ambang, radius klaster, dan tabel biaya adalah **asumsi**, beri label "asumsi".
- Cakupan skor adalah indeks internal, bukan penurunan risiko nyata. Biaya adalah estimasi ilustrasi.
- Dilarang menulis klaim "terbukti", "dipakai pemerintah", atau angka statistik tanpa sumber.

## 4. Kebutuhan fungsional (selaras dengan peta fitur platform)

### Fase 1 — Peta & Peringkat
- **FR-1.1 Peta klaster berwarna.** Satu `CircleMarker` per klaster aktif. Warna menurut `priorityLevel`: kritis merah, tinggi oranye, sedang kuning. Radius marker menurut jumlah pelapor unik (batas min/maks). Klaster `resolved` dipudarkan; `scheduled` diberi garis tepi khusus.
  - *Acceptance:* 150 laporan seed menghasilkan puluhan klaster berwarna; mengubah status klaster mengubah tampilannya tanpa reload.
- **FR-1.2 Daftar peringkat urgensi.** Dari `rankClusters`, menampilkan skor (dibulatkan), level, kategori, jumlah pelapor. Klik item memilih klaster dan memfokuskan peta (flyTo).
- **FR-1.3 Filter kategori & legenda.** Filter 4 kategori dan 3 level; legenda warna. Filter memengaruhi peta dan daftar secara konsisten.
- **FR-1.4 Layer fasilitas vital.** 294 titik OSM bisa di-toggle (default mati), warna beda per jenis (rumah sakit, sekolah, pasar).
- **FR-1.5 Sinkronisasi pilihan.** Memilih di peta, daftar, atau panel detail selalu menyorot objek yang sama.

### Fase 2 — Detail Skor & Tambah/Gabung Laporan
- **FR-2.1 Skor & tingkat urgensi.** Angka besar + badge level.
- **FR-2.2 Rincian kontribusi skor.** 5 lencana dari `explain()` dengan bar; jumlah poin sama dengan skor.
- **FR-2.3 Fasilitas vital terdekat.** Nama, jenis, dan jarak (m).
- **FR-2.4 Info klaster.** Pelapor unik, usia, estimasi biaya (`estimateCost`), daftar laporan, tombol ubah status (pending / scheduled / resolved).
- **FR-2.5 Tambah laporan.** Mode "Tambah laporan": klik peta menandai titik, form berisi kategori, keparahan, kelas jalan, insiden, ID pelapor. Submit memakai `ingestReport`.
- **FR-2.6 Umpan balik penggabungan.** Toast: "Digabung ke klaster ..." atau "Klaster baru dibuat" beserta skor sebelum menjadi sesudah. Kirim ulang id yang sama menghasilkan "diabaikan".

### Fase 3 — Simulator Anggaran, Bobot, Skenario Demo
- **FR-3.1 Input anggaran.** Rupiah, default 100.000.000, format ribuan, validasi angka >= 0.
- **FR-3.2 Empat strategi rekomendasi.** `buildBudgetPlan`: DP (label "Rekomendasi optimal"), greedy, skor tertinggi, FIFO. Tabel: jumlah titik, biaya terpakai (% anggaran), cakupan skor (%), klaster kritis tertangani X dari Y.
  - *Acceptance:* total biaya tidak pernah melebihi anggaran.
- **FR-3.3 Sorotan titik terpilih.** Titik dari strategi aktif diberi ring tebal di peta dan tanda di daftar; pengguna bisa mengganti strategi tampilan.
- **FR-3.4 Jadwalkan rekomendasi.** Mengubah semua titik terpilih menjadi `scheduled` (keluar dari kandidat), lalu menampilkan sisa anggaran.
- **FR-3.5 Atur bobot kriteria.** 5 slider; menggeser satu slider menskalakan sisanya sehingga jumlah tetap 1; tombol reset ke default.
- **FR-3.6 Peringkat berubah seketika.** Peringkat, warna, dan rekomendasi anggaran dihitung ulang real-time saat bobot berubah.
- **FR-3.7 Uji stabilitas peringkat.** Kartu `rankingStability` (rata-rata irisan top-10, rata-rata Spearman, bobot paling sensitif) dengan kalimat penjelasan awam.
- **FR-3.8 Skenario demo.** Tombol "Jalankan skenario demo": menyiapkan satu klaster lubang (keparahan 2, jalan arteri, di dekat fasilitas vital nyata) dengan 1 laporan = skor 63 (oranye). Tombol "Tambah pelapor bertahap" menambah pelapor unik sampai 10 dengan animasi skor 63 menjadi 81 dan pin oranye menjadi merah. "Reset data demo" mengembalikan keadaan awal.
  - *Acceptance:* angka 63 dan 81 muncul dari `ingestReport`, bukan dihitung manual di UI.

### Fase 4 — Keterangan & Kerapihan
- **FR-4.1 Ringkasan angka utama** (header): total laporan, klaster aktif, jumlah kritis.
- **FR-4.2 Label data simulasi** permanen.
- **FR-4.3 Atribusi** peta (tile) dan sumber (OSM), serta catatan asumsi.
- **FR-4.4 Responsif.** Desktop: split-screen. Mobile: peta di atas, panel jadi tab di bawah.
- **FR-4.5 Kondisi kosong, memuat, dan galat** (tidak ada klaster, filter tanpa hasil, anggaran terlalu kecil, peta belum siap).

## 5. Kebutuhan non-fungsional
- Lancar dengan ~150 laporan dan 294 fasilitas; interaksi < 100 ms terasa instan.
- State di memori (React Context + useReducer); inisialisasi data seed hanya di sisi klien untuk menghindari hydration mismatch (data bergantung waktu).
- TypeScript strict, `npm test` (53 tes mesin + tes baru) dan `npm run build` harus lulus.
- Dependency baru seminimal mungkin; tanpa library chart (bar dengan Tailwind).
- Bahasa UI: Indonesia, konsisten.
- Aksesibilitas dasar: kontras cukup, warna level selalu disertai teks, fokus keyboard terlihat.

## 6. Kontrak dengan mesin (`@/lib/infratriage`)

| Kebutuhan UI | Fungsi |
|---|---|
| Seed data demo | `generateSeedReports`, `buildClusters`, `SEED_DISCLAIMER` |
| Skor satu klaster | `computeScore(cluster, ctx)`, `priorityLevel`, `explain` |
| Peringkat | `rankClusters(clusters, ctx)` |
| Laporan masuk | `ingestReport(clusters, report, ctx)` |
| Anggaran | `buildBudgetPlan(clusters, ctx, budget)` |
| Sensitivitas | `rankingStability(clusters, ctx, {delta, k})` |
| Biaya, label | `estimateCost`, `CATEGORY_LABEL`, `SEVERITY_LABEL` |

`ctx = { vitals, weights, now }`. `now` disimpan di state dan diperbarui hanya lewat aksi eksplisit, bukan tiap render.

Catatan skenario demo (63 menjadi 81): skor 63 hanya muncul bila klaster berada < 200 m dari satu fasilitas vital, jalan arteri, keparahan 2, tanpa insiden, usia 0 hari (createdAt = `now`), bobot default. Karena itu lokasi demo dipilih dari fasilitas vital nyata di JSON, dan skenario demo mengembalikan bobot ke default.

## 7. Tata letak (desktop)

```
┌──────────────────────────────────────────────────────────────┐
│ TEPAT · Yogyakarta         [laporan] [klaster] [kritis]  Data simulasi │
├───────────────────────────────────────┬──────────────────────┤
│                                       │ Tab: Peringkat |     │
│              PETA                     │ Detail | Anggaran |  │
│   (marker klaster, layer vital,       │ Bobot                │
│    legenda, filter, +Tambah laporan)  │                      │
│                                       │  (konten tab aktif)  │
├───────────────────────────────────────┴──────────────────────┤
│ © OpenStreetMap contributors · asumsi · prototipe pendukung keputusan │
└──────────────────────────────────────────────────────────────┘
```
Mobile: peta di atas (±45% tinggi layar), panel di bawah berupa tab.

## 8. Keterbatasan yang harus diakui
- Galat GPS ponsel (5-20 m) dapat menggabungkan dua titik berdekatan atau memecah satu titik.
- Bobot dan biaya belum divalidasi dinas; ini prototipe, bukan pengganti kanal laporan resmi.
- Data laporan simulasi; hanya fasilitas vital yang nyata.
- Tile peta butuh internet; siapkan hotspot dan rekaman layar cadangan untuk final offline.

## 9. Skrip presentasi final (10 menit presentasi dan demo)
1. (1 mnt) Masalah: tiket menumpuk, tidak ada prioritas.
2. (2 mnt) Peta: klaster berwarna, filter, layer fasilitas vital.
3. (2 mnt) Skenario demo: 1 pelapor = 63 oranye, 10 pelapor = 81 merah, buka lencana penjelasan.
4. (2 mnt) Anggaran Rp 100 juta: bandingkan 4 strategi, jadwalkan rekomendasi.
5. (1 mnt) Bobot dan sensitivitas: geser slider, tunjukkan stabilitas.
6. (1 mnt) Asumsi dan keterbatasan, lalu pengembangan lanjutan (validasi dengan dinas, data nyata).
7. (1 mnt) Cadangan waktu untuk tanya jawab pembuka.

## 10. Kriteria selesai
Skenario 63 menjadi 81 jalan; laporan baru dekat klaster lama menggabung dan skor naik, yang jauh membuat klaster baru; simulator mengembalikan 4 strategi dengan biaya tak melebihi anggaran dan titik terpilih tersorot di peta; slider bobot mengubah peringkat real-time; disclaimer dan atribusi selalu terlihat; `npm test`, `npm run build`, dan deploy Vercel lulus.