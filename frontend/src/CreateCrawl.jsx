import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Sparkles,
  ArrowUp,
  Loader,
  Coffee,
  Croissant,
  UtensilsCrossed,
  Check,
  Plus,
  Minus,
  Crosshair,
  Footprints,
  Navigation,
} from "lucide-react";
import AppShell, { PageHeader } from "./AppShell";
import "./CreateCrawl.css";

/*  static data (swap for API calls later) */
const CATEGORIES = [
  { id: "cafe", label: "Cafes", count: 18, Icon: Coffee },
  { id: "bakery", label: "Bakery", count: 12, Icon: Croissant },
  { id: "restaurant", label: "Restaurants", count: 9, Icon: UtensilsCrossed },
];

const TAGS = [
  "Dairy-Free Milk",
  "Gluten-Free Options",
  "Nut-Free",
  "Low Sugar",
];

const SEATTLE = [47.6062, -122.3321];
const MI_TO_M = 1609.34;

/* A pin drawn with CSS so we avoid Leaflet's broken default icon in Vite */
const pinIcon = L.divIcon({
  className: "pin-wrap",
  html: '<div class="pin"><div class="pin-dot"></div></div>',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

/* Keeps the map zoomed so the whole radius circle is visible */
function FitCircle({ center, radiusM }) {
  const map = useMap();
  useEffect(() => {
    try {
      const bounds = L.latLng(center).toBounds(radiusM * 2);
      map.fitBounds(bounds, { padding: [12, 12], animate: false });
    } catch (err) {
      console.warn("fitBounds failed", err);
    }
  }, [center, radiusM, map]);
  return null;
}

function MapZoomButtons() {
  const map = useMap();
  return (
    <div className="map-ctrl map-ctrl--left">
      <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn()}>
        <Plus size={16} />
      </button>
      <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut()}>
        <Minus size={16} />
      </button>
    </div>
  );
}

export default function CreateCrawl({
  onBuild,
  onNavigate,
  onGenerate = (text) => console.log("generate from prompt:", text),
}) {
  const [prompt, setPrompt] = useState("");
  const [categories, setCategories] = useState(["cafe", "bakery"]);
  const [tags, setTags] = useState(["Dairy-Free Milk", "Gluten-Free Options", "Low Sugar"]);
  const [radius, setRadius] = useState(1.5); // miles
  const [pin, setPin] = useState(SEATTLE);
  const [editingPin, setEditingPin] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    try {
      await onGenerate?.(prompt.trim());
    } finally {
      setGenerating(false);
    }
  };

  const handlePromptKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const toggle = (list, setList, value) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  /* Mock estimate – replace with a call to your Python backend (POST /crawls/preview) */
  const summary = useMemo(() => {
    const available = CATEGORIES.filter((c) => categories.includes(c.id)).reduce(
      (n, c) => n + c.count,
      0
    );
    const stops = Math.max(0, Math.min(8, Math.round((available / 30) * radius * 2)));
    const totalMi = stops === 0 ? 0 : +(0.25 + stops * 0.28 * (radius / 1.5)).toFixed(1);
    return { stops, totalMi };
  }, [categories, radius]);

  const walkMinutes = Math.round(radius * 17);
  const radiusPct = ((radius - 0.5) / 4.5) * 100;

  const handleBuild = () =>
    onBuild?.({ prompt, categories, tags, radius, pin });

  return (
    <AppShell active="create" onNavigate={onNavigate}>
      <div className="scroll scroll--flush">
        <PageHeader title="New list" onBack={() => onNavigate?.("home")} />
 
        <div className="page-body">

        {/* ---------- smart generator ---------- */}
        <section className="card card--blue">
          <div className="card-head">
            <span className="card-title">
              <Sparkles size={14} className="accent" /> Smart Generator
            </span>
          </div>
          <div className="prompt-box">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handlePromptKey}
              enterKeyHint="send"
              placeholder="Describe your ideal treat... (e.g. matcha cloud lattes, tonkatsu ramen, chicken caesar salad wraps)"
              rows={3}
            />
            {prompt && (
              <button className="prompt-clear" onClick={() => setPrompt("")}>
                Clear
              </button>
            )}
            <button
              className="send-btn"
              aria-label="Generate crawl"
              onClick={handleGenerate}
              disabled={!prompt.trim() || generating}
            >
              {generating ? <Loader size={16} className="spin" /> : <ArrowUp size={18} />}
            </button>
          </div>
        </section>

        {/*  location focus*/}
        <section className="card">
          <div className="card-head">
            <span className="card-title">Location Focus</span>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map(({ id, label, count, Icon }) => {
              const active = categories.includes(id);
              return (
                <button
                  key={id}
                  className={`cat ${active ? "cat--on" : ""}`}
                  aria-pressed={active}
                  onClick={() => toggle(categories, setCategories, id)}
                >
                  <span className="cat-top">
                    <Icon size={18} />
                    <span className={`check ${active ? "check--on" : ""}`}>
                      {active && <Check size={11} strokeWidth={3} />}
                    </span>
                  </span>
                  <strong>{label}</strong>
                  <span className="small">{count} nearby</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------- dietary ---------- */}
        <section className="card">
          <div className="card-head">
            <span className="card-title">Dietary &amp; Atmosphere</span>
            <button className="link-btn" onClick={() => setTags([])}>
              Reset
            </button>
          </div>
          <div className="chips">
            {TAGS.map((t) => {
              const active = tags.includes(t);
              return (
                <button
                  key={t}
                  className={`chip ${active ? "chip--on" : ""}`}
                  aria-pressed={active}
                  onClick={() => toggle(tags, setTags, t)}
                >
                  {active ? <Check size={13} /> : <Plus size={13} />} {t}
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------- walking radius ---------- */}
        <section className="card">
          <div className="card-head card-head--top">
            <div>
              <span className="card-title">Walking Radius</span>
            </div>
            <div className="radius-actions">
              <button className="link-btn" onClick={() => setEditingPin((v) => !v)}>
                {editingPin ? "Done" : "Edit pin"}
              </button>
            </div>
          </div>

          <div className="map-box">
            <MapContainer
              center={pin}
              zoom={14}
              zoomControl={false}
              zoomSnap={0}
              attributionControl={false}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Circle
                center={pin}
                radius={radius * MI_TO_M}
                pathOptions={{ color: "#3b5ea6", weight: 2, fillColor: "#3b5ea6", fillOpacity: 0.14 }}
              />
              <Marker
                position={pin}
                icon={pinIcon}
                draggable={editingPin}
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    setPin([lat, lng]);
                  },
                }}
              />
              <FitCircle center={pin} radiusM={radius * MI_TO_M} />
              <MapZoomButtons />
            </MapContainer>

            <div className="map-ctrl map-ctrl--right">
              <button type="button" aria-label="Use my location" onClick={() => {
                navigator.geolocation?.getCurrentPosition((p) =>
                  setPin([p.coords.latitude, p.coords.longitude])
                );
              }}>
                <Crosshair size={16} />
              </button>
            </div>

            <div className="map-legend">
              <span className="dot" /> <strong>{radius.toFixed(1)} mi radius</strong>
              <span className="muted"> • ~{walkMinutes} min walk</span>
            </div>
          </div>

          <div className="slider-row">
            <span className="small label">Radius Distance</span>
            <span className="miles-pill">{radius.toFixed(1)} Miles</span>
          </div>
          <input
            className="slider"
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={radius}
            onChange={(e) => setRadius(parseFloat(e.target.value))}
            style={{ "--pct": `${radiusPct}%` }}
            aria-label="Radius distance in miles"
          />
          <div className="ticks small">
            {["0.5 mi", "1.0 mi", "1.5 mi", "2.5 mi", "5.0 mi"].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </section>

        {/* build crawl (end of page content) */}
        <section className="build-section">
          <div className="loop">
            <span className="loop-val">
              <strong>{summary.stops} Stops</strong>{" "}
              <span className="muted small">• ~{summary.totalMi} mi total</span>
            </span>
          </div>
          <button className="build-btn" disabled={summary.stops === 0} onClick={handleBuild}>
            <Navigation size={16} /> Build My List
          </button>
        </section>
        </div>
      </div>

      </AppShell>
  );
}