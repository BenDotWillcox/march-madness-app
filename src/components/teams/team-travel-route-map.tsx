"use client";

import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { TeamTravelStop } from "@/lib/travel/team-travel";

type TeamTravelRouteMapProps = {
  stops: TeamTravelStop[];
  activeStopIndex: number;
};

const defaultCenter: LatLngExpression = [39.5, -98.35];

export function TeamTravelRouteMap({ stops, activeStopIndex }: TeamTravelRouteMapProps) {
  const clampedActiveStopIndex = Math.max(0, Math.min(activeStopIndex, Math.max(0, stops.length - 1)));
  const visibleStops = stops.slice(0, clampedActiveStopIndex + 1);
  const coordinates = visibleStops
    .map((stop) => (stop.coord ? ([stop.coord.lat, stop.coord.lng] as LatLngExpression) : null))
    .filter((entry): entry is LatLngExpression => Boolean(entry));

  const completeLegs: LatLngExpression[][] = [];
  let latestLeg: LatLngExpression[] | null = null;
  for (let index = 1; index <= clampedActiveStopIndex; index += 1) {
    const from = stops[index - 1];
    const to = stops[index];
    if (!from?.coord || !to?.coord) {
      continue;
    }
    const positions: LatLngExpression[] = [
      [from.coord.lat, from.coord.lng],
      [to.coord.lat, to.coord.lng],
    ];
    if (index === clampedActiveStopIndex) {
      latestLeg = positions;
    } else {
      completeLegs.push(positions);
    }
  }

  const center = coordinates[0] ?? defaultCenter;

  return (
    <div className="h-[22rem] overflow-hidden rounded-md border">
      <MapContainer center={center} zoom={4} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {completeLegs.map((leg, index) => (
          <Polyline key={`leg-${index}`} positions={leg} pathOptions={{ color: "#f97316", weight: 4 }} />
        ))}
        {latestLeg ? (
          <Polyline positions={latestLeg} pathOptions={{ color: "#2563eb", weight: 5, dashArray: "8 8" }} />
        ) : null}
        {visibleStops.map((stop, index) =>
          stop.coord ? (
            <CircleMarker
              key={stop.id}
              center={[stop.coord.lat, stop.coord.lng]}
              radius={index === clampedActiveStopIndex ? 8 : 6}
              pathOptions={{
                color: "#ffffff",
                fillColor: index === clampedActiveStopIndex ? "#f97316" : "#2563eb",
                fillOpacity: 0.95,
                weight: 2,
              }}
            >
              <Tooltip direction="top">
                {index + 1}. {stop.label}
              </Tooltip>
            </CircleMarker>
          ) : null,
        )}
      </MapContainer>
    </div>
  );
}
