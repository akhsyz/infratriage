"use client";

import React, { useEffect, useRef } from "react";
import { useApp, useHighlightIds, useRanked } from "../../lib/store";
import {
  CATEGORY_LABEL,
  SEVERITY_LABEL,
  type Category,
  type PriorityLevel,
} from "../../lib/infratriage";
import { ALL_CATEGORIES, ALL_LEVELS } from "../../lib/reducer";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Filter,
  RotateCcw,
  Sparkles,
  Users,
} from "lucide-react";

const CATEGORY_ITEMS: { key: Category; label: string }[] = [
  { key: "lubang", label: "Lubang" },
  { key: "drainase", label: "Drainase" },
  { key: "lampu_jalan", label: "Lampu" },
  { key: "trotoar", label: "Trotoar" },
];

const LEVEL_ITEMS: {
  key: PriorityLevel;
  label: string;
  pillClass: string;
  dotClass: string;
}[] = [
  {
    key: "kritis",
    label: "Kritis",
    pillClass: "bg-kritis-tint text-kritis-ink border-kritis/40",
    dotClass: "bg-kritis",
  },
  {
    key: "tinggi",
    label: "Tinggi",
    pillClass: "bg-tinggi-tint text-tinggi-ink border-tinggi/40",
    dotClass: "bg-tinggi",
  },
  {
    key: "sedang",
    label: "Sedang",
    pillClass: "bg-sedang-tint text-sedang-ink border-sedang/40",
    dotClass: "bg-sedang",
  },
];

const LEVEL_BADGE_STYLE: Record<
  PriorityLevel,
  { badgeClass: string; textClass: string }
> = {
  kritis: {
    badgeClass: "bg-kritis-tint text-kritis-ink border border-kritis/30",
    textClass: "text-kritis",
  },
  tinggi: {
    badgeClass: "bg-tinggi-tint text-tinggi-ink border border-tinggi/30",
    textClass: "text-tinggi",
  },
  sedang: {
    badgeClass: "bg-sedang-tint text-sedang-ink border border-sedang/30",
    textClass: "text-sedang",
  },
};

export default function RankingTab() {
  const { state, dispatch } = useApp();
  const rankedClusters = useRanked();
  const highlightIds = useHighlightIds();
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-scroll ke item yang dipilih bila pengguna memilih via peta
  useEffect(() => {
    if (state.selectedClusterId && itemRefs.current[state.selectedClusterId]) {
      itemRefs.current[state.selectedClusterId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [state.selectedClusterId]);

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

  const resetFilters = () => {
    dispatch({
      type: "SET_FILTERS",
      payload: {
        categories: [...ALL_CATEGORIES],
        levels: [...ALL_LEVELS],
      },
    });
  };

  const allCategoriesActive =
    state.filters.categories.length === ALL_CATEGORIES.length;
  const allLevelsActive = state.filters.levels.length === ALL_LEVELS.length;
  const hasFilterChanged = !allCategoriesActive || !allLevelsActive;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Area Filter & Header Peringkat ── */}
      <div className="flex flex-col gap-2 rounded-[12px] border border-border bg-surface p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <Filter className="h-3.5 w-3.5 text-accent" />
            <span>Filter Kategori & Prioritas</span>
          </div>
          {hasFilterChanged && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent-hover transition-colors"
              title="Reset semua filter"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Filter Kategori */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_ITEMS.map((cat) => {
            const isActive = state.filters.categories.includes(cat.key);
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => toggleCategory(cat.key)}
                className={`rounded-[8px] px-2.5 py-1 text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-accent text-white shadow-xs"
                    : "bg-bg text-muted border border-border hover:text-ink hover:bg-tint"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Filter Level Prioritas */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/60">
          {LEVEL_ITEMS.map((lvl) => {
            const isActive = state.filters.levels.includes(lvl.key);
            return (
              <button
                key={lvl.key}
                type="button"
                onClick={() => toggleLevel(lvl.key)}
                className={`flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[11px] font-medium transition-all ${
                  isActive
                    ? lvl.pillClass
                    : "bg-bg text-muted border border-border opacity-50 hover:opacity-80"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${lvl.dotClass}`}
                />
                <span className="capitalize">{lvl.label}</span>
              </button>
            );
          })}
        </div>

        {/* Ringkasan Hasil */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-muted">
          <span>Menampilkan titik terurut urgensi</span>
          <span className="font-semibold text-ink tabular-nums">
            {rankedClusters.length} titik aktif
          </span>
        </div>
      </div>

      {/* ── Kondisi Kosong (Empty State) ── */}
      {rankedClusters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-border bg-tint/50 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border text-muted mb-2">
            <Filter className="h-5 w-5" />
          </div>
          <p className="text-xs font-medium text-ink">
            Tidak ada klaster yang sesuai filter
          </p>
          <p className="mt-1 text-[11px] text-muted max-w-xs">
            Coba aktifkan kembali filter kategori atau level prioritas di atas
            untuk menampilkan daftar klaster.
          </p>
          {hasFilterChanged && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 rounded-[8px] bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-accent-hover transition-colors"
            >
              Tampilkan Semua Titik
            </button>
          )}
        </div>
      ) : (
        /* ── Daftar Klaster Terurut (Ranked List) ── */
        <div className="flex flex-col gap-2">
          {rankedClusters.map((item, index) => {
            const isSelected = state.selectedClusterId === item.cluster.id;
            const isBudgetHighlighted = highlightIds.includes(item.cluster.id);
            const badgeStyle = LEVEL_BADGE_STYLE[item.level];
            const roundedScore = Math.round(item.detail.urgency);

            return (
              <div
                key={item.cluster.id}
                ref={(el) => {
                  itemRefs.current[item.cluster.id] = el;
                }}
                onClick={() =>
                  dispatch({ type: "SELECT", payload: item.cluster.id })
                }
                className={`relative flex flex-col gap-1.5 rounded-[12px] p-3 transition-all cursor-pointer ${
                  isSelected
                    ? "border-2 border-accent bg-accent-soft/30 shadow-xs ring-2 ring-accent/20"
                    : "border border-border bg-surface hover:border-border-input hover:bg-tint/70"
                }`}
              >
                {/* Baris Atas: Nomor Urut, Badge Level, Skor Besar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-[6px] bg-bg border border-border text-[11px] font-bold text-muted tabular-nums">
                      #{index + 1}
                    </span>
                    <span
                      className={`rounded-[6px] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider capitalize ${badgeStyle.badgeClass}`}
                    >
                      {item.level}
                    </span>
                    {item.cluster.status === "scheduled" && (
                      <span className="flex items-center gap-1 rounded-[6px] border border-border bg-bg px-1.5 py-0.5 text-[10px] font-medium text-muted">
                        <Calendar className="h-3 w-3" />
                        Terjadwal
                      </span>
                    )}
                  </div>

                  {/* Skor Urgensi */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] font-medium text-muted uppercase">
                      Skor
                    </span>
                    <span
                      className={`text-lg font-bold tabular-nums leading-none ${badgeStyle.textClass}`}
                    >
                      {roundedScore}
                    </span>
                  </div>
                </div>

                {/* Baris Tengah: Kategori & Kelas Jalan */}
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-xs font-semibold text-ink">
                    {CATEGORY_LABEL[item.cluster.category]}
                  </span>
                  <span className="text-[11px] font-medium text-muted capitalize">
                    Ruas {item.detail.roadClass} · Tingkat{" "}
                    {SEVERITY_LABEL[item.detail.severity]}
                  </span>
                </div>

                {/* Baris Bawah: Metadata Pelapor & Insiden */}
                <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-border/50 text-[11px] text-muted">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium text-ink-2">
                      <Users className="h-3 w-3 text-muted" />
                      <span>{item.detail.uniqueReporters} pelapor unik</span>
                    </span>
                    {item.detail.hasIncident && (
                      <span className="flex items-center gap-1 font-semibold text-kritis">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Ada insiden</span>
                      </span>
                    )}
                  </div>

                  {/* Sorotan Rekomendasi Anggaran Aktif */}
                  {isBudgetHighlighted && (
                    <span className="flex items-center gap-1 rounded-[6px] bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      <Sparkles className="h-2.5 w-2.5" />
                      <span>Rekomendasi anggaran</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
