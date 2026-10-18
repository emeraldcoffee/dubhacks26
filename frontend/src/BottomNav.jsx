import { House, CirclePlus, User } from "lucide-react";
import "./BottomNav.css";

const TABS = [
  { id: "home", label: "Home", Icon: House },
  { id: "create", label: "New", Icon: CirclePlus },
  { id: "profile", label: "Profile", Icon: User },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`bn-tab ${active === id ? "bn-tab--on" : ""}`}
          aria-current={active === id ? "page" : undefined}
          onClick={() => onChange?.(id)}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}