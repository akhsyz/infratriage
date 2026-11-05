"use client";

import React, { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import type { Cluster, PriorityLevel, RankedCluster, ScoreContext } from "../../lib/infratriage";
import { computeScore, priorityLevel } from "../../lib/infratriage";
import { vitals } from "../../lib/vitals";
import { useApp, useHighlightIds, useRanked } from "../../lib/store";
import { createClusterIcon } from "./markerIcons";
import { getMarkerRadius } from "./markerStyle";
import { LEVEL_BADGE } from "../../lib/theme";

interface ClusterMarkersProps {
  lastClickedIdRef: React.MutableRefObject<string | null>;
}

interface ClusterMarkerItem {
  cluster: Cluster;
  score: number;
  level: PriorityLevel;
  uniqueReporters: number;
  isResolved: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  lubang: "Lubang jalan",
  drainase: "Drainase",
  lampu_jalan: "Lampu jalan",
  trotoar: "Trotoar",
};

export function ClusterMarkers({ lastClickedIdRef }: ClusterMarkersProps) {
  const { state, dispatch } = useApp();
  const rankedClusters = useRanked();
  const highlightIds = useHighlightIds();

  // Context untuk menghitung skor pada klaster resolved
  const ctx = useMemo<ScoreContext>(
    () => ({
      vitals,
      weights: state.weights,
      now: state.now,
    }),
    [state.weights, state.now]
  );

  // Kumpulkan semua klaster yang relevan:
  // 1. Klaster aktif dari useRanked()
  // 2. Klaster resolved dari state.clusters yang lolos filter kategori & level aktif
  const allMarkerItems = useMemo<ClusterMarkerItem[]>(() => {
    // 1. Klaster aktif dari useRanked()
    const activeItems: ClusterMarkerItem[] = rankedClusters.map((r: RankedCluster) => ({
      cluster: r.cluster,
      score: Math.round(r.detail.urgency),
      level: r.level,
      uniqueReporters: r.detail.uniqueReporters,
      isResolved: false,
    }));

    // 2. Klaster resolved dari state.clusters yang disaring menurut filter aktif
    const resolvedClusters = state.clusters.filter((c) => c.status === "resolved");
    const filteredResolved: ClusterMarkerItem[] = [];

    for (const cl of resolvedClusters) {
      if (!state.filters.categories.includes(cl.category)) continue;

      const scoreDetail = computeScore(cl, ctx);
      const lvl = priorityLevel(scoreDetail.urgency);

      if (state.filters.levels.includes(lvl)) {
        filteredResolved.push({
          cluster: cl,
          score: Math.round(scoreDetail.urgency),
          level: lvl,
          uniqueReporters: scoreDetail.uniqueReporters,
          isResolved: true,
        });
      }
    }

    return [...activeItems, ...filteredResolved];
  }, [rankedClusters, state.clusters, state.filters, ctx]);

  return (
    <>
      {allMarkerItems.map((item) => {
        const { cluster, score, level, uniqueReporters, isResolved } = item;
        const isSelected = state.selectedClusterId === cluster.id;
        const isHighlighted = highlightIds.includes(cluster.id);
        const radius = getMarkerRadius(uniqueReporters);

        const icon = createClusterIcon({
          level,
          status: cluster.status,
          uniqueReporters,
          isSelected,
          isHighlighted,
        });

        const categoryName = CATEGORY_LABEL[cluster.category] ?? cluster.category;
        const levelBadge = LEVEL_BADGE[level];

        return (
          <Marker
            key={cluster.id}
            position={[cluster.lat, cluster.lng]}
            icon={icon}
            eventHandlers={{
              click: () => {
                lastClickedIdRef.current = cluster.id;
                dispatch({ type: "SELECT", payload: cluster.id });
              },
            }}
          >
            {/* Tooltip kartu putih: permanen dan lebih rinci saat terpilih, ringkas saat di-hover */}
            <Tooltip
              direction="top"
              offset={[0, -radius - 4]}
              opacity={1}
              permanent={isSelected}
            >
              {isSelected ? (
                <div className="p-1 min-w-[160px] text-ink font-sans">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-semibold text-muted">
                      {categoryName}
                    </span>
                    <span
                      className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold"
                      style={{
                        backgroundColor: levelBadge.bg,
                        color: levelBadge.ink,
                      }}
                    >
                      {level.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold tabular-nums text-ink leading-none">
                      {score}
                    </span>
                    <span className="text-[11px] text-muted">Skor urgensi</span>
                  </div>

                  <div className="text-[11px] text-muted flex items-center justify-between pt-1 border-t border-border">
                    <span>{uniqueReporters} pelapor unik</span>
                    {cluster.status === "scheduled" && (
                      <span className="font-semibold text-accent">Dijadwalkan</span>
                    )}
                    {isResolved && (
                      <span className="font-semibold text-muted">Selesai</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-0.5 px-1 text-ink font-sans text-[11px]">
                  <span className="font-semibold">{categoryName}</span>
                  <span className="text-muted"> · Skor </span>
                  <span className="font-bold tabular-nums">{score}</span>
                  <span className="text-muted"> ({uniqueReporters} pelapor)</span>
                  {cluster.status === "scheduled" && (
                    <span className="text-accent font-medium"> · Dijadwalkan</span>
                  )}
                  {isResolved && (
                    <span className="text-muted font-medium"> · Selesai</span>
                  )}
                </div>
              )}
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
