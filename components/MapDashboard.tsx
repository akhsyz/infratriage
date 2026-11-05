"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useApp } from "../lib/store";
import { MAP_TILE } from "../lib/theme";
import type { LatLng } from "../lib/infratriage";
import { MapController } from "./map/MapController";
import { ClusterMarkers } from "./map/ClusterMarkers";
import { VitalMarkers } from "./map/VitalMarkers";
import { MapOverlays } from "./map/MapOverlays";
import { getTempReportDivIcon } from "./map/markerIcons";
import { buildUiReport, type ReportFormData } from "./map/reportDraft";

/**
 * Handler klik peta menggunakan useMapEvents dari react-leaflet.
 * Hanya aktif jika state.addMode bernilai true.
 */
function MapClickHandler({
  addMode,
  onMapClick,
}: {
  addMode: boolean;
  onMapClick: (point: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (addMode) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

export default function MapDashboard() {
  const { state, dispatch } = useApp();
  const lastClickedIdRef = useRef<string | null>(null);

  // Titik sementara laporan disimpan sebagai state lokal (kontrak state reducer tetap beku)
  const [tempPoint, setTempPoint] = useState<LatLng | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Titik tengah Kota Yogyakarta
  const position: [number, number] = [-7.7956, 110.3695];

  const selectedCluster = useMemo(() => {
    if (!state.selectedClusterId) return null;
    return state.clusters.find((c) => c.id === state.selectedClusterId) ?? null;
  }, [state.selectedClusterId, state.clusters]);

  // Handler klik peta / titik
  const handlePointPlace = useCallback(
    (point: LatLng) => {
      if (state.addMode) {
        setTempPoint(point);
      }
    },
    [state.addMode]
  );

  // Batalkan mode tambah laporan & bersihkan titik sementara
  const handleCancelAddMode = useCallback(() => {
    dispatch({ type: "SET_ADD_MODE", payload: false });
    setTempPoint(null);
  }, [dispatch]);

  // Toggle mode tambah laporan
  const handleToggleAddMode = useCallback(() => {
    if (state.addMode) {
      handleCancelAddMode();
    } else {
      dispatch({ type: "SET_ADD_MODE", payload: true });
    }
  }, [state.addMode, handleCancelAddMode, dispatch]);

  // Submit form laporan
  const handleFormSubmit = useCallback(
    (formData: ReportFormData) => {
      if (!tempPoint || isSubmitting) return;

      setIsSubmitting(true);
      const report = buildUiReport(formData, tempPoint, state.now, state.reports);

      // Ingest ke state store (reducer otomatis menghasilkan toast & memperbarui klaster)
      dispatch({ type: "INGEST", payload: report });

      // Tutup mode tambah laporan & bersihkan titik sementara
      dispatch({ type: "SET_ADD_MODE", payload: false });
      setTempPoint(null);
      setIsSubmitting(false);
    },
    [tempPoint, isSubmitting, state.now, state.reports, dispatch]
  );

  // Keyboard shortcut: tombol Escape membatalkan mode tambah laporan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state.addMode) {
        handleCancelAddMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.addMode, handleCancelAddMode]);

  const tempIcon = useMemo(() => getTempReportDivIcon(), []);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-bg ${
        state.addMode
          ? "cursor-crosshair [&_.leaflet-container]:!cursor-crosshair [&_.leaflet-interactive]:!cursor-crosshair"
          : ""
      }`}
    >
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

        <MapClickHandler
          addMode={state.addMode}
          onMapClick={handlePointPlace}
        />

        <ClusterMarkers
          lastClickedIdRef={lastClickedIdRef}
          onPointClick={handlePointPlace}
        />

        <VitalMarkers />

        {/* Marker titik laporan sementara */}
        {tempPoint && (
          <Marker
            position={[tempPoint.lat, tempPoint.lng]}
            icon={tempIcon}
            zIndexOffset={1000}
          />
        )}
      </MapContainer>

      {/* Floating overlays: filter, tombol tambah laporan & toggle vital, form tambah, legenda */}
      <MapOverlays
        state={state}
        dispatch={dispatch}
        onToggleAddMode={handleToggleAddMode}
        onCancelAddMode={handleCancelAddMode}
        tempPoint={tempPoint}
        onFormSubmit={handleFormSubmit}
        onFormCancel={handleCancelAddMode}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
