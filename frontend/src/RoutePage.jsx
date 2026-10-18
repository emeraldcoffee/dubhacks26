import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Award, Check, Crosshair, Navigation, Sparkles, X } from "lucide-react";
import AppShell, { PageHeader } from "./AppShell";
import { useCheckIn } from "./useCheckIn";
import { WALK_MIN_PER_MI, getPosition, legMiles, orderStops, routeMiles } from "./geo";
import { iconFor, labelFor } from "./helpers";
import { pinIcon, stopIcon } from "./mapIcons";
import "./RoutePage.css";

/* zooms the map so the whole route is visible */
function FitRoute({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    try {
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28], animate: false, maxZoom: 16 });
    } catch (err) {
      console.warn("fitBounds failed", err);
    }
  }, [points, map]);
  return null;
}

const directionsUrl = (s) =>
  `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=walking`;

function legText(miles) {
  if (miles > 20) return "far from you";
  return `${miles.toFixed(1)} mi · ${Math.max(1, Math.round(miles * WALK_MIN_PER_MI))} min`;
}

export default function RoutePage({ user, crawl, serverError, onCrawlChange, onNavigate }) {
  const { checkIn, busy, message } = useCheckIn({ user, crawl, onCrawlChange, serverError });
  const [note, setNote] = useState("");
  const [rerouting, setRerouting] = useState(false);

  const stops = useMemo(() => crawl?.stops ?? [], [crawl]);
  const start = crawl?.start ?? stops[0];

  /* walking distance from the previous point (the start, then each earlier stop) */
  const legs = useMemo(() => {
    let prev = start;
    return stops.map((s) => {
      const miles = prev ? legMiles(prev, s) : 0;
      prev = s;
      return miles;
    });
  }, [stops, start]);

  const totalMiles = legs.reduce((sum, m) => sum + m, 0);
  const totalMinutes = Math.round(totalMiles * WALK_MIN_PER_MI);

  const points = useMemo(
    () => [start, ...stops].filter(Boolean).map((p) => [p.lat, p.lng]),
    [start, stops]
  );

  /* ---------- empty state ---------- */
  if (!crawl || stops.length === 0) {
    return (
      <AppShell active="home" onNavigate={onNavigate}>
        <div className="scroll scroll--flush">
          <PageHeader title="Your route" onBack={() => onNavigate?.("home")} />
          <div className="rt-body">
            <div className="empty-crawl">
              <h3>No stops yet</h3>
              <p>Build a crawl and your route will show up here.</p>
              <button className="empty-cta" onClick={() => onNavigate?.("create")}>
                Create a crawl
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const nextIdx = stops.findIndex((s) => !s.visited);
  const doneCount = stops.filter((s) => s.visited).length;
  const allDone = nextIdx === -1;
  const categories = [...new Set(stops.map((s) => s.category))];
  const badgeName = categories.length === 1 ? `${labelFor(categories[0])} Master` : "Crawl Master";

  /* ---------- edit the list ---------- */
  const commit = (nextStops, nextStart = start) =>
    onCrawlChange({
      ...crawl,
      start: nextStart,
      stops: nextStops,
      miles: routeMiles(nextStart, nextStops),
    });

  const removeStop = (id) => commit(stops.filter((s) => s.id !== id));

  /* re-number the unvisited stops from wherever you are right now */
  const reroute = async () => {
    setRerouting(true);
    setNote("");
    const here = await getPosition();
    if (!here) {
      setNote("Turn on location to re-route from where you are.");
      setRerouting(false);
      return;
    }
    const done = stops.filter((s) => s.visited);
    const todo = orderStops(here, stops.filter((s) => !s.visited));
    commit([...done, ...todo], here);
    setNote("Stops re-numbered from where you are.");
    setRerouting(false);
  };

  return (
    <AppShell active="home" onNavigate={onNavigate}>
      <div className="scroll scroll--flush">
        <PageHeader
          title={crawl.title}
          subtitle={`${stops.length} stops · ${totalMiles.toFixed(1)} mi · ~${totalMinutes} min walk`}
          onBack={() => onNavigate?.("home")}
        >
          <div className="rt-progress">
            <div className="rt-bar" aria-hidden="true">
              <span style={{ width: `${(doneCount / stops.length) * 100}%` }} />
            </div>
            <span className="rt-count mono">
              {doneCount}/{stops.length} stamped
            </span>
          </div>
        </PageHeader>

        <div className="rt-body">
          {serverError && (
            <p className="notice" role="status">
              {serverError}
            </p>
          )}

          {allDone && (
            <div className="rt-badge">
              <span className="rt-badge-icon">
                <Award size={26} strokeWidth={1.6} />
              </span>
              <div>
                <h3>{badgeName}</h3>
                <p>You stamped every stop on this crawl.</p>
              </div>
            </div>
          )}

          {/* ---------- map ---------- */}
          <div className="rt-map">
            <MapContainer
              center={points[0] ?? [47.6062, -122.3321]}
              zoom={14}
              zoomControl={false}
              attributionControl={false}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polyline
                positions={points}
                pathOptions={{
                  color: "#3b5ea6",
                  weight: 3,
                  opacity: 0.85,
                  dashArray: "1 8",
                  lineCap: "round",
                }}
              />
              {start && <Marker position={[start.lat, start.lng]} icon={pinIcon} />}
              {stops.map((s, i) => (
                <Marker
                  key={s.id}
                  position={[s.lat, s.lng]}
                  icon={stopIcon(i + 1, s.visited ? "done" : i === nextIdx ? "next" : "todo")}
                />
              ))}
              <FitRoute points={points} />
            </MapContainer>
          </div>

          {crawl.blurb && (
            <p className="rt-blurb">
              <Sparkles size={14} /> <span>{crawl.blurb}</span>
            </p>
          )}

          {/* ---------- stops ---------- */}
          <section>
            <div className="sec-head">
              <h2>Your stops</h2>
              <button className="rt-reroute" onClick={reroute} disabled={rerouting || allDone}>
                <Crosshair size={14} /> {rerouting ? "Locating…" : "Re-route from here"}
              </button>
            </div>
            {note && (
              <p className="rt-note" role="status">
                {note}
              </p>
            )}

            <ol className="rt-list">
              {stops.map((s, i) => {
                const state = s.visited ? "done" : i === nextIdx ? "next" : "todo";
                const Icon = iconFor(s.category);
                return (
                  <li key={s.id} className={`rt-stop rt-stop--${state}`}>
                    <span className="rt-num" aria-hidden="true">
                      {state === "done" ? <Check size={16} strokeWidth={2.5} /> : i + 1}
                    </span>
                    <div className="rt-main">
                      <div className="rt-top">
                        <h3>{s.name}</h3>
                        {state === "next" && <span className="rt-chip">Up next</span>}
                        {state === "todo" && (
                          <button
                            className="rt-remove"
                            aria-label={`Remove ${s.name}`}
                            onClick={() => removeStop(s.id)}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <p className="rt-meta mono">
                        <Icon size={12} /> {labelFor(s.category)} · {legText(legs[i])}
                      </p>
                      {state === "next" && (
                        <div className="rt-actions">
                          <button className="rt-primary" onClick={() => checkIn(s)} disabled={busy}>
                            {busy ? "Checking in…" : "Check in"}
                          </button>
                          <a
                            className="rt-secondary"
                            href={directionsUrl(s)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Navigation size={14} /> Directions
                          </a>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {message && (
              <p className="rt-note rt-note--error" role="status">
                {message}
              </p>
            )}
          </section>

          <button className="rt-new" onClick={() => onNavigate?.("create")}>
            Start a new crawl
          </button>
        </div>
      </div>
    </AppShell>
  );
}