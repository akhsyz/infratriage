"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { Cluster } from "../../lib/infratriage";

interface MapControllerProps {
  selectedCluster: Cluster | null;
  lastClickedIdRef: React.MutableRefObject<string | null>;
}

/**
 * Pengendali internal peta Leaflet:
 * 1. Menjaga ukuran peta tetap akurat saat layout berubah (ResizeObserver -> invalidateSize)
 * 2. Melakukan flyTo halus ke klaster terpilih tanpa perulangan/loop saat dipilih dari panel
 */
export function MapController({
  selectedCluster,
  lastClickedIdRef,
}: MapControllerProps) {
  const map = useMap();
  const prevSelectedIdRef = useRef<string | null>(null);

  // ResizeObserver: memanggil map.invalidateSize() saat kontainer berubah ukuran
  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);

  // flyTo saat klaster terpilih berubah dari luar (panel atau demo)
  useEffect(() => {
    if (!selectedCluster) {
      prevSelectedIdRef.current = null;
      return;
    }

    const clusterId = selectedCluster.id;

    // Bila pemilihan berasal dari klik marker peta sendiri, hindari flyTo
    if (lastClickedIdRef.current === clusterId) {
      lastClickedIdRef.current = null;
      prevSelectedIdRef.current = clusterId;
      return;
    }

    if (prevSelectedIdRef.current === clusterId) {
      return;
    }
    prevSelectedIdRef.current = clusterId;

    const targetLatLng = L.latLng(selectedCluster.lat, selectedCluster.lng);
    const center = map.getCenter();

    // Jangan gerakkan peta jika titik sudah terlihat di tengah (jarak < 200 m)
    if (center.distanceTo(targetLatLng) < 200) {
      return;
    }

    map.flyTo(targetLatLng, Math.max(map.getZoom(), 14), {
      duration: 0.6,
    });
  }, [selectedCluster, map, lastClickedIdRef]);

  return null;
}
