# TASKS — TEPAT (Triase Evaluasi Perbaikan dan Anggaran Terukur)

Kerjakan **berurutan**, satu task per sesi. Baca dulu `docs/PRD.md`, `docs/DESIGN.md`, dan `AGENTS.md`. Semua tampilan (T3-T6, T8-T11) mengikuti `docs/DESIGN.md`.

**Aturan untuk semua task**
- Jangan mengubah logika di `lib/infratriage/`. Bila menemukan bug, laporkan, jangan ubah rumus diam-diam.
- Tanpa login, database, ORM, backend terpisah, atau API eksternal.
- Tiap task selesai bila `npm test` dan `npx tsc --noEmit` lulus; task yang menyentuh UI juga harus lulus `npm run build`.
- Commit kecil per task: `git add -A && git commit -m "T<n>: ..."`.
- Sebelum menyentuh `components/MapDashboard.tsx`, baca isinya; pertahankan pola `next/dynamic` dengan `ssr:false` dari `app/page.tsx`.

Peta fase: **Fase 1** = T1-T4, **Fase 2** = T5-T7, **Fase 3** = T8-T10, **Fase 4** = T11-T12.

---

## T0 — Pemeriksaan awal (tanpa mengubah kode)
- Baca `app/page.tsx`, `components/MapDashboard.tsx`, `lib/infratriage/index.ts`, `types.ts`, `engine.ts`, dan bentuk `data/fasilitas-vital-yogya.json`.
- Jalankan `npm test` (harus 53 lulus) dan `npm run build`.
- **Selesai bila:** ringkasan satu paragraf struktur yang ada dan konfirmasi build + test lulus.

## T1 — Adapter data & helper murni (Fase 1)
Berkas baru:
- `lib/vitals.ts`: baca JSON, petakan `hospital→rumah_sakit`, `school→sekolah`, `marketplace→pasar`, buang entri tanpa `lat/lng` valid, ekspor `VitalPoint[]`.
- `lib/weights.ts`: `setWeight(weights, key, value)` yang menskalakan 4 bobot lain secara proporsional sehingga jumlah = 1 (nilai dibatasi 0..1; bila sisa semua nol, bagi rata); `DEFAULT_WEIGHTS` tetap dari mesin.
- `lib/format.ts`: `formatRupiah(n)`, `formatRupiahInput(str)` / `parseRupiah(str)`, `formatDistance(m)`.
- Tes di `tests/vitals.test.ts`, `tests/weights.test.ts`, `tests/format.test.ts`.
- **Selesai bila:** jumlah bobot selalu 1 setelah geser acak (tes 100 kasus); semua entri vital punya tipe valid; tes lulus.

## T2 — State aplikasi (Fase 1)
- `lib/reducer.ts` (fungsi murni, mudah dites) + `lib/store.tsx` (Context + `useReducer`, hook `useApp()`).
- State: `reports, clusters, weights, now, selectedClusterId, filters{categories, levels}, showVitals, budget, activeStrategy, addMode, toast, demo`.
- Aksi: `INIT_SEED, INGEST, SET_STATUS, SET_WEIGHT, RESET_WEIGHTS, SELECT, SET_FILTERS, TOGGLE_VITALS, SET_BUDGET, SET_STRATEGY, SCHEDULE_PLAN, SET_ADD_MODE, DEMO_START, DEMO_ADD_REPORTER, RESET`.
- Seed dibuat hanya di sisi klien (efek setelah mount) agar tidak terjadi hydration mismatch; `now` disimpan di state.
- Tes `tests/reducer.test.ts`: INGEST menggabung/membuat klaster, id sama diabaikan, SCHEDULE_PLAN mengubah status, RESET mengembalikan seed.
- **Selesai bila:** tes reducer lulus; `AppProvider` membungkus halaman di `app/page.tsx`.

## T3 — Peta Command Center (Fase 1)
Perluas `MapDashboard.tsx` (pecah ke `components/map/*` bila perlu):
- `CircleMarker` per klaster aktif (warna menurut level, radius menurut pelapor unik dengan batas min/maks, `resolved` pudar, `scheduled` garis tepi khusus).
- Layer 294 fasilitas vital dengan toggle (default mati), warna per jenis; pakai marker kecil.
- Klik marker memanggil `SELECT`; klaster terpilih diberi ring; `flyTo` saat dipilih dari daftar.
- Legenda warna dan kontrol filter kategori/level.
- Atribusi tile tampil (dari Leaflet) dan "© OpenStreetMap contributors".
- **Selesai bila:** peta menampilkan klaster seed berwarna, toggle vital berfungsi, tidak ada error konsol, build lulus.

## T4 — Kerangka layout & Peringkat (Fase 1)
- `components/CommandCenter.tsx`: header (nama produk "TEPAT" + subjudul "Prioritas perbaikan infrastruktur · Yogyakarta", KPI total laporan/klaster aktif/kritis, badge "Data simulasi"), area peta, panel kanan dengan tab **Peringkat | Detail | Anggaran | Bobot**, footer atribusi + catatan asumsi.
- `components/panel/RankingTab.tsx`: `rankClusters` dengan filter aktif; item menampilkan skor, level, kategori, pelapor; klik item = `SELECT`.
- **Selesai bila:** filter memengaruhi peta dan daftar sama persis; memilih di salah satu menyorot yang lain.

## T5 — Detail skor klaster (Fase 2)
- `components/panel/InspectorTab.tsx`: skor besar + badge level; 5 lencana `explain()` dengan bar (jumlah poin = skor); fasilitas vital terdekat + jarak; pelapor unik, usia, estimasi biaya, daftar laporan; kontrol status `pending/scheduled/resolved`.
- Keadaan kosong: "Pilih titik di peta atau daftar."
- **Selesai bila:** tes komponen/logika (bila ada) lulus dan jumlah poin lencana ditampilkan sama dengan skor yang dibulatkan.

## T6 — Tambah laporan & penggabungan otomatis (Fase 2)
- `components/AddReportForm.tsx` + mode "Tambah laporan": klik peta menaruh titik sementara; form (kategori, keparahan 1-3, kelas jalan, insiden, ID pelapor); submit memanggil `ingestReport`.
- Id laporan baru unik (mis. `ui-<counter>`); `createdAt = now`.
- Toast: hasil `action` + skor sebelum menjadi sesudah.
- **Selesai bila:** laporan ~10 m dari klaster lubang menggabung dan skor naik; ~100 m membuat klaster baru; kirim ganda tidak mengubah apa pun.

## T7 — Tes integrasi alur laporan (Fase 2)
- `tests/flow.test.ts` memakai reducer + mesin: seed, INGEST, SCHEDULE; memastikan konsistensi KPI (jumlah klaster aktif, jumlah kritis).
- **Selesai bila:** tes lulus dan `npm test` total lulus.

## T8 — Simulator anggaran (Fase 3)
- `components/panel/BudgetTab.tsx`: input Rupiah (default 100.000.000, format ribuan, validasi), tombol "Rekomendasikan" → `buildBudgetPlan`.
- Tabel 4 strategi (titik, biaya terpakai %, cakupan skor %, kritis X dari Y); DP berlabel "Rekomendasi optimal"; pemilih strategi tampilan.
- Sorot titik terpilih di peta (ring tebal) dan di daftar.
- Tombol "Jadwalkan semua rekomendasi" → `SCHEDULE_PLAN`; tampilkan sisa anggaran.
- Catatan permanen: "Biaya = estimasi ilustrasi; cakupan skor = indeks internal, bukan penurunan risiko nyata."
- Keadaan kosong: tidak ada kandidat; anggaran terlalu kecil.
- **Selesai bila:** biaya tidak pernah melebihi anggaran pada berbagai nilai (0, 1 juta, 100 juta, 1 miliar) dan titik tersorot di peta.

## T9 — Bobot & sensitivitas (Fase 3)
- `components/panel/WeightsTab.tsx`: 5 slider memakai `setWeight`, tombol reset, tampilan persen; peringkat, warna, dan rekomendasi anggaran ikut terhitung ulang.
- Kartu `rankingStability` (delta 20%, k 10): rata-rata irisan top-10, rata-rata Spearman, bobot paling sensitif, dengan kalimat penjelasan awam; label "asumsi".
- Hindari perhitungan berat tiap pergerakan slider: gunakan `useDeferredValue` atau debounce ±150 ms untuk sensitivitas.
- **Selesai bila:** menggeser slider mengubah peringkat tanpa lag terasa; jumlah bobot selalu 100%.

## T10 — Skenario demo (Fase 3)
- `lib/demo.ts`: pilih satu fasilitas vital nyata dari JSON, buat titik demo ±50-80 m darinya yang tidak berada dalam radius klaster lubang yang sudah ada; tersedia fungsi `buildDemoReports(n, now)`.
- Aksi `DEMO_START`: kembalikan bobot default, taruh 1 laporan (lubang, keparahan 2, arteri, tanpa insiden, `createdAt = now`) → skor 63 (tinggi, oranye), pilih dan fokuskan klaster itu.
- Tombol "Tambah pelapor bertahap": menambah pelapor unik tiap ~600 ms sampai 10, animasi angka dan warna 63 menjadi 81 (merah) memakai `ingestReport`.
- "Reset data demo" mengembalikan seed awal.
- `tests/demo.test.ts`: 1 laporan = 63 dan 10 pelapor = 81 dengan data vital nyata dari JSON.
- **Selesai bila:** tes demo lulus dan alur terlihat mulus di layar.

## T11 — Keterangan, atribusi, kerapihan (Fase 4)
- Footer permanen: "© OpenStreetMap contributors", `SEED_DISCLAIMER`, "asumsi", "Prototipe pendukung keputusan, bukan pengganti kanal laporan resmi".
- Responsif: desktop split-screen; mobile peta di atas dan panel menjadi tab di bawah; pastikan peta tidak terpotong dan `invalidateSize` dipanggil saat tata letak berubah.
- Keadaan kosong, memuat, galat; kontras dan fokus keyboard; teks Indonesia konsisten.
- **Selesai bila:** diperiksa di lebar 375, 768, 1280, dan 1920 px tanpa scroll horizontal.

## T12 — README & pemeriksaan akhir
- `README.md`: cara menjalankan, struktur folder, rumus skor, asumsi, keterbatasan, sumber data, tautan deploy.
- Jalankan `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run lint`; deploy ke Vercel dan uji tautan produksi.
- Daftar periksa demo: skenario 63 menjadi 81, anggaran, bobot, tambah laporan, reset.
- **Selesai bila:** semua perintah lulus dan situs produksi menjalankan seluruh alur tanpa galat konsol.

---

## Daftar periksa kejujuran (periksa sebelum submit)
- [ ] `SEED_DISCLAIMER` terlihat di UI dan video.
- [ ] Atribusi OSM terlihat.
- [ ] Angka bobot, ambang, radius, biaya berlabel "asumsi".
- [ ] Tidak ada klaim "terbukti" atau "dipakai pemerintah".