import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  CirclePlus,
  House,
  LogOut,
  Menu,
  Settings,
  User,
  Users,
  X,
} from "lucide-react";
import BottomNav from "./BottomNav";
import "./AppShell.css";

/* ---------- brand ---------- */
/* Logo A: three spiral arms (a whirl). Tweak the numbers to change the swirl. */
function spiralArm(rotDeg) {
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const t = (2.7 * i) / 28; // how far around the arm goes
    const r = 2 + 3.1 * t; // how far from the center it starts and ends
    const a = t + (rotDeg * Math.PI) / 180;
    pts.push(`${(16 + r * Math.cos(a)).toFixed(2)} ${(16 + r * Math.sin(a)).toFixed(2)}`);
  }
  return "M" + pts.join(" L");
}

export function WhiskedMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#3b5ea6" />
      <g fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {[0, 120, 240].map((deg) => (
          <path key={deg} d={spiralArm(deg)} />
        ))}
      </g>
    </svg>
  );
}

/* ---------- drawer content ---------- */
const MAIN_LINKS = [
  { id: "home", label: "Home", Icon: House, tab: "home" },
  { id: "create", label: "New list", Icon: CirclePlus, tab: "create" },
  { id: "profile", label: "Profile", Icon: User, tab: "profile" },
];

const MORE_LINKS = [
  { id: "friends", label: "Friends", Icon: Users, soon: true },
  { id: "saved", label: "Saved crawls", Icon: Bookmark, soon: true },
  { id: "settings", label: "Settings", Icon: Settings, tab: "profile" },
];

function NavDrawer({ active, onNavigate, onClose, onSignOut }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const go = (item) => {
    if (item.tab) onNavigate?.(item.tab);
    onClose();
  };

  const renderLinks = (links) => (
    <ul className="ws-nav-list">
      {links.map((item) => {
        const on = item.tab && item.tab === active && item.id !== "settings";
        return (
          <li key={item.id}>
            <button
              className={`ws-nav-item ${on ? "ws-nav-item--on" : ""}`}
              aria-current={on ? "page" : undefined}
              onClick={() => go(item)}
            >
              <item.Icon size={20} />
              <span>{item.label}</span>
              {item.soon && <span className="ws-soon">Soon</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="ws-drawer-root">
      <button className="ws-scrim" aria-label="Close menu" tabIndex={-1} onClick={onClose} />
      <aside className="ws-drawer" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="ws-drawer-head">
          <span className="ws-brand">
            <WhiskedMark size={28} />
            <span>Whisked</span>
          </span>
          <button ref={closeRef} className="ws-icon-btn" aria-label="Close menu" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Pages">{renderLinks(MAIN_LINKS)}</nav>
        <hr className="ws-divider" />
        <nav aria-label="More">{renderLinks(MORE_LINKS)}</nav>

        <div className="ws-drawer-foot">
          <p className="ws-tagline">We’ll whisk you away.</p>
          <button
            className="ws-signout"
            onClick={() => {
              onSignOut?.();
              onClose();
            }}
          >
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ---------- shell: top bar + page + bottom tabs + drawer ---------- */
export default function AppShell({
  active,
  onNavigate,
  children,
  onSignOut = () => console.log("sign out"),
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="phone">
      <div className="ws-topbar">
        <button className="ws-brand" aria-label="Whisked home" onClick={() => onNavigate?.("home")}>
          <WhiskedMark size={30} />
          <span>Whisked</span>
        </button>
        <button
          className="ws-icon-btn"
          aria-label="Open menu"
          aria-haspopup="dialog"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={18} />
        </button>
      </div>

      {children}

      <BottomNav active={active} onChange={onNavigate} />

      {menuOpen && (
        <NavDrawer
          active={active}
          onNavigate={onNavigate}
          onClose={closeMenu}
          onSignOut={onSignOut}
        />
      )}
    </div>
  );
}

/* ---------- page header: same size + style on every screen ---------- */
export function PageHeader({ title, subtitle, onBack, children }) {
  return (
    <header className="ws-page-head">
      <div className="ws-page-head-inner">
        <div className="ws-title-row">
          {onBack && (
            <button className="ws-icon-btn" aria-label="Back" onClick={onBack}>
              <ArrowLeft size={18} />
            </button>
          )}
          <h1>{title}</h1>
        </div>
        {subtitle && <p className="ws-subtitle">{subtitle}</p>}
        {children}
      </div>
    </header>
  );
}