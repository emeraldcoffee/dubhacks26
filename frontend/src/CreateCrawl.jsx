import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Sparkles,
  ArrowUp,
  Loader,
  Check,
  Plus,
  Minus,
  Crosshair,
  Navigation,
  X,
} from "lucide-react";
import AppShell, { PageHeader } from "./AppShell";
import { api } from "./api";
import { MI_TO_M, metersBetween, orderStops, routeMiles } from "./geo";
import {
  LOCATION_TYPES,
  detectCategory,
  iconFor,
  labelFor,
  typeOfCategory,
  typeOfLocation,
} from "./helpers";
import { pinIcon, stopIcon } from "./mapIcons";
import "./CreateCrawl.css";

const TAGS = ["Dairy-Free Milk", "Gluten-Free Options", "Nut-Free", "Low Sugar"];

const SEATTLE = [47.6062, -122.3321];
const MAX_STOPS = 8;

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

export default function CreateCrawl({ user, serverError, onBuild, onNavigate }) {
  const [prompt, setPrompt] = useState("");
  const [locations, setLocations] = useState([]); // every place from the backend
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]); // selected location types: cafe, bakery, restaurant
  const [dish, setDish] = useState(null); // what you're craving, e.g. "matcha" (a backend category)
  const [tags, setTags] = useState(["Dairy-Free Milk", "Gluten-Free Options", "Low Sugar"]);
  const [radius, setRadius] = useState(1.5); // miles
  const [pin, setPin] = useState(SEATTLE);
  const [editingPin, setEditingPin] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [found, setFound] = useState([]); // places from POST /discover: { id, name, address, category, lat, lng, meters_away }
  const [startId, setStartId] = useState(null); // stop to begin the route at
  const [notice, setNotice] = useState("");

  const walkMinutes = Math.round(radius * 17);
  const radiusPct = ((radius - 0.5) / 4.5) * 100;

  /* ---------- load places from the backend ---------- */
  useEffect(() => {
    let alive = true;
    api
      .getLocations()
      .then((rows) => {
        if (!alive) return;
        setLocations(rows);
      })
      .catch((e) => alive && setNotice(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const byId = useMemo(() => Object.fromEntries(locations.map((l) => [l.id, l])), [locations]);

  /* places inside the walking radius */
  const nearby = useMemo(() => {
    const here = { lat: pin[0], lng: pin[1] };
    return locations.filter((l) => metersBetween(here, l) <= radius * MI_TO_M);
  }, [locations, pin, radius]);

  const categoryIds = useMemo(() => [...new Set(locations.map((l) => l.category))], [locations]);

  /* the three type cards, with live "nearby" counts */
  const typeList = useMemo(
    () =>
      LOCATION_TYPES.map((t) => ({
        ...t,
        count: nearby.filter((l) => typeOfLocation(l) === t.id).length,
      })),
    [nearby]
  );

  /* search results (from /discover) that fall inside the walking radius; changing the radius re-filters, no new request */
  const foundNearby = useMemo(() => {
    const here = { lat: pin[0], lng: pin[1] };
    return found.filter((p) => metersBetween(here, p) <= radius * MI_TO_M);
  }, [found, pin, radius]);

  /* the route: selected types (and the dish, if you named one), inside the radius, nearest-first */
  const route = useMemo(() => {
    const start = { lat: pin[0], lng: pin[1] };
    if (found.length > 0) {
      // search results win (even if the radius leaves none): nearest-first from the pin
      const ordered = orderStops(start, foundNearby, startId).slice(0, MAX_STOPS);
      return { stops: ordered, miles: routeMiles(start, ordered) };
    }
    let pool = nearby.filter(
      (l) => types.includes(typeOfLocation(l)) && (!dish || l.category === dish)
    );
    const chosen = byId[startId];
    if (chosen && !pool.some((l) => l.id === chosen.id)) pool = [chosen, ...pool];
    const ordered = orderStops(start, pool, chosen?.id ?? null).slice(0, MAX_STOPS);
    return { stops: ordered, miles: routeMiles(start, ordered) };
  }, [nearby, types, dish, byId, startId, pin, found, foundNearby]);

  const toggle = (list, setList, value) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  /* ---------- Smart Generator ---------- */
  /* typing "matcha" sets the dish and selects its location type (cafe) */
  const handlePromptChange = (value) => {
    setPrompt(value);
    const found = detectCategory(value, categoryIds);
    if (found !== dish) {
      setDish(found);
      setFound([]);
      setStartId(null);
      if (found) setTypes([typeOfCategory(found)]);
    }
  };

  const clearDish = () => {
    setDish(null);
    setFound([]);
    setStartId(null);
  };

  const clearPrompt = () => {
    setPrompt("");
    clearDish();
  };

  /* Smart Generator -> POST /discover (Gemini suggests places, the backend geocodes them) */
  const handleGenerate = async () => {
    const text = prompt.trim();
    if (!text || generating) return;
    if (!user) {
      setNotice(serverError || "Still connecting to the server. Try again in a moment.");
      return;
    }
    setNotice("");
    setGenerating(true);
    try {
      const withTags = tags.length ? `${text}. Dietary needs: ${tags.join(", ")}.` : text;
      const idea = (withTags.length <= 200 ? withTags : text).slice(0, 200); // backend limit
      const result = await api.discover({
        idea,
        count: 10,
        lat: pin[0],
        lng: pin[1],
        category: dish ?? undefined,
      });
      setFound(result.places);
      setStartId(result.places[0]?.id ?? null);
      if (result.places.length === 0) setNotice(result.output);
    } catch (e) {
      setNotice(e.message);
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

  /* ---------- Build -> hand the ordered stops to App ---------- */
  const handleBuild = () => {
    if (route.stops.length === 0) return;
    const typeLabel = LOCATION_TYPES.find((t) => t.id === types[0])?.label;
    onBuild?.({
      title: dish ? `${labelFor(dish)} crawl` : types.length === 1 ? `${typeLabel} crawl` : "Custom crawl",
      types,
      tags,
      prompt,
      pin,
      radius,
      miles: route.miles,
      blurb: null,
      stops: route.stops.map(({ id, name, category, lat, lng }) => ({
        id,
        name,
        category,
        lat,
        lng,
      })),
    });
  };

  const shownNotice = notice || serverError;
  const DishIcon = dish ? iconFor(dish) : null;

  return (
    <AppShell active="create" onNavigate={onNavigate}>
      <div className="scroll scroll--flush">
        <PageHeader title="New list" onBack={() => onNavigate?.("home")} />

        <div className="page-body">
          {shownNotice && (
            <p className="notice" role="status">
              {shownNotice}
            </p>
          )}

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
                onChange={(e) => handlePromptChange(e.target.value)}
                onKeyDown={handlePromptKey}
                enterKeyHint="send"
                placeholder="What are you craving? (e.g. matcha, something sweet, not too bitter)"
                rows={3}
              />
              {prompt && (
                <button className="prompt-clear" onClick={clearPrompt}>
                  Clear
                </button>
              )}
              <button
                className="send-btn"
                aria-label="Generate recommendation"
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
              >
                {generating ? <Loader size={16} className="spin" /> : <ArrowUp size={18} />}
              </button>
            </div>

            {dish && (
              <div className="intent">
                <span className="intent-chip">
                  <DishIcon size={14} />
                  {labelFor(dish)}
                  <button aria-label={`Stop searching for ${dish}`} onClick={clearDish}>
                    <X size={12} />
                  </button>
                </span>
                <span className="intent-note small">
                  {LOCATION_TYPES.find((t) => t.id === typeOfCategory(dish))?.label} selected for you
                </span>
              </div>
            )}

            {found.length > 0 && (
              <div className="rec">
                {foundNearby.length > 0 ? (
                  <ul className="rec-list">
                    {foundNearby.map((p, i) => {
                      const on = startId === p.id;
                      const miles = metersBetween({ lat: pin[0], lng: pin[1] }, p) / MI_TO_M;
                      return (
                        <li key={p.id}>
                          <button
                            className={`rec-item ${on ? "rec-item--on" : ""}`}
                            aria-pressed={on}
                            onClick={() => setStartId(p.id)}
                          >
                            <span className="rec-name">
                              {p.name}
                              {i === 0 && <span className="rec-tag">Top pick</span>}
                            </span>
                            <span className="rec-reason">
                              {p.address} · {miles.toFixed(1)} mi away
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="rec-hint small muted">
                    None of the {found.length} suggestions are within {radius.toFixed(1)} mi. Widen the radius to see them.
                  </p>
                )}
                <p className="rec-hint small muted">
                  {foundNearby.length} of {found.length} suggestions are inside your radius
                  {foundNearby.length < found.length ? "; widen it to see the rest" : ""}. Suggested by AI, so
                  double-check before you go. Tap a place to start your route there.
                </p>
              </div>
            )}
          </section>

          {/* ---------- location type ---------- */}
          <section className="card">
            <div className="card-head">
              <span className="card-title">Location Type</span>
            </div>
            <div className="cat-grid">
              {typeList.map(({ id, label, count, Icon }) => {
                const active = types.includes(id);
                return (
                  <button
                    key={id}
                    className={`cat ${active ? "cat--on" : ""}`}
                    aria-pressed={active}
                    onClick={() => toggle(types, setTypes, id)}
                  >
                    <span className="cat-top">
                      <Icon size={18} />
                      <span className={`check ${active ? "check--on" : ""}`}>
                        {active && <Check size={11} strokeWidth={3} />}
                      </span>
                    </span>
                    <strong>{label}</strong>
                    <span className="small">{loading ? "…" : `${count} nearby`}</span>
                  </button>
                );
              })}
            </div>
            {!loading && locations.length === 0 && (
              <p className="muted small" style={{ marginTop: 12 }}>
                No places yet. Run <code>python seed.py</code> in the backend folder.
              </p>
            )}
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
                {route.stops.map((s, i) => (
                  <Marker key={s.id} position={[s.lat, s.lng]} icon={stopIcon(i + 1)} />
                ))}
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
                <button
                  type="button"
                  aria-label="Use my location"
                  onClick={() => {
                    navigator.geolocation?.getCurrentPosition((p) =>
                      setPin([p.coords.latitude, p.coords.longitude])
                    );
                  }}
                >
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

          {/* ---------- build crawl (end of page content) ---------- */}
          <section className="build-section">
            <div className="loop">
              <span className="loop-val">
                <strong>{route.stops.length} Stops</strong>{" "}
                <span className="muted small">• ~{route.miles.toFixed(1)} mi total</span>
              </span>
            </div>
            <button className="build-btn" disabled={route.stops.length === 0} onClick={handleBuild}>
              <Navigation size={16} /> Build My List
            </button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
