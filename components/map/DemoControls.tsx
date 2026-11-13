"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../lib/store";
import { computeScore, priorityLevel, type ScoreContext } from "../../lib/infratriage";
import { vitals } from "../../lib/vitals";
import { LEVEL_BADGE, LEVEL_COLOR } from "../../lib/theme";
import { buildDemoReports, DEMO_ANCHOR_SITE } from "../../lib/demo";
import { clearReports } from "../../lib/persistence";
import { FastForward, Pause, Play, RotateCcw, Sparkles } from "lucide-react";

export default function DemoControls() {
  const { state, dispatch } = useApp();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cari klaster demo di state saat ini
  const demoCluster = useMemo(() => {
    if (state.demo.targetClusterId) {
      const found = state.clusters.find((c) => c.id === state.demo.targetClusterId);
      if (found) return found;
    }
    // Cari klaster yang memuat laporan berawalan "demo-"
    return (
      state.clusters.find((c) =>
        c.reports.some((r) => r.reporterId.startsWith("demo-"))
      ) ?? null
    );
  }, [state.clusters, state.demo.targetClusterId]);

  // Context perhitungan skor terkini
  const ctx = useMemo<ScoreContext>(
    () => ({
      vitals,
      weights: state.weights,
      now: state.now,
    }),
    [state.weights, state.now]
  );

  // Hitung skor klaster demo secara dinamis langsung dari mesin
  const { score, level, uniqueReporters } = useMemo(() => {
    if (!demoCluster) {
      return { score: null, level: null, uniqueReporters: 0 };
    }
    const detail = computeScore(demoCluster, ctx);
    const s = Math.round(detail.urgency);
    const l = priorityLevel(detail.urgency);
    return {
      score: s,
      level: l,
      uniqueReporters: detail.uniqueReporters,
    };
  }, [demoCluster, ctx]);

  // Informasi lokasi fasilitas vital untuk demo (titik jangkar deterministik tetap)
  const demoSiteInfo = DEMO_ANCHOR_SITE;

  // Siapkan laporan demo deterministik untuk 10 pelapor di titik jangkar tetap
  const demoReports = useMemo(() => {
    return buildDemoReports(10, state.now, DEMO_ANCHOR_SITE.site);
  }, [state.now]);

  // Hentikan timer saat komponen unmount atau saat demo selesai
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Hentikan timer otomatis bila sudah mencapai 10 pelapor
  useEffect(() => {
    if (state.demo.step >= 10 && isRunning) {
      stopTimer();
    }
  }, [state.demo.step, isRunning, stopTimer]);

  // Aksi: Mulai Skenario Demo
  const handleStartScenario = () => {
    // Idempoten: abaikan jika sedang auto-running atau dalam proses (step 1..9)
    if (isRunning) return;
    if (state.demo.active && state.demo.step >= 1 && state.demo.step < 10) return;

    stopTimer();

    // Jika skenario sebelumnya sudah selesai atau ada laporan demo yang tersisa, bersihkan dulu
    const hasDemoReports = state.reports.some(
      (r) => r.reporterId?.startsWith("demo-") || r.id?.startsWith("demo-")
    );
    if (hasDemoReports || state.demo.step >= 10) {
      dispatch({ type: "DEMO_RESET" });
    }

    // 1. Ingest laporan demo pertama
    dispatch({ type: "INGEST", payload: demoReports[0] });

    // 2. Dispatch DEMO_START
    dispatch({
      type: "DEMO_START",
    });
  };

  // Aksi: Tambah Pelapor Bertahap (Jeda / Lanjutkan)
  const handleToggleAutoStep = () => {
    if (isRunning) {
      stopTimer();
      return;
    }

    // Jika belum mulai sama sekali, mulai dari awal
    if (!state.demo.active || state.demo.step === 0) {
      handleStartScenario();
      return;
    }

    if (state.demo.step >= 10) return;

    setIsRunning(true);
  };

  // Efek interval untuk penambahan pelapor bertahap tiap ~600 ms
  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      const currentStep = state.demo.step;
      if (currentStep >= 10) {
        stopTimer();
        return;
      }

      const nextIndex = currentStep;
      if (nextIndex < demoReports.length) {
        dispatch({
          type: "DEMO_ADD_REPORTER",
          payload: demoReports[nextIndex],
        });
      }
    }, 600);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, state.demo.step, demoReports, dispatch, stopTimer]);

  // Aksi: Reset Data Demo
  const handleResetDemo = () => {
    stopTimer();
    dispatch({ type: "RESET" });
    clearReports();
  };

  // Kalkulasi cincin skor SVG
  const ringSize = 84;
  const strokeWidth = 6;
  const center = ringSize / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const displayScore = score ?? 0;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const strokeColor = level
    ? LEVEL_COLOR[level].marker
    : "var(--muted)";

  const badgeInfo = level ? LEVEL_BADGE[level] : null;

  return (
    <div
      role="region"
      aria-label="Panel Skenario Demo"
      className="pointer-events-auto rounded-[16px] border border-border bg-surface/95 backdrop-blur-xs p-3.5 shadow-card text-ink font-sans w-[290px] sm:w-[315px] animate-in fade-in slide-in-from-bottom-2"
    >
      {/* Header Panel */}
      <div className="flex flex-col border-b border-border pb-2.5 mb-3 gap-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="text-xs font-bold text-ink leading-tight">
              Skenario demo
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-accent">
            63 (Tinggi) → 81 (Kritis)
          </span>
        </div>
        {/* Nama dan Jarak Fasilitas Vital Nyata */}
        <p className="text-[11px] text-muted leading-tight truncate">
          Dekat {demoSiteInfo.vital.name} · {Math.round(demoSiteInfo.distanceToVital)} m
        </p>
      </div>

      {/* Tampilan Cincin Skor & Informasi Level */}
      <div className="flex items-center gap-3.5 mb-3.5">
        {/* Cincin SVG Skor */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg
            width={ringSize}
            height={ringSize}
            className="transform -rotate-90"
            aria-hidden="true"
          >
            {/* Background Track */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--track)"
              strokeWidth={strokeWidth}
            />
            {/* Progress Stroke */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-350 ease-out motion-reduce:transition-none"
            />
          </svg>

          {/* Angka Skor Besar 34px Tabular di Tengah Cincin */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[32px] font-bold tabular-nums text-ink leading-none">
              {score !== null ? score : "—"}
            </span>
          </div>
        </div>

        {/* Informasi Level & Pelapor */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {badgeInfo && level ? (
              <span
                className="rounded-[8px] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                style={{
                  backgroundColor: badgeInfo.bg,
                  color: badgeInfo.ink,
                }}
              >
                {level === "kritis" ? "Kritis" : "Tinggi"}
              </span>
            ) : (
              <span className="rounded-[8px] bg-tint px-2 py-0.5 text-[11px] font-medium text-muted">
                Belum dimulai
              </span>
            )}
          </div>

          <div className="text-[12px] font-semibold text-ink tabular-nums">
            {state.demo.active
              ? `Pelapor ${uniqueReporters} dari 10`
              : "Siap disimulasikan"}
          </div>

          <p className="text-[11px] text-muted leading-tight">
            {state.demo.step >= 10
              ? "Prioritas berubah menjadi kritis!"
              : "Validasi warga menaikkan urgensi"}
          </p>
        </div>
      </div>

      {/* Tombol Kontrol Aksi Demo */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          {/* Tombol Mulai Skenario */}
          <button
            type="button"
            onClick={handleStartScenario}
            disabled={isRunning || (state.demo.active && state.demo.step < 10)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-[12px] px-2.5 py-2 text-[12px] font-semibold transition-all shadow-xs min-h-[40px] ${
              isRunning || (state.demo.active && state.demo.step < 10)
                ? "border border-border bg-tint text-muted cursor-not-allowed opacity-60"
                : "bg-accent text-white hover:bg-accent-hover cursor-pointer"
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Mulai</span>
          </button>

          {/* Tombol Tambah Pelapor Bertahap / Jeda */}
          <button
            type="button"
            onClick={handleToggleAutoStep}
            disabled={!state.demo.active || state.demo.step >= 10}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-[12px] border px-2.5 py-2 text-[12px] font-semibold transition-all shadow-xs min-h-[40px] ${
              !state.demo.active || state.demo.step >= 10
                ? "border-border bg-tint text-muted cursor-not-allowed opacity-60"
                : isRunning
                ? "border-accent bg-accent-soft text-accent hover:bg-accent/20 cursor-pointer"
                : "border-border bg-surface text-ink hover:bg-tint cursor-pointer"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>Jeda</span>
              </>
            ) : (
              <>
                <FastForward className="h-3.5 w-3.5" />
                <span>Bertahap</span>
              </>
            )}
          </button>
        </div>

        {/* Tombol Reset Data Demo */}
        <button
          type="button"
          onClick={handleResetDemo}
          className="w-full flex items-center justify-center gap-1.5 rounded-[10px] border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-muted hover:text-ink hover:bg-tint transition-all min-h-[34px] cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset data demo</span>
        </button>
      </div>
    </div>
  );
}
