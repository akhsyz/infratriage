"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Category, LatLng, Severity } from "../lib/infratriage";
import { saveReport, useLocalModeStatus } from "../lib/persistence";
import {
  compressPhotoInBrowser,
  setPhotoStatus,
  uploadReportPhoto,
  type SupportedPhotoExt,
} from "../lib/photos";
import { useApp } from "../lib/store";
import {
  buildUiReport,
  CATEGORY_LABEL,
  getNextUiReporterId,
  isReportFormValid,
  mapRoadTypeToClass,
  ROAD_TYPE_OPTIONS,
  RoadTypeChoice,
  SEVERITY_DESCRIPTION,
  SEVERITY_LABEL,
  type ReportFormData,
} from "./map/reportDraft";
import { ChevronDown, Loader2, MapPin, Trash2, X } from "lucide-react";

interface AddReportFormProps {
  point: LatLng;
  onSubmit: (data: ReportFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CATEGORIES: Category[] = ["lubang", "drainase", "lampu_jalan", "trotoar"];
const SEVERITIES: Severity[] = [1, 2, 3];

export default function AddReportForm({
  point,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AddReportFormProps) {
  const { state } = useApp();

  const [category, setCategory] = useState<Category>("lubang");
  const [severity, setSeverity] = useState<Severity>(2);
  const [roadType, setRoadType] = useState<RoadTypeChoice>("tidak_yakin");
  const [incident, setIncident] = useState<boolean>(false);
  const [reporterId, setReporterId] = useState<string>(() =>
    getNextUiReporterId(state.reports)
  );
  const [showSimOptions, setShowSimOptions] = useState<boolean>(false);
  const [note] = useState<string>("");
  const [localSubmitting, setLocalSubmitting] = useState<boolean>(false);

  const isLocalMode = useLocalModeStatus();
  const [selectedPhoto, setSelectedPhoto] = useState<{
    blob: Blob;
    ext: SupportedPhotoExt;
    previewUrl: string;
  } | null>(null);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (selectedPhoto?.previewUrl) {
        URL.revokeObjectURL(selectedPhoto.previewUrl);
      }
    };
  }, [selectedPhoto]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);
    setCompressing(true);

    try {
      const compressed = await compressPhotoInBrowser(file);
      if (selectedPhoto?.previewUrl) {
        URL.revokeObjectURL(selectedPhoto.previewUrl);
      }
      const previewUrl = URL.createObjectURL(compressed.blob);
      setSelectedPhoto({
        blob: compressed.blob,
        ext: compressed.ext,
        previewUrl,
      });
    } catch (err) {
      if (selectedPhoto?.previewUrl) {
        URL.revokeObjectURL(selectedPhoto.previewUrl);
      }
      setSelectedPhoto(null);
      setPhotoError(
        err instanceof Error
          ? err.message
          : "Gagal memproses foto. Silakan coba lagi."
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setCompressing(false);
    }
  };

  const handleRemovePhoto = () => {
    if (selectedPhoto?.previewUrl) {
      URL.revokeObjectURL(selectedPhoto.previewUrl);
    }
    setSelectedPhoto(null);
    setPhotoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const disabled = isSubmitting || localSubmitting;

  const roadClass = mapRoadTypeToClass(roadType);

  const currentForm: ReportFormData = {
    category,
    severity,
    roadClass,
    incident,
    reporterId: reporterId.trim(),
    note,
  };

  const isValid = isReportFormValid(currentForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || disabled || compressing) return;

    setLocalSubmitting(true);
    const report = buildUiReport(currentForm, point, state.now, state.reports);

    // Laporan DISIMPAN DULU seperti sekarang (INGEST + saveReport)
    onSubmit(currentForm);
    setReporterId(getNextUiReporterId([...state.reports, report]));

    const photoToUpload = selectedPhoto;

    // Unggah foto di latar belakang, kegagalan unggah TIDAK PERNAH menggagalkan atau menunda laporan
    void (async () => {
      try {
        const saveRes = await saveReport(report);
        if (photoToUpload) {
          if (!saveRes.ok) {
            setPhotoStatus(report.id, "failed");
            return;
          }
          setPhotoStatus(report.id, "uploading");
          const uploadOk = await uploadReportPhoto(
            report.id,
            photoToUpload.blob,
            photoToUpload.ext
          );
          setPhotoStatus(report.id, uploadOk ? "done" : "failed");
        }
      } catch {
        if (photoToUpload) {
          setPhotoStatus(report.id, "failed");
        }
      }
    })();
  };

  return (
    <div
      role="dialog"
      aria-labelledby="add-report-title"
      className="pointer-events-auto flex flex-col w-full max-w-[340px] sm:max-w-[360px] max-h-full sm:max-h-[calc(100dvh-120px)] rounded-[16px] border border-border bg-surface shadow-card text-ink font-sans overflow-hidden transition-all duration-200 motion-reduce:transition-none"
    >
      {/* ── Header Form (Tetap di atas) ── */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-4 py-3 bg-surface">
        <div>
          <h2 id="add-report-title" className="text-sm font-bold text-ink leading-tight">
            Tambah laporan baru
          </h2>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted tabular-nums">
            <MapPin className="h-3 w-3 text-accent shrink-0" />
            <span>
              {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[10px] p-1.5 text-muted hover:text-ink hover:bg-tint transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Tutup form laporan"
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Form: Wrapper Flex Mengisi Sisa Ruang ── */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* ── Isi Formulir (Tengah, Bisa Digulir) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3.5 overscroll-contain">
          {/* ── Kategori Masalah ── */}
          <div>
            <label className="block text-[12px] font-medium text-muted leading-tight mb-1.5">
              Kategori masalah
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    disabled={disabled}
                    className={`rounded-[10px] px-2.5 py-2 text-[12px] transition-all duration-200 motion-reduce:transition-none text-left flex items-center justify-between min-h-[44px] cursor-pointer ${
                      active
                        ? "bg-accent-soft text-accent border border-accent font-semibold"
                        : "bg-surface border border-border-input text-muted hover:text-ink hover:bg-tint font-medium"
                    }`}
                  >
                    <span>{CATEGORY_LABEL[cat]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Tingkat Keparahan ── */}
          <div>
            <label className="block text-[12px] font-medium text-muted leading-tight mb-1.5">
              Tingkat keparahan
            </label>
            <div className="flex rounded-[10px] bg-tint p-1 gap-1 border border-border">
              {SEVERITIES.map((sev) => {
                const active = severity === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    disabled={disabled}
                    className={`flex-1 rounded-[8px] py-1.5 text-[12px] transition-all duration-200 motion-reduce:transition-none text-center min-h-[44px] cursor-pointer flex items-center justify-center ${
                      active
                        ? "bg-accent-soft text-accent border border-accent font-semibold"
                        : "text-muted hover:text-ink font-medium"
                    }`}
                  >
                    {sev} · {SEVERITY_LABEL[sev]}
                  </button>
                );
              })}
            </div>
            {/* Penjelas Bahasa Awam */}
            <div className="mt-1.5 rounded-[8px] bg-tint border border-border/60 p-2 text-[11px] text-ink-2 font-medium leading-tight">
              {SEVERITY_DESCRIPTION[severity]}
            </div>
          </div>

          {/* ── Jenis Jalan di Lokasi (Kelas Jalan) ── */}
          <div>
            <label className="block text-[12px] font-medium text-muted leading-tight mb-1.5">
              Jenis jalan di lokasi
            </label>
            <div className="flex flex-col gap-1.5">
              {ROAD_TYPE_OPTIONS.map((opt) => {
                const active = roadType === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRoadType(opt.key)}
                    disabled={disabled}
                    className={`rounded-[10px] px-3 py-2 text-left transition-all duration-200 motion-reduce:transition-none min-h-[44px] cursor-pointer flex flex-col justify-center ${
                      active
                        ? "bg-accent-soft text-accent border border-accent font-semibold"
                        : "bg-surface border border-border-input text-muted hover:text-ink hover:bg-tint font-medium"
                    }`}
                  >
                    <span className="text-[12px] leading-tight text-ink font-medium">
                      {opt.title}{" "}
                      {opt.key !== "tidak_yakin" && (
                        <span className="text-muted font-normal">
                          ({opt.example})
                        </span>
                      )}
                    </span>
                    {opt.key === "tidak_yakin" && (
                      <span className="text-[10.5px] text-muted font-normal mt-0.5">
                        Dianggap jalan lingkungan (nilai konservatif)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Insiden / Kejadian ── */}
          <div className="flex items-start gap-2.5 pt-1 min-h-[44px]">
            <input
              id="report-incident"
              type="checkbox"
              checked={incident}
              onChange={(e) => setIncident(e.target.checked)}
              disabled={disabled}
              className="mt-1 h-4 w-4 rounded border-border-input text-accent accent-accent focus:ring-accent"
            />
            <label
              htmlFor="report-incident"
              className="text-[12px] text-ink font-medium leading-tight cursor-pointer select-none py-1"
            >
              Pernah menimbulkan insiden / kecelakaan
            </label>
          </div>

          {/* ── Foto Bukti (Opsional secara perilaku) ── */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="report-photo"
                className="block text-[12px] font-medium text-muted leading-tight"
              >
                Foto bukti
              </label>
              {selectedPhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={disabled}
                  className="text-[11px] text-kritis hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Hapus foto</span>
                </button>
              )}
            </div>

            {selectedPhoto ? (
              <div className="relative flex items-center gap-2.5 rounded-[10px] border border-border bg-tint p-2">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[8px] border border-border-input bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedPhoto.previewUrl}
                    alt="Pratinjau foto bukti"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-ink truncate">
                    Foto siap diunggah
                  </span>
                  <span className="text-[10.5px] text-muted tabular-nums">
                    Format: {selectedPhoto.ext.toUpperCase()} (
                    {(selectedPhoto.blob.size / 1024).toFixed(0)} KB)
                  </span>
                  <span className="text-[10px] text-muted italic mt-0.5">
                    Metadata EXIF telah dibersihkan
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <input
                  ref={fileInputRef}
                  id="report-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={disabled || isLocalMode || compressing}
                  className="block w-full text-[11px] text-muted file:mr-2.5 file:py-1.5 file:px-3 file:rounded-[8px] file:border file:border-border file:text-[11px] file:font-semibold file:bg-surface file:text-ink hover:file:bg-tint file:cursor-pointer cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {isLocalMode && (
                  <p className="text-[11px] text-amber-700 font-medium leading-tight">
                    Foto membutuhkan koneksi server
                  </p>
                )}
                {compressing && (
                  <div className="flex items-center gap-1.5 text-[11px] text-accent font-medium mt-0.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Mengompresi foto...</span>
                  </div>
                )}
                {photoError && (
                  <p className="text-[11px] text-kritis font-medium leading-tight mt-0.5">
                    {photoError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Bagian Lipat: Opsi Simulasi (Tertutup Bawaan) ── */}
          <div className="border-t border-border/80 pt-1 pb-1">
            <button
              type="button"
              onClick={() => setShowSimOptions((prev) => !prev)}
              className="flex items-center justify-between w-full text-left py-2 px-1 text-[12px] font-semibold text-muted hover:text-ink transition-colors min-h-[44px] cursor-pointer"
              aria-expanded={showSimOptions}
            >
              <span>Opsi simulasi</span>
              <ChevronDown
                className={`h-4 w-4 text-muted transition-transform duration-200 motion-reduce:transition-none ${
                  showSimOptions ? "rotate-180" : ""
                }`}
              />
            </button>

            {showSimOptions && (
              <div className="flex flex-col gap-2 pt-1 pb-1">
                <div>
                  <label
                    htmlFor="report-reporterId"
                    className="block text-[12px] font-medium text-muted leading-tight mb-1"
                  >
                    ID pelapor
                  </label>
                  <input
                    id="report-reporterId"
                    type="text"
                    value={reporterId}
                    onChange={(e) => setReporterId(e.target.value)}
                    disabled={disabled}
                    placeholder="pelapor-ui-1"
                    className="w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-[12px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px]"
                  />
                  <p className="mt-1.5 text-[11px] text-muted leading-tight">
                    Isi ID yang sama untuk mensimulasikan pelapor yang sama; laporan berulang dari pelapor yang sama tidak menaikkan jumlah pelapor unik.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Tombol Aksi (Sticky Footer di dasar panel) ── */}
        <div className="shrink-0 flex items-center gap-2 p-3 sm:px-4 sm:py-3.5 border-t border-border bg-surface shadow-[0_-4px_12px_rgba(15,23,42,0.03)]">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="flex-1 rounded-[12px] border border-border bg-surface px-3 py-2.5 text-[12px] font-medium text-ink hover:bg-tint transition-all duration-200 motion-reduce:transition-none min-h-[44px] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!isValid || disabled}
            className={`flex-1 rounded-[12px] px-3 py-2.5 text-[12px] font-semibold text-white shadow-xs transition-all duration-200 motion-reduce:transition-none min-h-[44px] flex items-center justify-center gap-1.5 ${
              !isValid || disabled
                ? "bg-muted cursor-not-allowed opacity-60"
                : "bg-accent hover:bg-accent-hover cursor-pointer"
            }`}
          >
            {disabled ? "Mengirim..." : "Kirim laporan"}
          </button>
        </div>
      </form>
    </div>
  );
}
