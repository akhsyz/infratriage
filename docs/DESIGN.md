# DESIGN — Panduan visual TEPAT (v2: arang + teal)

Arah: **bersih, minimalis, modern, bernuansa kota/infrastruktur**. Ini dashboard peta, bukan landing page: tata letak mengikuti PRD.md bagian 7.

## Supaya tidak terkesan "buatan AI"
- Tanpa gradien, tanpa efek glow/kaca (glassmorphism), tanpa ilustrasi 3D.
- Radius konsisten dan lebih kecil: kartu 12 px, tombol/input 10 px, chip 8 px, badge 6 px. Bentuk bulat penuh hanya untuk marker peta.
- Bayangan tipis, lebih mengandalkan garis 1 px daripada bayangan tebal.
- Pakai angka dan label nyata dari data, bukan teks pengisi.
- Aksen hanya satu . Warna lain hanya warna fungsional (level prioritas).

## Token (taruh di `app/globals.css` sebagai CSS variable / `@theme` Tailwind v4)


**Warna prioritas (fungsional, JANGAN diubah):**

| Level | Marker | Badge bg | Badge teks |
|---|---|---|---|
| Kritis (≥ 80) | `#D92D3A` | `#FDE8EA` | `#A4121F` |
| Tinggi (50–79) | `#F28C28` | `#FFEFD9` | `#9A4A00` |
| Sedang (< 50) | `#F4C430` | `#FFF6CC` | `#7A5B00` |

Warna fasilitas vital (dibedakan juga lewat bentuk): rumah sakit `#2563EB` (kotak), sekolah `#334155` (lingkaran), pasar `#8B5E34` (belah ketupat).
Warna level selalu disertai teks level (aksesibilitas buta warna). Jangan pakai teks oranye/kuning di atas putih (kontras kurang).

## Tipografi
Font **Plus Jakarta Sans** (400/500/600/700) lewat `next/font/google` (`Plus_Jakarta_Sans`). Judul 18–20 px/600–700, isi 12–13 px, label huruf kapital kecil 11 px dengan letter-spacing .08em, angka skor 34 px/700. Poppins boleh dipakai sebagai cadangan.

## Pola komponen
- **Header**: latar arang, logo (cincin + pin, aksen teal muda), nama produk "TEPAT" dengan subjudul kecil huruf kapital "Prioritas perbaikan infrastruktur · Yogyakarta", 3 KPI dengan ikon garis tipis (Laporan masuk, Klaster aktif, Prioritas kritis), badge "Data simulasi" (garis kuning `#F4C430`, radius 6).
- **Tab panel**: segmented control `tint`; tab aktif = latar aksen teks putih, radius 8.
- **Marker**: CircleMarker, border putih 2–3 px; ukuran menurut pelapor unik (±12–40 px), angka pelapor di dalam marker besar (teks putih di merah, teks arang di oranye/kuning). Terpilih: outline aksen 3 px + tooltip kartu putih berisi skor besar.
- **Layer vital**: kotak/lingkaran/belah ketupat kecil 11–12 px, border putih; toggle default mati.
- **Skor besar**: cincin (SVG) dengan angka tengah, badge level di sampingnya.
- **Rincian skor**: bar tipis 8 px (aksen) dengan nilai "poin / maks" di kanan dan satu baris penjelasan redup di bawahnya.
- **Kartu strategi anggaran**: kartu border tipis; strategi aktif = border aksen 2 px + latar `aksen-tint`; DP diberi badge aksen "Terbaik"; 4 metrik dalam grid 4 kolom.
- **Toast** (hasil laporan masuk): kotak arang, teks putih, ikon centang teal muda.
- **Footer**: arang-dark, teks `teks-di-gelap` 12 px: atribusi OSM, data simulasi, asumsi, bukan pengganti kanal resmi.

## Peta
Overlay mengambang berupa kartu putih: filter di kiri atas, "Tambah laporan" + toggle vital di kanan atas, legenda di kiri bawah, toast + kartu skenario demo di kanan bawah. Tile: pakai CartoDB Positron (terang, abu netral, cocok dengan palet ini) dan cantumkan "© OpenStreetMap contributors © CARTO"; OSM standar tetap boleh sebagai cadangan.

## Responsif
Desktop: peta + panel kanan lebar 440–480 px. Mobile (≈390 px): header ringkas dengan 3 KPI, peta ±260 px, panel jadi lembar bawah dengan 4 tab (tinggi sentuh ≥ 44 px), tombol "+" mengambang di peta.

## Jangan
Gradien, emoji sebagai ikon, animasi berat, warna ungu/biru neon, teks abu kecil di latar abu, mengubah warna level prioritas, mengklaim sesuatu "terbukti".

