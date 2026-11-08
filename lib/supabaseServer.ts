import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Mengembalikan instance SupabaseClient untuk operasi server menggunakan secret key.
 * Mengembalikan null jika kredensial lingkungan (SUPABASE_URL atau SUPABASE_SECRET_KEY) belum disetel.
 * Hanya boleh diimpor dan dipanggil di lingkungan server (Route Handler).
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    return null;
  }

  try {
    return createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch {
    return null;
  }
}

