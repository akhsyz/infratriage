"use client";

import React, { useState } from "react";
import type { Category, LatLng, RoadClass, Severity } from "../lib/infratriage";
import {
  CATEGORY_LABEL,
  ROAD_CLASS_LABEL,
  SEVERITY_LABEL,
  isReportFormValid,
  type ReportFormData,
} from "./map/reportDraft";
import { MapPin, X } from "lucide-react";

interface AddReportFormProps {
  point: LatLng;
  onSubmit: (data: ReportFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CATEGORIES: Category[] = ["lubang", "drainase", "lampu_jalan", "trotoar"];
const SEVERITIES: Severity[] = [1, 2, 3];
const ROAD_CLASSES: RoadClass[] = ["arteri", "kolektor", "lokal"];

export default function AddReportForm({
  point,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AddReportFormProps) {
  const [category, setCategory] = useState<Category>("lubang");
  const [severity, setSeverity] = useState<Severity>(2);
  const [roadClass, setRoadClass] = useState<RoadClass>("arteri");
  const [incident, setIncident] = useState<boolean>(false);
  const [reporterId, setReporterId] = useState<string>("pelapor-ui-1");
  const [note, setNote] = useState<string>("");
  const [localSubmitting, setLocalSubmitting] = useState<boolean>(false);

  const disabled = isSubmitting || localSubmitting;

  const currentForm: ReportFormData = {
    category,
    severity,
    roadClass,
    incident,
    reporterId,
    note,
  };

  const isValid = isReportFormValid(currentForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || disabled) return;

    setLocalSubmitting(true);
    onSubmit(currentForm);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="add-report-title"
      className="pointer-events-auto w-full max-w-[340px] sm:max-w-[360px] rounded-[16px] border border-border bg-surface/95 backdrop-blur-xs p-4 shadow-card text-ink font-sans transition-all duration-200"
    >
      {/* ── Header Form ── */}
      <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="add-report-title" className="text-sm font-bold text-ink leading-tight">
              Tambah laporan baru
            </h2>
            <span className="rounded-[4px] bg-accent-soft px-1.5 py-0.5 text-[9px] font-semibold text-accent uppercase tracking-wider">
              Simulasi
            </span>
          </div>
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
          className="rounded-[10px] p-1.5 text-muted hover:text-ink hover:bg-tint transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
          aria-label="Tutup form laporan"
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-[10px] text-muted bg-tint rounded-[6px] p-2 border border-border/60 leading-tight mb-3">
        <strong>Mode Simulator Pengujian:</strong> Di sistem produksi publik, kelas jalan & ID pelapor divalidasi otomatis oleh sistem via GIS spasial dan akun terdaftar.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
                  className={`rounded-[10px] px-2.5 py-2 text-[12px] transition-all text-left flex items-center justify-between min-h-[42px] cursor-pointer ${
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
                  className={`flex-1 rounded-[8px] py-1.5 text-[12px] transition-all text-center min-h-[36px] cursor-pointer ${
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
        </div>

        {/* ── Kelas Jalan ── */}
        <div>
          <label className="block text-[12px] font-medium text-muted leading-tight mb-1.5">
            Kelas jalan
          </label>
          <div className="flex rounded-[10px] bg-tint p-1 gap-1 border border-border">
            {ROAD_CLASSES.map((rc) => {
              const active = roadClass === rc;
              return (
                <button
                  key={rc}
                  type="button"
                  onClick={() => setRoadClass(rc)}
                  disabled={disabled}
                  className={`flex-1 rounded-[8px] py-1.5 text-[12px] transition-all text-center capitalize min-h-[36px] cursor-pointer ${
                    active
                      ? "bg-accent-soft text-accent border border-accent font-semibold"
                      : "text-muted hover:text-ink font-medium"
                  }`}
                >
                  {ROAD_CLASS_LABEL[rc].replace("Jalan ", "")}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Insiden / Kejadian ── */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            id="report-incident"
            type="checkbox"
            checked={incident}
            onChange={(e) => setIncident(e.target.checked)}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 rounded border-border-input text-accent accent-accent focus:ring-accent"
          />
          <label
            htmlFor="report-incident"
            className="text-[12px] text-ink font-medium leading-tight cursor-pointer select-none"
          >
            Pernah menimbulkan insiden / kecelakaan
          </label>
        </div>

        {/* ── ID Pelapor ── */}
        <div>
          <label
            htmlFor="report-reporterId"
            className="block text-[12px] font-medium text-muted leading-tight mb-1.5"
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
            className="w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-[12px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent min-h-[42px]"
          />
          <p className="mt-1 text-[11px] text-muted leading-tight">
            Ubah ID untuk mensimulasikan pelapor baru atau warga berulang
          </p>
        </div>

        {/* ── Tombol Aksi ── */}
        <div className="flex items-center gap-2 pt-2 border-t border-border mt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="flex-1 rounded-[12px] border border-border bg-surface px-3 py-2.5 text-[12px] font-medium text-ink hover:bg-tint transition-all min-h-[42px] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!isValid || disabled}
            className={`flex-1 rounded-[12px] px-3 py-2.5 text-[12px] font-semibold text-white shadow-xs transition-all min-h-[42px] flex items-center justify-center gap-1.5 ${
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
