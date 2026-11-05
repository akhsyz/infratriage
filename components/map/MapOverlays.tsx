"use client";

import React from "react";
import type { AppAction, AppState } from "../../lib/reducer";
import type { Category, PriorityLevel } from "../../lib/infratriage";
import { LEVEL_COLOR, VITAL_COLOR } from "../../lib/theme";
import { Building2, Check, Layers } from "lucide-react";

interface MapOverlaysProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "lubang", label: "Lubang jalan" },
  { key: "drainase", label: "Drainase" },
  { key: "lampu_jalan", label: "Lampu jalan" },
  { key: "trotoar", label: "Trotoar" },
];

const LEVELS: { key: PriorityLevel; label: string; scoreLabel: string }[] = [
  { key: "kritis", label: "Kritis", scoreLabel: "≥ 80" },
  { key: "tinggi", label: "Tinggi", scoreLabel: "50–79" },
  { key: "sedang", label: "Sedang", scoreLabel: "< 50" },
];

export function MapOverlays({ state, dispatch }: MapOverlaysProps) {
  const toggleCategory = (cat: Category) => {
    const current = state.filters.categories;
    const next = current.includes(cat)
      ? current.length > 1
        ? current.filter((c) => c !== cat)
        : current
      : [...current, cat];
    dispatch({ type: "SET_FILTERS", payload: { categories: next } });
  };

  const toggleLevel = (lvl: PriorityLevel) => {
    const current = state.filters.levels;
    const next = current.includes(lvl)
      ? current.length > 1
        ? current.filter((l) => l !== lvl)
        : current
      : [...current, lvl];
    dispatch({ type: "SET_FILTERS", payload: { levels: next } });
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[500] p-3 flex flex-col justify-between overflow-hidden">
      {/* ── Baris Atas ── */}
      <div className="flex items-start justify-between gap-3">
        {/* Kiri Atas: Filter Kategori & Level */}
        <div className="pointer-events-auto rounded-[12px] border border-border bg-surface p-2.5 shadow-sm text-ink max-w-sm flex flex-col gap-2">
          {/* Filter Kategori */}
          <div>
            <span className="block text-[11px] font-medium text-muted leading-tight mb-1.5">
              Kategori infrastruktur
            </span>
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map(({ key, label }) => {
                const isActive = state.filters.categories.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleCategory(key)}
                    className={`rounded-[8px] px-2 py-1 text-[12px] font-medium transition-all ${
                      isActive
                        ? "bg-accent text-white shadow-xs"
                        : "bg-tint text-muted hover:text-ink hover:bg-tint-2"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Level */}
          <div className="border-t border-border pt-2">
            <span className="block text-[11px] font-medium text-muted leading-tight mb-1.5">
              Tingkat prioritas
            </span>
            <div className="flex flex-wrap gap-1">
              {LEVELS.map(({ key, label }) => {
                const isActive = state.filters.levels.includes(key);
                const color = LEVEL_COLOR[key].marker;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleLevel(key)}
                    className={`flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12px] font-medium transition-all ${
                      isActive
                        ? "bg-accent text-white shadow-xs"
                        : "bg-tint text-muted hover:text-ink hover:bg-tint-2"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kanan Atas: Toggle Fasilitas Vital (disiapkan ruang untuk tombol Tambah Laporan di T6) */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Tombol Tambah Laporan di T6 akan ditaruh di sini */}
          <button
            type="button"
            onClick={() => dispatch({ type: "TOGGLE_VITALS" })}
            className={`flex items-center gap-2 rounded-[12px] border px-3 py-2 text-[12px] font-medium shadow-sm transition-all ${
              state.showVitals
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-surface text-ink hover:bg-tint"
            }`}
            aria-pressed={state.showVitals}
          >
            <Building2 className="h-4 w-4 shrink-0 text-accent" />
            <span>Fasilitas vital</span>
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                state.showVitals
                  ? "bg-accent text-white"
                  : "bg-track text-muted"
              }`}
            >
              {state.showVitals ? <Check className="h-3 w-3" /> : null}
            </span>
          </button>
        </div>
      </div>

      {/* ── Baris Bawah: Legenda di Kiri Bawah ── */}
      <div className="flex items-end justify-between">
        <div className="pointer-events-auto rounded-[12px] border border-border bg-surface p-2.5 shadow-sm text-ink max-w-[220px]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Layers className="h-3.5 w-3.5 text-muted" />
            <span className="text-[11px] font-medium text-muted">
              Legenda prioritas
            </span>
          </div>

          <div className="flex flex-col gap-1.5 text-[12px]">
            {LEVELS.map(({ key, label, scoreLabel }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 border border-white"
                    style={{ backgroundColor: LEVEL_COLOR[key].marker }}
                  />
                  <span className="font-medium text-ink">{label}</span>
                </div>
                <span className="text-muted text-[11px] tabular-nums font-medium">
                  {scoreLabel}
                </span>
              </div>
            ))}

            <div className="text-[11px] text-muted leading-tight pt-1 border-t border-border">
              Ukuran lingkaran: jumlah pelapor
            </div>

            {/* Bentuk fasilitas vital bila layer diaktifkan */}
            {state.showVitals && (
              <div className="pt-1.5 border-t border-border flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted">
                  Fasilitas vital
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px] border border-white"
                    style={{ backgroundColor: VITAL_COLOR.rumah_sakit }}
                  />
                  <span className="text-[11px]">Rumah sakit (kotak)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-white"
                    style={{ backgroundColor: VITAL_COLOR.sekolah }}
                  />
                  <span className="text-[11px]">Sekolah (lingkaran)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rotate-45 rounded-[1px] border border-white ml-0.5"
                    style={{ backgroundColor: VITAL_COLOR.pasar }}
                  />
                  <span className="text-[11px]">Pasar (belah ketupat)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
