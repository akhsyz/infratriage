<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Aturan proyek InfraTriage
- JANGAN mengubah logika di `lib/infratriage/`. Itu mesin keputusan yang sudah dites (`npm test` harus tetap 53 lulus).
- Tanpa Auth/Login dan tanpa database. State disimpan di memori, dengan tombol "Reset demo".
- Semua laporan kerusakan adalah data simulasi; tampilkan `SEED_DISCLAIMER`. Fasilitas vital dari OSM butuh atribusi "© OpenStreetMap contributors".
- Setiap task harus diakhiri dengan `npm test` dan `npm run build` yang lulus.
- Warna dan font hanya boleh didefinisikan di `app/globals.css` (token CSS) dan `lib/theme.ts` (warna untuk peta). Komponen DILARANG menulis kode hex atau nama warna langsung; pakai token/kelas Tailwind yang merujuk token atau konstanta dari `lib/theme.ts`. Nilai token mengikuti `docs/DESIGN.md`.

## Aturan kerja tim
- Hanya ubah file yang disebut dalam task yang sedang dikerjakan. Jangan refactor, rename, atau memformat ulang file lain.
- Jangan ubah package.json, package-lock.json, atau file konfigurasi kecuali task memintanya.
- Jangan ubah file milik orang lain (lihat docs/TEAM.md).