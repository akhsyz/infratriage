import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import {
  isValidUuidV4,
  MAX_BODY_BYTES,
  MAX_REPORTS_PER_VISITOR,
  validateReportInput,
} from "../../../lib/reportValidation";
import type { Category, Report, RoadClass, Severity } from "../../../lib/infratriage/types";
import type { PersistedReport } from "../../../lib/photoUtils";

// Next.js 16 dengan Cache Components: Route Handler dinamis secara otomatis saat membaca request.headers
interface DatabaseReportRow {
  id: string;
  visitor_id: string;
  report_id: string;
  category: string;
  severity: number;
  road_class: string;
  has_incident: boolean;
  reporter_id: string;
  lat: number;
  lng: number;
  created_at: string;
  inserted_at: string;
  note: string | null;
  photo_path?: string | null;
}

function mapRowToReport(row: DatabaseReportRow): PersistedReport {
  return {
    id: row.report_id,
    reporterId: row.reporter_id,
    category: row.category as Category,
    severity: row.severity as Severity,
    roadClass: row.road_class as RoadClass,
    incident: Boolean(row.has_incident),
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
    hasPhoto: Boolean(row.photo_path && row.photo_path.trim().length > 0),
    ...(row.note ? { note: row.note } : {}),
  };
}

/**
 * GET: Ambil seluruh laporan milik pengunjung (berdasarkan header x-visitor-id).
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

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return Response.json(
        { error: "Layanan database tidak tersedia" },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("visitor_id", visitorId)
      .order("created_at", { ascending: true });

    if (error) {
      return Response.json(
        { error: "Gagal mengambil data laporan" },
        { status: 503 }
      );
    }

    const reports: Report[] = (data as DatabaseReportRow[]).map(mapRowToReport);
    return Response.json({ reports }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Terjadi kesalahan internal pada server" },
      { status: 503 }
    );
  }
}

/**
 * POST: Simpan satu laporan baru untuk pengunjung saat ini.
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

    // Periksa ukuran body payload
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).length > MAX_BODY_BYTES) {
      return Response.json(
        { error: "Ukuran data payload melebihi batas maksimum" },
        { status: 413 }
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(bodyText);
    } catch {
      return Response.json(
        { error: "Format payload bukan JSON yang valid" },
        { status: 400 }
      );
    }

    // Validasi struktur masukan
    const validation = validateReportInput(json);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const report = validation.data;

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return Response.json(
        { error: "Layanan database tidak tersedia" },
        { status: 503 }
      );
    }

    // Cek batas maksimum laporan per pengunjung
    const { count, error: countError } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("visitor_id", visitorId);

    if (countError) {
      return Response.json(
        { error: "Gagal memeriksa kuota laporan" },
        { status: 503 }
      );
    }

    if (count !== null && count >= MAX_REPORTS_PER_VISITOR) {
      return Response.json(
        {
          error: `Batas maksimal ${MAX_REPORTS_PER_VISITOR} laporan per pengunjung telah tercapai`,
        },
        { status: 429 }
      );
    }

    // Simpan ke tabel public.reports
    const { error: insertError } = await supabase.from("reports").insert({
      visitor_id: visitorId,
      report_id: report.id,
      category: report.category,
      severity: report.severity,
      road_class: report.roadClass,
      has_incident: Boolean(report.incident),
      reporter_id: report.reporterId,
      lat: report.lat,
      lng: report.lng,
      created_at: report.createdAt,
      note: report.note ?? null,
    });

    if (insertError) {
      // Bila id laporan sama sudah ada untuk visitor ini (unique constraint), anggap sukses idempoten
      if (insertError.code === "23505") {
        return Response.json({ ok: true, report, duplicate: true }, { status: 200 });
      }
      return Response.json(
        { error: "Gagal menyimpan laporan ke database" },
        { status: 503 }
      );
    }

    return Response.json({ ok: true, report }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Terjadi kesalahan internal pada server" },
      { status: 503 }
    );
  }
}

/**
 * DELETE: Hapus seluruh laporan milik pengunjung (saat reset demo).
 */
export async function DELETE(request: Request) {
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

    // Hapus seluruh foto milik pengunjung di Supabase Storage bucket 'report-photos'
    try {
      const { data: fileList } = await supabase.storage
        .from("report-photos")
        .list(visitorId);

      if (fileList && fileList.length > 0) {
        const filesToRemove = fileList.map((f) => `${visitorId}/${f.name}`);
        await supabase.storage.from("report-photos").remove(filesToRemove);
      }
    } catch {
      // Abaikan kegagalan storage agar penghapusan data baris tetap berlanjut
    }

    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("visitor_id", visitorId);

    if (error) {
      return Response.json(
        { error: "Gagal menghapus data laporan" },
        { status: 503 }
      );
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Terjadi kesalahan internal pada server" },
      { status: 503 }
    );
  }
}

