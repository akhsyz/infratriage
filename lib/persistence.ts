import { useEffect, useState } from "react";
import type { Report } from "./infratriage/types";
import { isValidUuidV4 } from "./reportValidation";

const STORAGE_KEY = "infratriage_visitor_id";
const REQUEST_TIMEOUT_MS = 4000;

let memoryVisitorId: string | null = null;
let isLocalModeState = false;
const statusListeners = new Set<(isLocal: boolean) => void>();

function notifyLocalMode(isLocal: boolean) {
  if (isLocalModeState !== isLocal) {
    isLocalModeState = isLocal;
    statusListeners.forEach((listener) => listener(isLocalModeState));
  }
}

/**
 * Hook untuk memantau status persistensi (apakah sedang fallback ke Mode Lokal).
 */
export function useLocalModeStatus(): boolean {
  const [isLocal, setIsLocal] = useState<boolean>(isLocalModeState);

  useEffect(() => {
    const listener = (val: boolean) => setIsLocal(val);
    statusListeners.add(listener);
    return () => {
      statusListeners.delete(listener);
    };
  }, []);

  return isLocal;
}

/**
 * Pembangkit UUID v4 yang aman.
 */
function generateUuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Mengambil ID unik pengunjung peramban.
 * Disimpan di localStorage; jika gagal (private browsing / SSR), fallback ke memori.
 */
export function getVisitorId(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isValidUuidV4(stored)) {
        return stored;
      }
      const newId = generateUuidV4();
      window.localStorage.setItem(STORAGE_KEY, newId);
      return newId;
    } catch {
      // localStorage diblokir atau error, lanjut ke memory fallback
    }
  }

  if (!memoryVisitorId || !isValidUuidV4(memoryVisitorId)) {
    memoryVisitorId = generateUuidV4();
  }
  return memoryVisitorId;
}

/**
 * Helper untuk fetch dengan batas waktu timeout ±4 detik.
 */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Memuat laporan tersimpan milik pengunjung dari server Supabase.
 * Mengembalikan array Report; aman gagal dan tidak melempar error.
 */
export async function loadReports(): Promise<Report[]> {
  try {
    const visitorId = getVisitorId();
    const res = await fetchWithTimeout("/api/reports", {
      method: "GET",
      headers: {
        "x-visitor-id": visitorId,
      },
    });

    if (!res.ok) {
      notifyLocalMode(true);
      return [];
    }

    const json = (await res.json()) as { reports?: Report[] };
    notifyLocalMode(false);
    return Array.isArray(json.reports) ? json.reports : [];
  } catch {
    notifyLocalMode(true);
    return [];
  }
}

/**
 * Menyimpan satu laporan baru ke server Supabase.
 * Laporan skenario demo (demo-1 s.d. demo-10) diabaikan dan tidak disimpan.
 * Aman gagal (mengembalikan { ok: false }), tidak melempar error.
 */
export async function saveReport(
  report: Report
): Promise<{ ok: boolean; skipped?: boolean }> {
  // Jangan simpan laporan skenario demo
  if (
    report.reporterId?.startsWith("demo-") ||
    report.id?.startsWith("demo-")
  ) {
    return { ok: true, skipped: true };
  }

  try {
    const visitorId = getVisitorId();
    const res = await fetchWithTimeout("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-visitor-id": visitorId,
      },
      body: JSON.stringify(report),
    });

    if (!res.ok) {
      notifyLocalMode(true);
      return { ok: false };
    }

    notifyLocalMode(false);
    return { ok: true };
  } catch {
    notifyLocalMode(true);
    return { ok: false };
  }
}

/**
 * Menghapus seluruh laporan tersimpan milik pengunjung (misal saat reset demo).
 * Aman gagal (mengembalikan { ok: false }), tidak melempar error.
 */
export async function clearReports(): Promise<{ ok: boolean }> {
  try {
    const visitorId = getVisitorId();
    const res = await fetchWithTimeout("/api/reports", {
      method: "DELETE",
      headers: {
        "x-visitor-id": visitorId,
      },
    });

    if (!res.ok) {
      return { ok: false };
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

