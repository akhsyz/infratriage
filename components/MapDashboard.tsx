"use client";

import React, { useMemo, useRef } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useApp } from "../lib/store";
import { MAP_TILE } from "../lib/theme";
import { MapController } from "./map/MapController";
import { ClusterMarkers } from "./map/ClusterMarkers";
import { VitalMarkers } from "./map/VitalMarkers";
import { MapOverlays } from "./map/MapOverlays";

export default function MapDashboard() {
  const { state, dispatch } = useApp();
  const lastClickedIdRef = useRef<string | null>(null);

  // Titik tengah Kota Yogyakarta
  const position: [number, number] = [-7.7956, 110.3695];

  const selectedCluster = useMemo(() => {
    if (!state.selectedClusterId) return null;
    return state.clusters.find((c) => c.id === state.selectedClusterId) ?? null;
  }, [state.selectedClusterId, state.clusters]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full z-0 font-sans"
      >
        <TileLayer
          url={MAP_TILE.url}
          attribution={MAP_TILE.attribution}
          maxZoom={19}
        />

        <MapController
          selectedCluster={selectedCluster}
          lastClickedIdRef={lastClickedIdRef}
        />

        <ClusterMarkers lastClickedIdRef={lastClickedIdRef} />
        <VitalMarkers />
      </MapContainer>

      {/* Floating overlays: filter kategori & level, toggle vital, legenda */}
      <MapOverlays state={state} dispatch={dispatch} />
    </div>
  );
}
