import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const rawPath = path.join(rootDir, "data", "fasilitas-yogya-raw.json");
const outPath = path.join(rootDir, "data", "fasilitas-vital-yogya.json");

// Baca file mentah dari folder data
const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));

// Bersihkan dan ambil yang penting saja
const cleaned = raw.elements
  .filter((el) => el.tags && el.tags.name) // Hanya ambil fasilitas yang punya nama
  .map((el) => ({
    id: `osm-${el.id}`,
    name: el.tags.name,
    category: el.tags.amenity, // 'hospital' | 'school' | 'marketplace'
    lat: el.lat || (el.center && el.center.lat),
    lng: el.lon || (el.center && el.center.lon),
  }))
  .filter((item) => item.lat && item.lng);

// Simpan sebagai file baru yang bersih
fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2));
console.log(`Berhasil menyimpan ${cleaned.length} titik fasilitas vital Kota Yogyakarta!`);
