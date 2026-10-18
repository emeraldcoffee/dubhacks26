import { useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Coffee,
  Croissant,
  Cookie,
  Egg,
  Ellipsis,
  Heart,
  IceCreamCone,
  MessageCircle,
  Pizza,
  Sandwich,
  Soup,
  SquarePen,
  Star,
  Ticket,
  UserPlus,
  UtensilsCrossed,
} from "lucide-react";
import AppShell, { PageHeader } from "./AppShell";
import "./Home.css";

/* mock data (swap for API calls later) */
const ACTIVE_CRAWL = {
  no: "028",
  title: "Little treats, big walk",
  meta: "WEST VILLAGE · 4 STOPS · 1.2 MI",
  collected: "2/4 COLLECTED",
  stops: [
    { label: "Croissant", Icon: Croissant, done: true },
    { label: "Flat white", Icon: Coffee, done: true },
    { label: "Gelato", n: 3 },
    { label: "Cheesecake", n: 4 },
  ],
  next: "pistachio at L'Arte del Gelato",
};

const OTHER_CRAWL = {
  title: "The dumpling trail",
  meta: "CHINATOWN · 1 OF 3 STAMPED",
};

const POSTS = [
  {
    id: 1,
    authors: [
      { initials: "MC", tone: "blue" },
      { initials: "LP", tone: "butter" },
    ],
    name: "Maya Chen & Leo Park",
    when: "2h ago · Crawled together",
    rating: 4.8,
    crawl: {
      no: "041",
      title: "A Madrona appetite",
      meta: "Madrona · 4 STOPS · OCT 18",
      stops: [
        { label: "Yoka Tea", Icon: Coffee, done: true },
        { label: "Joe'z Cafe", Icon: Pizza, done: true },
        { label: "Superiority", Icon: Sandwich, done: true },
        { label: "Sotto Zero", Icon: IceCreamCone, done: true },
      ],
    },
    caption:
      "Perfect matcha at Yoka tea, then an amazing chicken caesar salad wrap at Joe'z. Pistachio gelato for the walk home. Dream date.",
    likes: 18,
    liked: true,
    comments: 3,
    preview: { name: "Jules", text: "The gelato finale is non-negotiable." },
  },
  {
    id: 2,
    authors: [{ initials: "JL", tone: "paper" }],
    name: "Jules Lee",
    when: "You · Yesterday",
    rating: 4.5,
    crawl: {
      no: "027",
      title: "But first, a little coffee",
      meta: "Capitol Hill · 3 STOPS · OCT 17",
      stops: [
        { label: "Nudibranch", Icon: Coffee, done: true },
        { label: "Phe", Icon: Coffee, done: true },
        { label: "Offline", Icon: Coffee, done: true },
      ],
    },
    caption:
      "Nudibranch's mango sticky rice matcha was okay. Added a buttery croissant from phe to the route. No notes, just crumbs.",
    likes: 12,
    liked: false,
    comments: 2,
  },
  {
    id: 3,
    authors: [{ initials: "NP", tone: "blue" }],
    name: "Nina Patel",
    when: "Yesterday · With Sam Rivera",
    rating: 4.7,
    crawl: {
      no: "036",
      title: "Sunday in Chinatown",
      meta: "CHINATOWN · 3 STOPS · OCT 17",
      stops: [
        { label: "Le Grey", Icon: Coffee, done: true },
        { label: "Xi'an", Icon: UtensilsCrossed, done: true },
        { label: "Golden Fung", Icon: Egg, done: true },
      ],
    },
    caption:
      "Delectable jasmine cloud matcha, spicy cumin noodles, and one still-warm egg tart. Bring a friend and order everything to share.",
    likes: 24,
    liked: false,
    comments: 5,
  },
];

/* small pieces  */
function Avatar({ initials, tone = "blue", overlap = false }) {
  return (
    <span className={`avatar avatar--${tone} ${overlap ? "avatar--overlap" : ""}`}>
      {initials}
    </span>
  );
}

function Stamp({ label, Icon, done, n }) {
  return (
    <div className="stamp">
      <div className={`stamp-ring ${done ? "stamp-ring--done" : ""}`}>
        {done ? (
          <Icon size={24} strokeWidth={1.5} />
        ) : (
          <span className="stamp-num">{String(n).padStart(2, "0")}</span>
        )}
      </div>
      <span className="stamp-label">{label}</span>
    </div>
  );
}

function CrawlCard({ crawl, tone = "blue", badge, footer }) {
  return (
    <div className={`crawl crawl--${tone}`}>
      <div className="crawl-head">
        <div className="crawl-top">
          <span className="crawl-no">NO. {crawl.no} / FOOD CRAWL</span>
          {badge && <span className="crawl-badge">{badge}</span>}
        </div>
        <h3 className="crawl-title">{crawl.title}</h3>
        <p className="crawl-meta">{crawl.meta}</p>
      </div>
      <hr className="crawl-rule" />
      <div className="stamps" style={{ "--cols": crawl.stops.length }}>
        {crawl.stops.map((s) => (
          <Stamp key={s.label} {...s} />
        ))}
      </div>
      {footer}
    </div>
  );
}

function Post({ post }) {
  const [liked, setLiked] = useState(post.liked);
  const [comments, setComments] = useState(post.comments);
  const [preview, setPreview] = useState(post.preview);
  const [draft, setDraft] = useState("");

  const likeCount = post.likes + (liked && !post.liked ? 1 : 0) - (!liked && post.liked ? 1 : 0);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setPreview({ name: "Jules", text });
    setComments((c) => c + 1);
    setDraft("");
  };

  return (
    <article className="post">
      <header className="post-head">
        <div className="post-avatars">
          {post.authors.map((a, i) => (
            <Avatar key={a.initials} {...a} overlap={i > 0} />
          ))}
        </div>
        <div className="post-who">
          <strong>{post.name}</strong>
          <span>{post.when}</span>
        </div>
        <button className="post-more" aria-label="More options">
          <Ellipsis size={18} />
        </button>
      </header>

      <div className="post-rating">
        <Star size={16} /> <strong>{post.rating.toFixed(1)} / 5</strong>
      </div>

      <CrawlCard crawl={post.crawl} tone="blue" />

      <p className="post-caption">{post.caption}</p>

      <div className="post-actions">
        <button
          className={`like-btn ${liked ? "like-btn--on" : ""}`}
          aria-pressed={liked}
          onClick={() => setLiked((v) => !v)}
        >
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
          {liked ? "Liked" : "Like"} · {likeCount}
        </button>
        <span className="post-comments">
          {comments} comment{comments === 1 ? "" : "s"}
        </span>
      </div>

      {preview && (
        <p className="post-preview">
          <strong>{preview.name}</strong> {preview.text}
        </p>
      )}

      <div className="reply">
        <MessageCircle size={16} />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Write a response..."
          aria-label="Write a response"
        />
        <button className="reply-send" aria-label="Send" onClick={send} disabled={!draft.trim()}>
          <ArrowUp size={18} />
        </button>
      </div>
    </article>
  );
}

/* page */
export default function Home({ onNavigate }) {
  return (
    <AppShell active="home" onNavigate={onNavigate}>
      <div className="scroll scroll--flush">
        <PageHeader
          title="Welcome back, Jules."
          subtitle="Good bites. Better company. Keep collecting."
        />

        <main className="home-body">
          {/*  active crawls */}
          <section>
            <div className="sec-head">
              <h2>A few bites to go</h2>
              <span className="mono sec-tag">2 active</span>
            </div>

            <CrawlCard
              crawl={ACTIVE_CRAWL}
              tone="cream"
              badge={ACTIVE_CRAWL.collected}
              footer={
                <button className="upnext">
                  <span>Up next: {ACTIVE_CRAWL.next}</span>
                  <ArrowRight size={18} />
                </button>
              }
            />

            <button className="trail">
              <span className="trail-icon">
                <Soup size={20} />
              </span>
              <span className="trail-text">
                <strong>{OTHER_CRAWL.title}</strong>
                <span className="mono">{OTHER_CRAWL.meta}</span>
              </span>
              <ChevronRight size={18} />
            </button>
          </section>

          {/*  feed  */}
          <section>
            <div className="sec-head">
              <h2>At the same table</h2>
              <span className="mono sec-tag sec-tag--blue">Friends + you</span>
            </div>

            <div className="compose">
              <button className="compose-row" onClick={() => onNavigate?.("create")}>
                <Avatar initials="JL" tone="paper" />
                <span className="compose-text">What did you eat, Jules?</span>
                <SquarePen size={20} />
              </button>
              <div className="compose-links">
                <button>
                  <Ticket size={16} /> Share a stamp card
                </button>
                <button className="compose-strong">
                  <UserPlus size={16} /> Add people
                </button>
              </div>
            </div>

            <div className="feed">
              {POSTS.map((p) => (
                <Post key={p.id} post={p} />
              ))}
            </div>

            <p className="more mono">
              <ArrowDown size={13} /> More good bites below
            </p>
          </section>
        </main>
      </div>
    </AppShell>
  );
}