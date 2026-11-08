-- Skema database Supabase PostgreSQL untuk penyimpanan laporan per pengunjung (Fase 1)
-- Dijalankan secara manual oleh pemilik proyek melalui SQL Editor di Dashboard Supabase.

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL,
  report_id text NOT NULL,
  category text NOT NULL,
  severity integer NOT NULL,
  road_class text NOT NULL,
  has_incident boolean NOT NULL DEFAULT false,
  reporter_id text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  created_at timestamptz NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  note text,

  -- Batasan nilai yang diizinkan (integritas data)
  CONSTRAINT reports_category_check CHECK (category IN ('lubang', 'drainase', 'lampu_jalan', 'trotoar')),
  CONSTRAINT reports_severity_check CHECK (severity IN (1, 2, 3)),
  CONSTRAINT reports_road_class_check CHECK (road_class IN ('arteri', 'kolektor', 'lokal')),
  CONSTRAINT reports_visitor_report_unique UNIQUE (visitor_id, report_id)
);

-- Komentar dokumentasi per kolom sesuai spesifikasi types.ts
COMMENT ON TABLE public.reports IS 'Penyimpanan laporan kiriman pengunjung per visitor_id';
COMMENT ON COLUMN public.reports.id IS 'Primary key UUID baris data database';
COMMENT ON COLUMN public.reports.visitor_id IS 'ID unik peramban pengunjung (UUID v4)';
COMMENT ON COLUMN public.reports.report_id IS 'ID laporan di aplikasi (misal ui-1, ui-2)';
COMMENT ON COLUMN public.reports.category IS 'Kategori masalah (lubang, drainase, lampu_jalan, trotoar)';
COMMENT ON COLUMN public.reports.severity IS 'Tingkat keparahan kerusakan (1 = ringan, 2 = sedang, 3 = berat)';
COMMENT ON COLUMN public.reports.road_class IS 'Klasifikasi jalan (arteri, kolektor, lokal)';
COMMENT ON COLUMN public.reports.has_incident IS 'Menandakan adanya insiden atau kecelakaan di titik laporan';
COMMENT ON COLUMN public.reports.reporter_id IS 'ID pelapor (misal pelapor-ui-1)';
COMMENT ON COLUMN public.reports.lat IS 'Koordinat latitude';
COMMENT ON COLUMN public.reports.lng IS 'Koordinat longitude';
COMMENT ON COLUMN public.reports.created_at IS 'Waktu laporan dibuat (ISO 8601 string dari createdAt)';
COMMENT ON COLUMN public.reports.inserted_at IS 'Waktu pencatatan baris ke database Supabase';
COMMENT ON COLUMN public.reports.note IS 'Catatan opsional dari pelapor';

-- Indeks performa pencarian berdasarkan visitor_id
CREATE INDEX IF NOT EXISTS idx_reports_visitor_id ON public.reports (visitor_id);

-- Row Level Security diaktifkan tanpa policy publik
-- Seluruh akses data hanya melalui server Route Handler menggunakan SUPABASE_SECRET_KEY
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Izin hanya untuk server (kunci rahasia). Pengunjung/anon tidak diberi akses langsung.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON TABLE public.reports TO service_role;
