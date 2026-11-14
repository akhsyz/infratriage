<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Aturan proyek InfraTriage (TEPAT)
- JANGAN mengubah logika di `lib/infratriage/`. Itu mesin keputusan yang sudah dibekukan dan dites (`npm test` harus tetap 18 file dan 201 tes lulus).
- Persistensi data per pengunjung menggunakan Supabase (Fase 1) dengan fallback otomatis ke Mode Lokal (di memori) bila database tidak terjangkau. Dilengkapi fitur unggah foto bukti ke storage privat.
- Fitur analisis mencakup: kalkulasi skor urgensi 5 kriteria, pengelompokan spasial per radius kategori, simulasi 4 strategi anggaran (DP, Greedy, TopScore, FIFO), tabel asumsi biaya yang dapat diedit selama sesi, uji ketahanan biaya Monte Carlo (100 trials, Mulberry32 deterministik), dan skenario demo interaktif deterministik.
- Tanpa Auth/Login; isolasi data menggunakan UUID v4 per pengunjung di `localStorage`.
- Semua laporan kerusakan adalah data simulasi; tampilkan `SEED_DISCLAIMER`. Fasilitas vital dari OSM butuh atribusi "© OpenStreetMap contributors".
- Setiap task harus diakhiri dengan `npm test` yang lulus dan `npx tsc --noEmit` bersih.
- Warna dan font hanya boleh didefinisikan di `app/globals.css` (token CSS) dan `lib/theme.ts` (warna untuk peta). Komponen DILARANG menulis kode hex atau nama warna langsung; pakai token/kelas Tailwind yang merujuk token atau konstanta dari `lib/theme.ts`. Nilai token mengikuti `docs/DESIGN.md`.

## Aturan kerja tim
- Hanya ubah file yang disebut dalam task yang sedang dikerjakan. Jangan refactor, rename, atau memformat ulang file lain.
- Jangan ubah package.json, package-lock.json, atau file konfigurasi kecuali task memintanya.
