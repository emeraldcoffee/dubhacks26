export const MI_TO_M = 1609.34;
const EARTH_M = 6371000;
const STREET_FACTOR = 1.25; // straight-line distance underestimates walking distance

const rad = (d) => (d * Math.PI) / 180;

/* a and b are { lat, lng } */
export function metersBetween(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(h));
}

/* Nearest-neighbor route from `start`. If firstId is given, that stop goes first. */
export function orderStops(start, stops, firstId = null) {
  const remaining = [...stops];
  const route = [];
  let cur = start;

  if (firstId != null) {
    const i = remaining.findIndex((s) => s.id === firstId);
    if (i >= 0) {
      const [first] = remaining.splice(i, 1);
      route.push(first);
      cur = first;
    }
  }
  while (remaining.length) {
    let best = 0;
    let bestDist = Infinity;
    remaining.forEach((s, i) => {
      const d = metersBetween(cur, s);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    const [next] = remaining.splice(best, 1);
    route.push(next);
    cur = next;
  }
  return route;
}

export function routeMiles(start, ordered) {
  let total = 0;
  let cur = start;
  for (const s of ordered) {
    total += metersBetween(cur, s);
    cur = s;
  }
  return (total * STREET_FACTOR) / MI_TO_M;
}

export const WALK_MIN_PER_MI = 17;

/* walking miles between two { lat, lng } points */
export const legMiles = (a, b) => (metersBetween(a, b) * STREET_FACTOR) / MI_TO_M;

/* current position as { lat, lng }, or null if unavailable or denied */
export function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}