import L from "leaflet";

/* A pin drawn with CSS so we avoid Leaflet's broken default icon in Vite */
export const pinIcon = L.divIcon({
  className: "pin-wrap",
  html: '<div class="pin"><div class="pin-dot"></div></div>',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

const CHECK =
  '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2.5 6.5l2.2 2.2L9.5 3.8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* numbered stop marker. state: "todo" | "next" | "done" */
export const stopIcon = (n, state = "todo") =>
  L.divIcon({
    className: "stop-pin-wrap",
    html: `<div class="stop-pin stop-pin--${state}">${state === "done" ? CHECK : n}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });