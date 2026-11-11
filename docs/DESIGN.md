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
| `--hero-from` | `#0B1F2A` | Awal gradien latar pita atas | Latar dasar |
| `--hero-to` | `#0F3A3A` | Akhir gradien latar pita atas | Latar dasar |
| `--hero-accent` | `#2DD4BF` | Aksen kata "infrastruktur" di judul & ikon chip mint | 6,69:1 di hero-to (Pass AA/AAA besar) |
| `--hero-text` | `#FFFFFF` | Teks judul utama & nilai angka KPI (Laporan, Klaster) | 12,45:1 – 16,89:1 di gradien (Pass AAA) |
| `--hero-muted` | `#CBD5E1` | Subjudul "Kota Yogyakarta" & label kartu KPI | 6,79:1 di kartu kaca; 8,39:1 di hero-to (Pass AA) |
| `--hero-border` | `rgba(255,255,255,0.12)` | Border kontainer pita atas | Garis 1 px |
| `--hero-card-bg` | `rgba(255,255,255,0.07)` | Latar kaca kartu KPI (±7% putih) | Efek glassmorphic |
| `--hero-card-border` | `rgba(255,255,255,0.12)` | Border kartu KPI kaca (±12% putih) | Garis 1 px |
| `--hero-chip-bg` | `rgba(45,212,191,0.14)` | Latar chip ikon mint pada kartu KPI | Tint mint |
| `--hero-badge-bg` | `rgba(251,191,36,0.12)` | Latar pill badge "Data simulasi" | Amber halus |
| `--hero-badge-border` | `rgba(251,191,36,0.40)` | Border pill badge "Data simulasi" | Amber outline |
| `--hero-badge-text` | `#FBBF24` | Teks pill badge "Data simulasi" | 7,46:1 – 10,12:1 (Pass AAA) |
| `--kritis-on-dark` | `#FF7875` | Angka "Prioritas kritis" khusus di latar gelap | 3,94:1 di kartu kaca; 4,84:1 di latar gelap (Pass teks besar >= 3:1) |
| `--kritis-chip-dark` | `rgba(255,120,117,0.16)` | Latar chip ikon kritis pada kartu KPI | Tint merah halus |

Pola grid latar di pita atas diimplementasikan secara murni dengan CSS (`repeating linear-gradient` 32x32 px) tanpa aset gambar eksternal. Ketinggian vertikal pita atas dikendalikan agar kenaikannya <= 16 px dari tata letak sebelumnya untuk memastikan peta dan panel tetap tampak penuh pada resolusi 1366x768.

## Versi 3.2 — Integrasi TopNav & Layar Penuh (Pembaruan UI Header Menyeluruh)
Menu navigasi utama (Peringkat, Detail, Anggaran, Bobot) dipindahkan dari sidebar vertikal ke dalam **Bar Navigasi Atas (TopNav)** yang menyatu langsung dengan blok hero gelap. Sidebar vertikal dihapus sehingga ruang kerja (peta Leaflet dan panel analisis samping) kini memanfaatkan lebar penuh layar dengan padding 24 px (`max-w-[1680px]` terpusat).

### Arsitektur Blok Header Menyatu (`components/TopNav.tsx`)
1. **Baris 1 (Brand & Menu Navigasi)**:
   - Sisi Kiri: Chip brand "T" membulat (`#2DD4BF`), nama "TEPAT" putih tebal, serta subjudul "Prioritas perbaikan infrastruktur" (responsif disembunyikan di layar kecil).
   - Sisi Kanan: Menu navigasi `<nav aria-label="Navigasi utama">` dengan 4 item lengkap beserta ikon Lucide.
   - Item aktif: Teks putih tebal (`#FFFFFF`) dengan garis bawah mint (`#2DD4BF` 2 px) dan `aria-current="page"`.
   - Item tidak aktif: Teks putih redup (`#CBD5E1`), hover lebih terang dengan latar putih halus (`rgba(255,255,255,0.08)`).
   - Nomor versi "v1.0.0" ditampilkan redup di sisi kanan nav desktop serta di footer tipis halaman.
2. **Baris 2 (Judul Halaman & KPI Kompak)**:
   - Lebar >= 1280 px: Judul "Prioritas perbaikan infrastruktur" (kata "infrastruktur" mint) + badge amber "Data simulasi" + subjudul "Kota Yogyakarta" di sisi kiri, berjejer satu baris dengan 3 kartu KPI kompak kaca di sisi kanan untuk menghemat tinggi vertikal.
   - Lebar < 1280 px: Tiga kartu KPI ditaruh di bawah baris judul secara fleksibel.
3. **Responsif Mobile (< 640 px & 375 px)**:
   - Navigasi menu menggunakan kontainer strip horizontal (`overflow-x-auto` dengan `scrollbar-none`) di dalam elemen header tanpa memicu scroll horizontal pada halaman keseluruhan.
   - Area sentuh setiap item navigasi terjaga minimal 40 px.

### Token Baru TopNav (`app/globals.css` & `lib/theme.ts`)
| Token | Nilai | Peruntukan | Rasio Kontras |
|---|---|---|---|
| `--hero-nav-active` | `#FFFFFF` | Teks tab navigasi aktif | 12,53:1 – 16,94:1 di gradien hero (Pass AAA) |
| `--hero-nav-inactive` | `#CBD5E1` | Teks tab navigasi non-aktif | 8,43:1 – 11,40:1 di gradien hero (Pass AAA, >= 4.5:1) |
| `--hero-nav-active-line` | `#2DD4BF` | Garis bawah indikator tab aktif | Aksen mint 2 px |
| `--hero-nav-hover-bg` | `rgba(255,255,255,0.08)` | Latar hover tab navigasi | Efek transisi halus |
| `--hero-brand-chip-bg` | `#2DD4BF` | Latar chip logo "T" | Aksen mint |
| `--hero-brand-chip-ink` | `#06171E` | Teks huruf "T" di chip brand | 9,09:1 (Pass AAA) |

### Pengendalian Tinggi Vertikal
- **Resolusi 1366 px (>= 1280 px)**: Tinggi total blok header terhitung **139 px**, memenuhi batasan ketat `<= 220 px`. Peta dan panel samping tetap terlihat utuh tanpa scroll pada layar laptop standar 1366x768.
- **Resolusi 375 px (Mobile)**: Tinggi total blok header terhitung **~340 px**, dengan strip menu scrollable horizontal di dalam header dan halaman bergulir vertikal alami.
