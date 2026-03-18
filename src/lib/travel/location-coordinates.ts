export type Coordinates = {
  lat: number;
  lng: number;
};

// Keep keys exactly aligned with bracket gameInfo.location values.
// Add or adjust values here when bracket sites change.
export const LOCATION_COORDS_BY_LABEL: Record<string, Coordinates> = {
  "Dayton, OH": { lat: 39.7589, lng: -84.1916 },
  "Greenville, SC": { lat: 34.8526, lng: -82.394 },
  "San Diego, CA": { lat: 32.7157, lng: -117.1611 },
  "Buffalo, NY": { lat: 42.8864, lng: -78.8784 },
  "Philadelphia, PA": { lat: 39.9526, lng: -75.1652 },
  "Washington, DC": { lat: 38.9072, lng: -77.0369 },
  "Portland, OR": { lat: 45.5152, lng: -122.6784 },
  "St. Louis, MO": { lat: 38.627, lng: -90.1994 },
  "San Jose, CA": { lat: 37.3382, lng: -121.8863 },
  "Tampa, FL": { lat: 27.9506, lng: -82.4572 },
  "Oklahoma City, OK": { lat: 35.4676, lng: -97.5164 },
  "Houston, TX": { lat: 29.7604, lng: -95.3698 },
  "Chicago, IL": { lat: 41.8781, lng: -87.6298 },
  "Indianapolis, IN": { lat: 39.7684, lng: -86.1581 },
};

export function getLocationCoordinates(locationLabel: string | null | undefined): Coordinates | null {
  if (!locationLabel) {
    return null;
  }

  return LOCATION_COORDS_BY_LABEL[locationLabel.trim()] ?? null;
}
