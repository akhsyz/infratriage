"use client";

import { useSyncExternalStore } from "react";
import { getVisitorId } from "./persistence";
import {
  calculateTargetDimensions,
  CLIENT_MAX_PHOTO_BYTES,
  MAX_PHOTO_SIDE_PX,
  type PhotoUploadStatus,
  type SupportedPhotoExt,
} from "./photoUtils";

// Re-ekspor seluruh fungsi murni dan tipe dari photoUtils agar dapat diakses via photos.ts
export * from "./photoUtils";

// ────────────────────────────────────────────────────────────
// In-Memory Status Store (useSyncExternalStore)
// ────────────────────────────────────────────────────────────

const photoStatusStore = new Map<string, PhotoUploadStatus>();
const storeListeners = new Set<() => void>();

function emitChange() {
  storeListeners.forEach((listener) => listener());
}

export function setPhotoStatus(reportId: string, status: PhotoUploadStatus): void {
  photoStatusStore.set(reportId, status);
  emitChange();
}

export function getPhotoStatus(reportId: string): PhotoUploadStatus | undefined {
  return photoStatusStore.get(reportId);
}

export function clearPhotoStore(): void {
  photoStatusStore.clear();
  emitChange();
}

function subscribePhotoStore(listener: () => void): () => void {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

/**
 * React hook untuk berlangganan status unggahan foto suatu laporan secara reaktif.
 */
export function usePhotoStatus(reportId: string): PhotoUploadStatus | undefined {
  return useSyncExternalStore(
    subscribePhotoStore,
    () => photoStatusStore.get(reportId),
    () => undefined
  );
}

// ────────────────────────────────────────────────────────────
// Kompresi di Browser (Canvas Re-encoding)
// ────────────────────────────────────────────────────────────

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gagal membaca file gambar."));
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

/**
 * Kompresi gambar di peramban:
 * - Batasi sisi terpanjang maksimal 1280 px.
 * - Gambar ulang ke canvas (membersihkan EXIF / metadata koordinat).
 * - Coba re-encode ke WebP, jika gagal/tidak didukung mundur ke JPEG.
 * - Turunkan kualitas bertahap (0.8 -> 0.65 -> 0.5 -> 0.35 -> 0.2) sampai <= 1,5 MB.
 * - Tolak dengan pesan jelas jika tetap > 1,5 MB.
 */
export async function compressPhotoInBrowser(
  file: File
): Promise<{ blob: Blob; ext: SupportedPhotoExt }> {
  const img = await loadImageElement(file);
  const { width, height } = calculateTargetDimensions(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    MAX_PHOTO_SIDE_PX
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Gagal memproses kanvas untuk kompresi gambar.");
  }

  // Gambar ulang ke canvas (semua EXIF metadata terbuang)
  ctx.drawImage(img, 0, 0, width, height);

  const qualities = [0.8, 0.65, 0.5, 0.35, 0.2];

  let selectedBlob: Blob | null = null;
  let selectedExt: SupportedPhotoExt = "webp";

  // Coba WebP terlebih dahulu
  for (const q of qualities) {
    const b = await canvasToBlob(canvas, "image/webp", q);
    if (b && b.type === "image/webp") {
      if (b.size <= CLIENT_MAX_PHOTO_BYTES) {
        selectedBlob = b;
        selectedExt = "webp";
        break;
      }
      selectedBlob = b;
    } else {
      break; // Lanjut fallback ke jpeg
    }
  }

  // Jika WebP tidak didukung atau ukuran masih > 1,5 MB, coba JPEG
  if (!selectedBlob || selectedBlob.type !== "image/webp" || selectedBlob.size > CLIENT_MAX_PHOTO_BYTES) {
    for (const q of qualities) {
      const b = await canvasToBlob(canvas, "image/jpeg", q);
      if (b) {
        if (b.size <= CLIENT_MAX_PHOTO_BYTES) {
          selectedBlob = b;
          selectedExt = "jpg";
          break;
        }
        selectedBlob = b;
        selectedExt = "jpg";
      }
    }
  }

  if (!selectedBlob || selectedBlob.size > CLIENT_MAX_PHOTO_BYTES) {
    throw new Error(
      "Ukuran foto melebihi batas 1,5 MB setelah dikompresi. Silakan gunakan foto lain yang berukuran lebih kecil."
    );
  }

  return { blob: selectedBlob, ext: selectedExt };
}

// ────────────────────────────────────────────────────────────
// Layanan Jaringan Klien (Upload & Fetch Signed URL)
// ────────────────────────────────────────────────────────────

/**
 * Mengunggah file foto ke server pada route POST /api/reports/photo.
 * Mengembalikan true jika sukses, false jika gagal. Aman gagal tanpa throw.
 */
export async function uploadReportPhoto(
  reportId: string,
  file: Blob,
  ext: SupportedPhotoExt
): Promise<boolean> {
  try {
    const visitorId = getVisitorId();
    const formData = new FormData();
    formData.append("reportId", reportId);
    formData.append("file", file, `${reportId}.${ext}`);

    const res = await fetch("/api/reports/photo", {
      method: "POST",
      headers: {
        "x-visitor-id": visitorId,
      },
      body: formData,
    });

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Mengambil signed URL sementara (10 menit) untuk menampilkan foto laporan.
 * Mengembalikan string URL atau null jika gagal. Aman gagal tanpa throw.
 */
export async function fetchPhotoSignedUrl(
  reportId: string
): Promise<string | null> {
  try {
    const visitorId = getVisitorId();
    const res = await fetch(
      `/api/reports/photo?reportId=${encodeURIComponent(reportId)}`,
      {
        method: "GET",
        headers: {
          "x-visitor-id": visitorId,
        },
      }
    );

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { signedUrl?: string };
    return data.signedUrl ?? null;
  } catch {
    return null;
  }
}
