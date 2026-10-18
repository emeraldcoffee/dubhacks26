/* All backend calls live here. In dev, "/api" is proxied to FastAPI (see vite.config.js). */
const BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error("Can't reach the server. Is the backend running?");
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : "";
    } catch {
      /* body wasn't JSON */
    }
    const err = new Error(detail || `Something went wrong (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  health: () => request("/health"),
  createUser: (body) => post("/users", body), // { handle, display_name }
  getUser: (id) => request(`/users/${id}`),
  getLocations: (category) =>
    request(category ? `/locations?category=${encodeURIComponent(category)}` : "/locations"),
  recommend: (body) => post("/recommend", body), // { user_id, category, lat, lng, minutes?, note? }
  checkIn: (body) => post("/visits", body), // { user_id, location_id, lat, lng }
  addDish: (body) => post("/dishes", body), // { user_id, visit_id, name, rating?, image_path? }
  getDishes: (userId) => request(`/users/${userId}/dishes`),
  questProgress: (userId, questId) => request(`/users/${userId}/quests/${questId}`),
};

/* ---------- demo user (there's no login yet) ---------- */
const USER_KEY = "whisked_user_id";
let pending = null;

async function loadOrCreateUser() {
  const saved = localStorage.getItem(USER_KEY);
  if (saved) {
    try {
      return await api.getUser(saved);
    } catch (e) {
      if (e.status !== 404) throw e; // 404 = database was reset, so make a new user
    }
  }
  const handle = `jules-${Math.random().toString(36).slice(2, 8)}`;
  const user = await api.createUser({ handle, display_name: "Jules" });
  localStorage.setItem(USER_KEY, String(user.id));
  return user;
}

export function ensureUser() {
  // cached so React StrictMode's double-run doesn't create two users
  pending ??= loadOrCreateUser().catch((e) => {
    pending = null;
    throw e;
  });
  return pending;
}