import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { isValidUuidV4 } from "../../../../lib/reportValidation";
import {
  buildPhotoStoragePath,
  detectPhotoMimeTypeFromBytes,
  MAX_PHOTOS_PER_VISITOR,
  SERVER_MAX_PHOTO_BYTES,
} from "../../../../lib/photoUtils";

/**
 * GET: Mengambil signed URL sementara (10 menit) untuk foto laporan milik pengunjung.
 * Query parameter: ?reportId=<id>
 * Header wajib: x-visitor-id (UUID v4)
 */
export async function GET(request: Request) {
  try {
    const visitorId = request.headers.get("x-visitor-id");
    if (!visitorId || !isValidUuidV4(visitorId)) {
      return Response.json(
        { error: "Header x-visitor-id tidak valid atau tidak ditemukan" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");
    if (!reportId || reportId.trim().length === 0) {
      return Response.json(
        { error: "Parameter reportId diperlukan" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return Response.json(
        { error: "Layanan database tidak tersedia" },
        { status: 503 }
      );
    }

    // Ambil photo_path hanya untuk laporan milik visitor ini
    const { data: reportRow, error: reportErr } = await supabase
      .from("reports")
      .select("photo_path")
      .eq("visitor_id", visitorId)
      .eq("report_id", reportId.trim())
      .maybeSingle();

    if (reportErr || !reportRow || !reportRow.photo_path) {
      return Response.json(
        { error: "Foto laporan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Buat signed URL berumur 10 menit (600 detik)
    const { data: signedData, error: signErr } = await supabase.storage
      .from("report-photos")
      .createSignedUrl(reportRow.photo_path, 600);

    if (signErr || !signedData?.signedUrl) {
      return Response.json(
        { error: "Gagal membuat tautan akses foto" },
        { status: 503 }
      );
    }

    return Response.json(
      { signedUrl: signedData.signedUrl },
      { status: 200 }
    );
  } catch {
    return Response.json(
      { error: "Terjadi kesalahan internal pada server" },
      { status: 503 }
    );
  }
}

/**
 * POST: Mengunggah file foto bukti untuk laporan yang sudah tersimpan.
 * Body: FormData (file, reportId)
 * Header wajib: x-visitor-id (UUID v4)
 */
export async function POST(request: Request) {
  try {
    const visitorId = request.headers.get("x-visitor-id");
    if (!visitorId || !isValidUuidV4(visitorId)) {
      return Response.json(
        { error: "Header x-visitor-id tidak valid atau tidak ditemukan" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return Response.json(
        { error: "Layanan database tidak tersedia" },
        { status: 503 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json(
        { error: "Format request harus multipart/form-data" },
        { status: 400 }
      );
    }

    const reportIdRaw = formData.get("reportId");
    if (typeof reportIdRaw !== "string" || reportIdRaw.trim().length === 0) {
      return Response.json(
        { error: "Field reportId diperlukan" },
        { status: 400 }
      );
    }
    const reportId = reportIdRaw.trim();

    // 1. Validasi: reportId milik visitor itu dan ada di tabel (jika tidak: 404)
    const { data: reportRow, error: reportErr } = await supabase
      .from("reports")
      .select("id, photo_path")
      .eq("visitor_id", visitorId)
      .eq("report_id", reportId)
      .maybeSingle();

    if (reportErr || !reportRow) {
      return Response.json(
        { error: "Laporan tidak ditemukan" },
        { status: 404 }
      );
    }

    // 2. Validasi file: harus ada, ukuran <= 2 MB
    const file = formData.get("file");
    if (!file || !(file instanceof Blob) || file.size === 0) {
      return Response.json(
        { error: "File foto tidak ditemukan atau kosong" },
        { status: 400 }
      );
    }

    if (file.size > SERVER_MAX_PHOTO_BYTES) {
      return Response.json(
        { error: "Ukuran foto melebihi batas maksimum 2 MB" },
        { status: 413 }
      );
    }

    // 3. Validasi tipe ditentukan dari magic bytes (hanya JPEG dan WebP)
    const arrayBuffer = await file.arrayBuffer();
    const detected = detectPhotoMimeTypeFromBytes(new Uint8Array(arrayBuffer));
    if (!detected) {
      return Response.json(
        { error: "Tipe file tidak didukung. Hanya JPEG dan WebP yang diizinkan." },
        { status: 400 }
      );
    }

    // 4. Validasi kuota: maksimal 10 foto per visitor (selebihnya 429)
    // Jika laporan ini belum punya foto, periksa total laporan berfoto milik visitor
    if (!reportRow.photo_path) {
      const { count, error: countErr } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("visitor_id", visitorId)
        .not("photo_path", "is", null);

      if (countErr) {
        return Response.json(
          { error: "Gagal memeriksa kuota foto" },
          { status: 503 }
        );
      }

      if (count !== null && count >= MAX_PHOTOS_PER_VISITOR) {
        return Response.json(
          {
            error: `Batas maksimal ${MAX_PHOTOS_PER_VISITOR} foto per pengunjung telah tercapai`,
          },
          { status: 429 }
        );
      }
    }

    // 5. Unggah ke bucket "report-photos" pada path `${visitorId}/${reportId}.${ext}` (upsert)
    const path = buildPhotoStoragePath(visitorId, reportId, detected.ext);
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadErr } = await supabase.storage
      .from("report-photos")
      .upload(path, buffer, {
        contentType: detected.mime,
        upsert: true,
      });

    if (uploadErr) {
      return Response.json(
        { error: "Gagal mengunggah foto ke penyimpanan" },
        { status: 503 }
      );
    }

    // 6. Set reports.photo_path di database
    const { error: updateErr } = await supabase
      .from("reports")
      .update({ photo_path: path })
      .eq("visitor_id", visitorId)
      .eq("report_id", reportId);

    if (updateErr) {
      return Response.json(
        { error: "Gagal memperbarui data laporan" },
        { status: 503 }
      );
    }

    return Response.json(
      { ok: true, photoPath: path },
      { status: 200 }
    );
  } catch {
    return Response.json(
      { error: "Terjadi kesalahan internal pada server" },
      { status: 503 }
    );
  }
}
