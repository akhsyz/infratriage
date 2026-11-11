# DESIGN — Panduan visual TEPAT (v3: sidebar + kartu terang)

Arah: **bersih, modern, terang**. Sidebar putih, area kerja abu terang, kartu putih dengan garis tipis. Peta tetap menjadi pusat layar (ini alat keputusan, bukan halaman pemasaran). Referensi bentuk: dashboard SaaS terang (sidebar, kartu KPI, grid bento), tetapi **hanya elemen yang berfungsi dan jujur**.

## Aturan jujur UI (wajib)
- Setiap angka di layar berasal dari data atau mesin. Dilarang: tren persen, sparkline, rentang tanggal, nama jalan, avatar, lonceng notifikasi, kolom pencarian, atau menu yang tidak punya halaman.
- Catatan permanen selalu terlihat: "Data simulasi", "asumsi ilustratif", "Prototipe pendukung keputusan, bukan pengganti kanal laporan resmi", dan atribusi peta (OpenStreetMap; CARTO hanya bila tile CARTO yang aktif). Footer hitam dihapus; catatan pindah ke kartu "Tentang data" di bawah sidebar dan atribusi bawaan Leaflet di peta.
- Dekorasi secukupnya dan hanya yang diizinkan di dokumen ini: gradien tipis pada kartu "Tentang data" di sidebar, ilustrasi garis sederhana siluet Yogyakarta (SVG inline, dekoratif, aria-hidden, kontras rendah) di kartu itu, dan overlay peta putih 95% dengan blur ringan. Tanpa glow, tanpa bayangan tebal, tanpa sparkline, dan tanpa dekorasi lain.

## Token (CSS variable di `app/globals.css`, dipetakan ke Tailwind lewat `@theme inline`). Nama token yang sudah ada TIDAK diganti, hanya nilainya.

| Token | Nilai | Pakai untuk |
|---|---|---|
| bg | `#F4F7F9` | latar halaman |
| surface | `#FFFFFF` | kartu, sidebar |
| border | `#E2E8F0` | garis kartu |
| border-input | `#CBD5E1` | garis input/chip |
| ink | `#0F172A` | teks utama |
| ink-2 | `#334155` | teks isi |
| muted | `#5B6B80` | label, keterangan (kontras 5,06:1 di bg) |
| track | `#E2E8F0` | jalur bar/slider |
| tint | `#F8FAFC` | latar kartu ringan |
| tint-2 | `#F1F5F9` | latar segmented/hover |
| accent | `#0B7A6D` | aksi utama, nav aktif, ring terpilih (teks putih di atasnya 5,23:1) |
| accent-hover | `#095F55` | hover tombol/tautan |
| accent-soft | `#E6F4F2` | latar nav aktif, chip aktif, kartu strategi aktif |
| accent-soft-2 | `#D1ECE8` | ujung gradien tipis kartu "Tentang data" |
| accent-ink | `#FFFFFF` | teks di atas accent |
| header-bg / header-ink / header-icon | `#1F2933` / `#FFFFFF` / `#5EEAD4` | HANYA untuk toast (kotak arang) |

**Warna prioritas (fungsional, JANGAN diubah; dipakai untuk marker, badge, dan titik):**

| Level | Marker | Badge bg | Badge teks |
|---|---|---|---|
| Kritis (>= 80) | `#D92D3A` | `#FDE8EA` | `#A4121F` |
| Tinggi (50-79) | `#F28C28` | `#FFEFD9` | `#9A4A00` |
| Sedang (< 50) | `#F4C430` | `#FFF6CC` | `#7A5B00` |

Jangan memakai teks oranye atau kuning langsung di atas putih (kontras hanya 2,9-3,2:1); pakai pasangan badge di atas. Warna fasilitas vital: rumah sakit `#2563EB` (kotak), sekolah `#334155` (lingkaran), pasar `#8B5E34` (belah ketupat). Level selalu disertai teks.

## Bentuk
Radius: kartu 16 px, tombol/input 12 px, chip 10 px, badge 8 px; bulat penuh hanya untuk marker peta dan pil tertentu. Bayangan kartu satu token tipis: `0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(15,23,42,.10)`; selebihnya mengandalkan garis 1 px.

## Tipografi
Plus Jakarta Sans (400/500/600/700). Judul halaman 22 px/700, judul kartu 14-15 px/600, isi 13 px, label sentence-case 12 px/500 `muted` (tanpa huruf kapital berspasi), nilai KPI 28 px/700 `tabular-nums`, skor besar 34 px/700.

## Tata letak
- **Sidebar** (kiri, putih, garis kanan): lebar 232 px di layar >= 1440 px; menciut menjadi 72 px (ikon saja, dengan tooltip) di 1024-1439 px; di bawah 768 px menjadi navigasi bawah. Isi: blok merek (kotak "T" accent, nama "TEPAT", subjudul "Prioritas perbaikan infrastruktur"); **menu = empat tampilan yang nyata**: Peringkat, Detail, Anggaran, Bobot (ikon garis Lucide); item aktif = latar `accent-soft`, teks `accent`, bilah kiri 3 px; di bawah, kartu "Tentang data" (latar gradien tipis `accent-soft` ke `accent-soft-2`, ilustrasi garis siluet Yogyakarta di bagian atas, teks catatan permanen di bawahnya).
- **Area utama**: bilah atas (judul "Prioritas perbaikan infrastruktur", subjudul "Kota Yogyakarta", badge "Data simulasi" bergaris kuning, radius 8); baris 3 kartu KPI ringkas (Laporan masuk, Klaster aktif, Prioritas kritis; ikon garis di kotak `accent-soft`, ikon kritis di `kritis-tint`; tanpa sparkline dan tren); lalu ruang kerja: **kartu peta** (mengisi sisa tinggi layar, minimal 420 px) dan **kartu panel** di kanan (lebar clamp(380px, 26vw, 460px), isi menurut menu aktif, gulir di dalam kartu).
- Tinggi seluruh layar dimanfaatkan; halaman tidak digulir pada 1366x768 dan lebih besar.
- Mobile (sekitar 390 px): peta di atas (±260 px), panel sebagai lembar bawah, navigasi bawah dengan 4 menu (tinggi sentuh >= 44 px).

## Pola komponen
- **Marker**: CircleMarker, border putih 2-3 px; ukuran menurut pelapor unik (12-40 px), angka di dalam marker besar (putih di merah, arang di oranye/kuning). Terpilih: outline accent 3 px + tooltip kartu putih berisi skor.
- **Overlay peta** (kartu putih, radius 16, bayangan tipis): filter kiri atas (chip aktif = latar `accent-soft`, teks `accent`, garis `accent` 1 px; chip nonaktif = putih, garis `border-input`, teks `muted`), "Simulasikan laporan warga" + toggle fasilitas vital kanan atas, legenda kiri bawah (jumlah klaster per level dari data), kartu skenario demo kanan bawah (dengan jarak aman dari atribusi), skala peta bila ruang cukup.
- **Layer vital**: kotak/lingkaran/belah ketupat 11-12 px, border putih; toggle default mati.
- **Skor besar**: cincin SVG dengan angka tengah dan badge level.
- **Rincian skor**: bar 8 px (accent) dengan "poin / maks" di kanan dan satu baris penjelasan `muted`.
- **Kartu strategi anggaran**: border tipis; aktif = border accent 2 px + latar `accent-soft`; DP bertanda "Terbaik"; 4 metrik dalam grid.
- **Toast**: kotak arang, teks putih, ikon centang `header-icon` (success) atau ikon info netral (info, ignored). Dibangun sendiri, tanpa library.
- **Status marker**: `resolved` = abu `#9CA3AF` opasitas 0,4; `scheduled` = garis tepi putus-putus.

## Gerak
CSS transition saja, hormati `prefers-reduced-motion`. Cincin skor dan warna 300-400 ms (`cubic-bezier(0.22, 1, 0.36, 1)`), nav, tab, kartu aktif, dan ring marker 150-250 ms. Angka skor berganti nilai tanpa efek menghitung. Menyusut/membesar sidebar 200 ms.

## Jangan
Glow, bayangan tebal, emoji sebagai ikon, dekorasi di luar yang diizinkan di atas, warna hex tertulis di komponen (selain putih murni untuk border marker), mengubah warna level prioritas, data atau fitur tiruan (lihat Aturan jujur UI), mengklaim sesuatu "terbukti".

## Catatan
Versi sebelumnya (v2, header arang + panel tab) digantikan oleh dokumen ini. Kanvas desain lama dan mockup AI hanya referensi tata letak.

## Versi 3.1 — Pita Atas Hero Gelap (Pembaruan UI Header)
Pita atas dashboard (judul, subjudul, badge data simulasi, dan 3 kartu KPI) diperbarui dengan gaya visual hero gelap bernuansa navy-teal dan kartu kaca (glassmorphic), sementara ruang kerja (peta, panel samping, dan sidebar) tetap mempertahankan gaya terang v3.

### Token Hero Gelap (`app/globals.css` & `lib/theme.ts`)
| Token | Nilai | Peruntukan | Rasio Kontras |
|---|---|---|---|
| `--hero-bg` | `#0B2231` | Latar solid warna datar (flat) header | Latar dasar |
| `--hero-accent` | `#2DD4BF` | Aksen garis bawah menu aktif & ikon chip mint | 8,77:1 di hero-bg (Pass AAA) |
| `--hero-text` | `#FFFFFF` | Teks judul/merek & nilai angka KPI (Laporan, Klaster) | 16,35:1 di hero-bg (Pass AAA) |
| `--hero-muted` | `#CBD5E1` | Nama panjang akronim & label kartu KPI | 6,80:1 di kartu kaca; 11,00:1 di hero-bg (Pass AAA) |
| `--hero-border` | `rgba(255,255,255,0.12)` | Border kontainer bar navigasi atas | Garis 1 px |
| `--hero-card-bg` | `rgba(255,255,255,0.08)` | Latar kaca kartu KPI (±8% putih) | Efek glassmorphic halus |
| `--hero-card-border` | `rgba(255,255,255,0.14)` | Border kartu KPI kaca (±14% putih) | Garis 1 px |
| `--hero-chip-bg` | `rgba(45,212,191,0.14)` | Latar chip ikon mint pada kartu KPI | Tint mint |
| `--hero-badge-bg` | `rgba(251,191,36,0.12)` | Latar pill badge | Amber halus |
| `--hero-badge-border` | `rgba(251,191,36,0.40)` | Border pill badge | Amber outline |
| `--hero-badge-text` | `#FBBF24` | Teks pill badge | 7,46:1 – 10,12:1 (Pass AAA) |
| `--kritis-on-dark` | `#FF7875` | Angka "Prioritas kritis" khusus di latar gelap | 3,90:1 di kartu kaca; 6,38:1 di hero-bg (Pass teks besar >= 3:1) |
| `--kritis-chip-dark` | `rgba(255,120,117,0.16)` | Latar chip ikon kritis pada kartu KPI | Tint merah halus |

## Versi 3.3 — Header Full-Bleed Satu Baris & Efisiensi Ruang Peta (Revisi UI Header)
Pembaruan header gelap menjadi **navbar full-bleed satu baris** (tinggi <= 72 px pada lebar >= 1280 px). Header membentang penuh dari tepi kiri ke kanan viewport dan menempel di batas atas (tanpa margin luar, tanpa border-radius, dan tanpa bayangan mengambang), dengan garis batas bawah 1 px (`border-b border-hero-border`). Isi header (merek, menu, KPI) menggunakan padding horizontal 16 px (`px-4`) yang persis sejajar dengan batas kiri peta dan batas kanan panel samping. Area konten di bawah header memiliki jarak vertikal 12 px (`pt-3 pb-2.5`).

### Arsitektur Header Full-Bleed (`components/TopNav.tsx`)
1. **Lebar >= 1280 px (Satu Baris Sejajar, Tinggi ~57-58 px)**:
   - Sisi Kiri: Nama "TEPAT" diperbesar menjadi 28 px tebal (`text-[28px] font-bold tracking-tight leading-none`) dengan tooltip `title="Triase Evaluasi Perbaikan dan Anggaran Terukur"`. Pada lebar >= 1536 px, nama panjang akronim *"Triase Evaluasi Perbaikan dan Anggaran Terukur"* (16 px) ditampilkan penuh di sampingnya dan rata pada garis dasar (baseline). Pada lebar < 1536 px, nama panjang disembunyikan secara visual namun tetap terbaca oleh pembaca layar (`sr-only`) dan via tooltip hover pada "TEPAT". Breakpoint 1536 px memastikan jarak antar kelompok merek, menu, dan KPI selalu >= 24 px (berjarak 90-280 px) tanpa pernah saling menimpa.
   - Sisi Tengah: Menu navigasi utama (`<nav aria-label="Navigasi utama">`) dengan 4 item lengkap (Peringkat, Detail, Anggaran, Bobot). Item aktif: teks putih tebal + garis bawah mint 2 px (`#2DD4BF`). Penempatan menggunakan flex layout murni (`justify-between`), bebas dari posisi absolut.
   - Sisi Kanan: Tiga chip KPI kompak kaca (`KpiCards`, tinggi <= 44 px, ~36-38 px): Laporan masuk, Klaster aktif, Prioritas kritis (angka teks merah terang `--kritis-on-dark`).
2. **Lebar 1024 - 1279 px (Satu Baris Kompak)**:
   - Tetap satu baris full-bleed. Nama "TEPAT" 28 px tampil jelas di kiri, nama panjang akronim berstatus `sr-only`, dan label chip KPI diringkas ("Laporan", "Klaster", "Kritis") sehingga seluruh elemen pas dalam satu baris dengan jarak aman antar kelompok.
3. **Lebar < 1024 px & Mobile < 640 px (Dua Baris Tipis Full-Bleed)**:
   - Baris 1: Merek "TEPAT" 24 px (dengan tooltip nama panjang) dan menu navigasi strip horizontal (`overflow-x-auto scrollbar-none`) yang dapat digeser mulus tanpa memicu scroll horizontal pada halaman.
   - Baris 2: Tiga chip KPI kompak berjejer sebaris (`grid grid-cols-3` pada mobile).
   - Tinggi total header di bawah 640 px terhitung **~96-98 px**, jauh di bawah batas maksimal **120 px**.
4. **Footer Tipis (Tinggi <= 28 px)**:
   - Footer satu baris (`h-6 sm:h-7`) memuat penafian permanen: *"Prototipe pendukung keputusan, bukan pengganti kanal laporan resmi. Data simulasi."*, atribusi *"© OpenStreetMap contributors"*, dan nomor versi *"v1.0.0"*.

### Tabel Rasio Kontras Teks (WCAG AA / AAA)
| Elemen / Token | Nilai Hex / RGBA | Latar Ukur | Rasio Kontras | Status WCAG |
|---|---|---|---|---|
| **Item menu aktif** (`--hero-nav-active`) | `#FFFFFF` | Flat Hero Bg (`#0B2231`) | **16,35:1** | Pass AAA (>= 7:1) |
| **Garis bawah aktif** (`--hero-nav-active-line`) | `#2DD4BF` | Flat Hero Bg (`#0B2231`) | Garis aksen mint 2 px | Pass Visual (8,77:1) |
| **Item menu tidak aktif** (`--hero-nav-inactive`) | `#CBD5E1` | Flat Hero Bg (`#0B2231`) | **11,00:1** | Pass AAA (>= 4,5:1) |
| **Teks "TEPAT"** (`--hero-text`) | `#FFFFFF` | Flat Hero Bg (`#0B2231`) | **16,35:1** | Pass AAA (>= 4,5:1) |
| **Nama panjang akronim** (`--hero-muted`) | `#CBD5E1` | Flat Hero Bg (`#0B2231`) | **11,00:1** | Pass AAA (>= 4,5:1) |
| **Angka chip KPI (Laporan & Klaster)** (`--hero-text`) | `#FFFFFF` | Chip Kaca (`rgba(255,255,255,0.08)`) | **10,10:1** | Pass AAA (>= 4,5:1) |
| **Angka "Prioritas kritis"** (`--kritis-on-dark`) | `#FF7875` | Chip Kaca (`rgba(255,255,255,0.08)`) | **3,90:1** | Pass AA Teks Besar (>= 3:1) |
| **Label kecil chip KPI** (`--hero-muted`) | `#CBD5E1` | Chip Kaca | **6,80:1** | Pass AA (>= 4,5:1) |

### Perhitungan Ketinggian Layar & Ruang Peta
- **1920x1080**: Chrome non-peta total 116 px (Header 58 px + Jarak pt 12 px + Gap 12 px + Footer 24 px + pb 10 px). Tinggi peta/panel = **964 px** (layar penuh) / **864 px** (viewport ~980 px), tanpa scroll halaman.
- **1366x768 (Viewport browser ~650 px)**: Chrome non-peta total 116 px. Tinggi peta/panel = **534 px** (memenuhi batas `>= 520 px`).
- **1024x768**: Header satu baris 58 px. Tinggi peta/panel = **534 px** (pada browser 650 px).
- **768x1024 (Tablet)**: Header dua baris 96 px. Sisa ruang vertikal peta/panel = **870 px**.
- **375x667 (Mobile)**: Header dua baris 98 px (<= 120 px). Peta `h-[420px]`, panel di bawahnya dengan scroll vertikal alami tanpa scroll horizontal.
