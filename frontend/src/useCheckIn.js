import { useState } from "react";
import { api } from "./api";
import { getPosition } from "./geo";

/* VITE_DEMO_MODE=1 lets check-in work without location (use with DEMO_MODE=1 on the backend) */
const DEMO = import.meta.env.VITE_DEMO_MODE === "1";

/* Shared by Home and the route page: POST /visits, then mark the stop as visited. */
export function useCheckIn({ user, crawl, onCrawlChange, serverError }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const checkIn = async (stop) => {
    if (!stop || busy) return;
    if (!user) {
      setMessage(serverError || "Still connecting to the server. Try again in a moment.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const pos = await getPosition();
      if (!pos && !DEMO) throw new Error("Turn on location to check in.");
      await api.checkIn({
        user_id: user.id,
        location_id: stop.id,
        lat: pos?.lat ?? stop.lat,
        lng: pos?.lng ?? stop.lng,
      });
      onCrawlChange({
        ...crawl,
        stops: crawl.stops.map((s) => (s.id === stop.id ? { ...s, visited: true } : s)),
      });
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  return { checkIn, busy, message };
}