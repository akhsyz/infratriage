"use client";

import React, { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import { vitals } from "../../lib/vitals";
import { useApp } from "../../lib/store";
import { getVitalDivIcon } from "./markerIcons";

const VITAL_TYPE_LABEL: Record<string, string> = {
  rumah_sakit: "Rumah sakit",
  sekolah: "Sekolah",
  pasar: "Pasar",
};

export function VitalMarkers() {
  const { state } = useApp();

  // Hanya render jika layer fasilitas vital aktif (default false)
  const isVisible = state.showVitals;

  const markers = useMemo(() => {
    if (!isVisible) return null;

    return vitals.map((item) => {
      const icon = getVitalDivIcon(item.type);
      const typeLabel = VITAL_TYPE_LABEL[item.type] ?? item.type;

      return (
        <Marker
          key={`vital-${item.id}`}
          position={[item.lat, item.lng]}
          icon={icon}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
            <div className="font-sans text-[11px] text-ink py-0.5 px-1 max-w-[200px]">
              <span className="font-semibold block leading-tight">{item.name}</span>
              <span className="text-muted text-[10px]">{typeLabel}</span>
            </div>
          </Tooltip>
        </Marker>
      );
    });
  }, [isVisible]);

  return <>{markers}</>;
}
