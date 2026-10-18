import { useState } from "react";
import "./Theme.css";
import Home from "./Home";
import CreateCrawl from "./CreateCrawl";
import Profile from "./Profile";

export default function App() {
  const [tab, setTab] = useState("home");

  if (tab === "create") {
    return (
      <CreateCrawl
        onNavigate={setTab}
        onGenerate={(text) => console.log("generate from prompt:", text)}
        onBuild={(data) => console.log("build crawl", data)}
      />
    );
  }
  if (tab === "profile") {
    return (
      <Profile
        onNavigate={setTab}
        onSelect={(id) => console.log("open settings:", id)}
      />
    );
  }
  return <Home onNavigate={setTab} />;
}