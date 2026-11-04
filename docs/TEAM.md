# TEAM — Pembagian kerja dan aturan git (2 orang)

Penyebab konflik git hampir selalu sama: dua orang mengubah **file yang sama**. Karena itu pembagiannya per **file/folder**, bukan per fitur secara umum. Satu file = satu pemilik.

## Peran

**Orang A — Peta dan alur data**
- Pemilik file: `lib/vitals.ts`, `lib/theme.ts`, `app/globals.css`, `lib/reducer.ts`, `lib/store.tsx`, `lib/demo.ts`, `components/CommandCenter.tsx`, `components/MapDashboard.tsx` dan `components/map/*`, `components/AddReportForm.tsx`.
- Task: T0, T1a (vitals, theme, globals), T2 (store + kerangka layout), T3 (peta), T6 (tambah laporan), T10 (skenario demo).

**Orang B — Panel dan konten**
- Pemilik file: `lib/weights.ts`, `lib/format.ts`, `components/panel/*` (RankingTab, InspectorTab, BudgetTab, WeightsTab), tes terkait di `tests/`.
- Task: T1b (weights, format + tes), T4 (RankingTab), T5 (Inspector), T7 (tes alur), T8 (Anggaran), T9 (Bobot).
- Non-kode: draf proposal PDF dan naskah video (lihat bawah).

**Bersama (satu per satu, bukan paralel):** T11 (poles dan responsif), T12 (README, QA akhir).

**Dilarang disentuh siapa pun:** `lib/infratriage/` (mesin yang sudah dites).

## Urutan kerja supaya tidak saling menunggu

1. **A**: T0 → T1a → T2. T2 membuat store, reducer, dan kerangka `CommandCenter` dengan 4 file tab kosong di `components/panel/` sebagai penampung (B yang mengisinya). Merge secepatnya.
2. **B** (sambil menunggu T2): T1b, lalu pekerjaan non-kode (cek Jalan Kita 2.0 dan JAKI, kerangka proposal, naskah video).
3. Setelah T2 masuk ke master: **A** mengerjakan T3, T6, T10; **B** mengerjakan T4, T5, T8, T9. Dua jalur ini hampir tidak bersinggungan.
4. T11 dan T12 dikerjakan bersama setelah semua fitur masuk.

**Kontrak:** bentuk state dan nama aksi reducer ditetapkan di T2 dan dianggap tetap. B membaca state lewat `useApp()`. Butuh aksi atau field baru? B minta ke A lewat chat, atau menambah di PR kecil terpisah yang diberi tahu ke A.

## Aturan git

1. `master` harus selalu jalan: `npm test` dan `npm run build` lulus. Jangan push langsung ke `master` (kecuali dokumen).
2. Satu branch per task, pendek umurnya (maksimal setengah hari): `a/t3-peta`, `b/t5-inspector`.
3. Sebelum mulai dan sebelum push:
   ```
   git fetch origin
   git rebase origin/master
   ```
4. Gabung lewat Pull Request di GitHub. Orang lain membaca sekilas lalu setujui. Ini juga membuat kalian paham kode satu sama lain, yang penting untuk sesi tanya jawab juri.
5. Commit kecil dengan pesan jelas: `T5: rincian skor di Inspector`.
6. Kabari di chat setiap kali merge: "T3 sudah masuk master, tarik dulu".
7. **Dependency**: hanya satu orang yang menjalankan `npm install <paket>` dan memberi tahu yang lain. Kalau `package-lock.json` konflik:
   ```
   git checkout origin/master -- package-lock.json
   npm install
   ```
   lalu commit ulang.
8. **Akhir baris (LF/CRLF)**: di Windows ini bisa membuat seluruh file terlihat berubah. Buat file `.gitattributes` di root berisi satu baris `* text=auto eol=lf`, commit, lalu dua orang menjalankan `git add --renormalize .`.
9. **Aturan untuk AI agent** (tambahkan ke `AGENTS.md`):
   ```
   - Hanya ubah file yang disebut dalam task yang sedang dikerjakan. Jangan refactor, rename, atau memformat ulang file lain.
   - Jangan ubah package.json, package-lock.json, atau file konfigurasi kecuali task memintanya.
   - Jangan ubah file milik orang lain (lihat docs/TEAM.md).
   ```
10. Sambungkan repo ke GitHub, lalu hubungkan Vercel ke repo itu. Setiap branch otomatis dapat tautan pratinjau, jadi tidak ada yang menimpa deploy utama. Pastikan repo bisa dibuka juri (publik, atau akses diberikan) karena tautan repo wajib dikumpulkan.
