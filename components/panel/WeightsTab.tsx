"use client";

import React, { useDeferredValue, useMemo } from "react";
import { useApp } from "../../lib/store";
import {
  DEFAULT_WEIGHTS,
  rankingStability,
  type ScoreContext,
  type Weights,
} from "../../lib/infratriage";
import { vitals } from "../../lib/vitals";
import {
  Activity,
  CheckCircle2,
  HelpCircle,
  Info,
  RotateCcw,
  Sliders,
} from "lucide-react";

const WEIGHT_CONFIG: {
  key: keyof Weights;
  label: string;
  sublabel: string;
  defaultValue: number;
}[] = [
  {
    key: "bahaya",
    label: "Tingkat Kerusakan",
    sublabel: "Kategori & keparahan kerusakan fisik jalan",
    defaultValue: 0.3,
  },
  {
    key: "kelas",
    label: "Klasifikasi Jalan",
    sublabel: "Volume lalu lintas (Arteri > Kolektor > Lokal)",
    defaultValue: 0.2,
  },
  {
    key: "vital",
    label: "Fasilitas Vital",
    sublabel: "Kedekatan dengan rumah sakit, sekolah, atau pasar",
    defaultValue: 0.2,
  },
  {
    key: "kerumunan",
    label: "Dukungan Kerumunan",
    sublabel: "Jumlah pelapor independen yang memvalidasi titik",
    defaultValue: 0.2,
  },
  {
    key: "usia",
    label: "Usia Laporan",
    sublabel: "Lama waktu masalah belum tertangani",
    defaultValue: 0.1,
  },
];

export default function WeightsTab() {
  const { state, dispatch } = useApp();

  // Optimasi performa: gunakan useDeferredValue agar drag slider terasa instan (<100ms)
  // dan perhitungan sensitivitas (rankingStability) tidak memblokir render utama.
  const deferredWeights = useDeferredValue(state.weights);

  // Periksa apakah bobot saat ini sama dengan bawaan
  const isDefault = useMemo(() => {
    return (
      Math.abs(state.weights.bahaya - DEFAULT_WEIGHTS.bahaya) < 0.001 &&
      Math.abs(state.weights.kelas - DEFAULT_WEIGHTS.kelas) < 0.001 &&
      Math.abs(state.weights.vital - DEFAULT_WEIGHTS.vital) < 0.001 &&
      Math.abs(state.weights.kerumunan - DEFAULT_WEIGHTS.kerumunan) < 0.001 &&
      Math.abs(state.weights.usia - DEFAULT_WEIGHTS.usia) < 0.001
    );
  }, [state.weights]);

  // Handler geser slider
  const handleSliderChange = (key: keyof Weights, valuePct: number) => {
    const val = Math.max(0, Math.min(100, valuePct)) / 100;
    dispatch({
      type: "SET_WEIGHT",
      payload: { key, value: val },
    });
  };

  // Reset bobot ke default
  const handleReset = () => {
    dispatch({ type: "RESET_WEIGHTS" });
  };

  // Kalkulasi analisis sensitivitas (rankingStability delta 20%, k 10)
  const stability = useMemo(() => {
    const ctx: ScoreContext = {
      vitals,
      weights: deferredWeights,
      now: state.now,
    };
    return rankingStability(state.clusters, ctx, { delta: 0.2, k: 10 });
  }, [state.clusters, deferredWeights, state.now]);

  // Penjelasan awam untuk analisis sensitivitas
  const stabilityInsight = useMemo(() => {
    if (!stability || !stability.mostSensitive) {
      return "Data klaster belum cukup untuk mengukur stabilitas peringkat.";
    }

    const mostSensitiveConfig = WEIGHT_CONFIG.find(
      (c) => c.key === stability.mostSensitive
    );
    const sensitiveName = mostSensitiveConfig?.label ?? stability.mostSensitive;
    const overlapPct = Math.round(stability.avgTopKOverlap * 100);

    if (overlapPct >= 80) {
      return `Peringkat prioritas sangat stabil. Pergeseran bobot ±20% mempertahankan rata-rata ${overlapPct}% klaster di 10 besar. Kriteria yang paling memengaruhi pergeseran urutan adalah "${sensitiveName}".`;
    }
    if (overlapPct >= 65) {
      return `Peringkat prioritas cukup stabil. Sekitar ${overlapPct}% klaster di 10 besar tetap bertahan jika bobot digeser ±20%, dengan kriteria "${sensitiveName}" sebagai faktor yang paling sensitif.`;
    }
    return `Peringkat prioritas tergolong sensitif terhadap perubahan asumsi. Pergeseran bobot ±20% mengubah komposisi 10 besar menjadi ${overlapPct}%, terutama dipengaruhi oleh kriteria "${sensitiveName}".`;
  }, [stability]);

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1. Header & Kontrol Slider Bobot ── */}
      <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
            <Sliders className="h-4 w-4 text-accent" />
            <span>Bobot Kriteria Prioritas</span>
          </div>

          {!isDefault && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 rounded-[6px] bg-bg border border-border px-2 py-1 text-[11px] font-semibold text-accent hover:bg-tint hover:border-accent/40 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Bawaan</span>
            </button>
          )}
        </div>

        <p className="text-xs text-muted leading-relaxed">
          Menggeser salah satu slider akan menskalakan 4 kriteria lainnya secara
          proporsional sehingga jumlah total bobot selalu 100%. Peringkat,
          warna klaster, dan rekomendasi anggaran akan terhitung ulang secara
          instan.
        </p>

        {/* Daftar 5 Slider */}
        <div className="flex flex-col gap-3.5 pt-1">
          {WEIGHT_CONFIG.map((item) => {
            const currentPct = Math.round(state.weights[item.key] * 100);
            return (
              <div key={item.key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-ink">{item.label}</span>
                    <p className="text-[11px] text-muted">{item.sublabel}</p>
                  </div>
                  <span className="rounded-[6px] bg-bg border border-border px-2 py-0.5 text-xs font-bold text-accent tabular-nums">
                    {currentPct}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={currentPct}
                    onChange={(e) =>
                      handleSliderChange(item.key, Number(e.target.value))
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-track accent-accent transition-all"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Indikator Total Bobot */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
          <span className="font-medium text-muted">Total Jumlah Bobot:</span>
          <span className="flex items-center gap-1 font-bold text-accent tabular-nums">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>100% (Tervalidasi Proporsional)</span>
          </span>
        </div>
      </div>

      {/* ── 2. Kartu Uji Stabilitas Peringkat (rankingStability) ── */}
      <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
            <Activity className="h-4 w-4 text-accent" />
            <span>Uji Stabilitas Peringkat (Sensitivitas)</span>
          </div>
          <span className="rounded-[6px] bg-bg border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted">
            Asumsi
          </span>
        </div>

        <p className="text-[11px] text-muted leading-relaxed">
          Menguji seberapa kokoh peringkat 10 besar bila setiap kriteria digeser
          sebesar <strong>±20%</strong> dari konfigurasi saat ini.
        </p>

        {/* 3 Indikator Sensitivitas Utama */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          {/* 1. Irisan Top-10 */}
          <div className="flex flex-col rounded-[10px] bg-bg border border-border p-2.5">
            <span className="text-[10px] font-medium text-muted leading-tight">
              Irisan Top-10
            </span>
            <span className="text-base font-extrabold text-accent tabular-nums mt-1">
              {(stability.avgTopKOverlap * 100).toFixed(0)}%
            </span>
            <span className="text-[9px] text-muted mt-0.5">Rata-rata</span>
          </div>

          {/* 2. Korelasi Spearman */}
          <div className="flex flex-col rounded-[10px] bg-bg border border-border p-2.5">
            <span className="text-[10px] font-medium text-muted leading-tight">
              Spearman Rank
            </span>
            <span className="text-base font-extrabold text-ink tabular-nums mt-1">
              {stability.avgSpearman.toFixed(2)}
            </span>
            <span className="text-[9px] text-muted mt-0.5">Skala -1..+1</span>
          </div>

          {/* 3. Paling Sensitif */}
          <div className="flex flex-col rounded-[10px] bg-bg border border-border p-2.5">
            <span className="text-[10px] font-medium text-muted leading-tight">
              Paling Sensitif
            </span>
            <span className="text-xs font-bold text-tinggi-ink truncate mt-1 capitalize">
              {stability.mostSensitive
                ? WEIGHT_CONFIG.find((c) => c.key === stability.mostSensitive)
                    ?.label ?? stability.mostSensitive
                : "-"}
            </span>
            <span className="text-[9px] text-muted mt-0.5">Faktor pengubah</span>
          </div>
        </div>

        {/* Penjelasan Kalimat Awam */}
        <div className="flex items-start gap-2 rounded-[10px] bg-tint/80 border border-border/80 p-3 text-xs leading-relaxed text-ink-2">
          <Info className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
          <p>{stabilityInsight}</p>
        </div>
      </div>

      {/* ── 3. Catatan Asumsi & Transparansi ── */}
      <div className="flex items-start gap-2 rounded-[10px] border border-border/80 bg-tint/60 p-3 text-[11px] text-muted leading-relaxed">
        <HelpCircle className="h-4 w-4 text-muted flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-ink font-semibold">Catatan transparansi:</strong>{" "}
          Bobot awal disusun berdasarkan pola AHP studi perbaikan jalan di
          Indonesia (mengutamakan tingkat kerusakan dan kelas jalan), namun
          tetap merupakan asumsi prototipe yang belum divalidasi dinas resmi.
        </p>
      </div>

      {/* Catatan integritas kanal resmi */}
      <p className="text-[12px] text-muted text-center">
        Prototipe pendukung keputusan, bukan pengganti kanal laporan resmi.
      </p>
    </div>
  );
}
