import { useEffect, useState } from "react";
import "./Theme.css";
import Home from "./Home";
import CreateCrawl from "./CreateCrawl";
import Profile from "./Profile";
import RoutePage from "./RoutePage";
import { ensureUser } from "./api";

const CRAWL_KEY = "whisked_crawl";

function loadCrawl() {
  try {
    return JSON.parse(localStorage.getItem(CRAWL_KEY));
  } catch {
    return null;
  }
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [user, setUser] = useState(null);
  const [serverError, setServerError] = useState("");
  const [crawl, setCrawlState] = useState(loadCrawl);

  useEffect(() => {
    ensureUser()
      .then((u) => {
        setUser(u);
        setServerError("");
      })
      .catch((e) => setServerError(e.message));
  }, []);

  // keeps the active crawl across refreshes
  const setCrawl = (next) => {
    setCrawlState(next);
    try {
      if (next) localStorage.setItem(CRAWL_KEY, JSON.stringify(next));
      else localStorage.removeItem(CRAWL_KEY);
    } catch {
      /* storage unavailable */
    }
  };

  const handleBuild = (data) => {
    const no = String(Number(crawl?.no ?? 0) + 1).padStart(3, "0");
    setCrawl({
      no,
      title: data.title,
      miles: data.miles,
      start: { lat: data.pin[0], lng: data.pin[1] },
      blurb: data.blurb,
      stops: data.stops.map((s) => ({ ...s, visited: false })),
    });
    setTab("route");
  };

  if (tab === "create") {
    return (
      <CreateCrawl
        user={user}
        serverError={serverError}
        onNavigate={setTab}
        onBuild={handleBuild}
      />
    );
  }
  if (tab === "route") {
    return (
      <RoutePage
        user={user}
        crawl={crawl}
        serverError={serverError}
        onCrawlChange={setCrawl}
        onNavigate={setTab}
      />
    );
  }
  if (tab === "profile") {
    return (
      <Profile
        user={user}
        onNavigate={setTab}
        onSelect={(id) => console.log("open settings:", id)}
      />
    );
  }
  return (
    <Home
      user={user}
      crawl={crawl}
      serverError={serverError}
      onCrawlChange={setCrawl}
      onNavigate={setTab}
    />
  );
}