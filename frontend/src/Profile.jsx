import { Bell, ChevronRight, Heart, User, Utensils } from "lucide-react";
import AppShell, { PageHeader } from "./AppShell";
import "./Profile.css";

/* mock data (swap for real user data later) */
const USER = { name: "Jules", initials: "JL" };

const SETTINGS = [
  {
    id: "personal",
    title: "Personal information",
    sub: "Your name, email and account details",
    Icon: User,
    tone: "blue",
  },
  {
    id: "favorites",
    title: "Favorite orders",
    sub: "The bites you’d happily have again",
    Icon: Heart,
    tone: "pink",
  },
  {
    id: "dietary",
    title: "Dietary preferences",
    sub: "Make every crawl a little more you",
    Icon: Utensils,
    tone: "cream",
  },
  {
    id: "notifications",
    title: "Notifications",
    sub: "Crawl invites and updates from friends",
    Icon: Bell,
    tone: "white",
  },
];

export default function Profile({
  onNavigate,
  onSelect = (id) => console.log("open settings:", id),
}) {
  return (
    <AppShell active="profile" onNavigate={onNavigate}>
      <div className="scroll scroll--flush">
        <PageHeader title="Profile">
          <button className="pf-user" onClick={() => onSelect("profile")}>
            <span className="pf-avatar" aria-hidden="true">
              {USER.initials}
            </span>
            <span className="pf-user-text">
              <strong>{USER.name}</strong>
              <span>Show profile</span>
            </span>
            <ChevronRight size={22} />
          </button>
        </PageHeader>

        {/* ---------- settings ---------- */}
        <main className="pf-body">
          <h2>Settings</h2>

          <ul className="pf-list">
            {SETTINGS.map(({ id, title, sub, Icon, tone }) => (
              <li key={id}>
                <button className="pf-row" onClick={() => onSelect(id)}>
                  <span className={`pf-tile pf-tile--${tone}`}>
                    <Icon size={22} strokeWidth={1.6} />
                  </span>
                  <span className="pf-row-text">
                    <strong>{title}</strong>
                    <span>{sub}</span>
                  </span>
                  <ChevronRight size={20} />
                </button>
              </li>
            ))}
          </ul>
        </main>
      </div>
    </AppShell>
  );
}