import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronRight,
  Coffee,
  Croissant,
  Cookie,
  Egg,
  Ellipsis,
  Heart,
  IceCreamCone,
  Leaf,
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
import { api } from "./api";
import { iconFor, initialsOf } from "./helpers";
import { useCheckIn } from "./useCheckIn";
import "./Home.css";

/* quest 1 is the "Matcha crawl" created by seed.py */
const MATCHA_QUEST_ID = 1;

/* the feed is still mock data (the backend has no feed endpoint yet) */
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
        {crawl.stops.map((s, i) => (
          <Stamp key={`${s.label}-${i}`} {...s} />
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

/* ---------- crawl helpers ---------- */
function cardFromCrawl(crawl) {
  const done = crawl.stops.filter((s) => s.visited).length;
  return {
    no: crawl.no,
    title: crawl.title,
    meta: `SEATTLE · ${crawl.stops.length} STOPS · ${crawl.miles.toFixed(1)} MI`,
    collected: `${done}/${crawl.stops.length} COLLECTED`,
    stops: crawl.stops.map((s, i) => ({
      label: s.name,
      Icon: iconFor(s.category),
      done: s.visited,
      n: i + 1,
    })),
    next: crawl.stops.find((s) => !s.visited) ?? null,
  };
}

/* page */
export default function Home({ user, crawl, serverError, onCrawlChange, onNavigate }) {
  const name = user?.display_name ?? "Jules";
  const [quest, setQuest] = useState(null);
  const { checkIn, busy, message } = useCheckIn({ user, crawl, onCrawlChange, serverError });

  /* progress on the static "Matcha crawl" quest (refreshes after each check-in) */
  useEffect(() => {
    if (!user) return;
    let alive = true;
    api
      .questProgress(user.id, MATCHA_QUEST_ID)
      .then((q) => alive && setQuest(q))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, crawl]);

  const card = crawl ? cardFromCrawl(crawl) : null;
  const questStops = quest?.stops ?? [];
  const questDone = questStops.filter((s) => s.visited).length;
  const activeCount = (crawl ? 1 : 0) + (questStops.length ? 1 : 0);

  return (
    <AppShell active="home" onNavigate={onNavigate}>
      <div className="scroll scroll--flush">
        <PageHeader
          title={`Welcome back, ${name}.`}
          subtitle="Good bites. Better company. Keep collecting."
        />

        <main className="home-body">
          {serverError && (
            <p className="notice" role="status">
              {serverError}
            </p>
          )}

          {/*  active crawls */}
          <section>
            <div className="sec-head">
              <h2>A few bites to go</h2>
              <span className="mono sec-tag">{activeCount} active</span>
            </div>

            {card ? (
              <>
                <CrawlCard
                  crawl={card}
                  tone="cream"
                  badge={card.collected}
                  footer={
                    card.next ? (
                      <button className="upnext" onClick={() => checkIn(card.next)} disabled={busy}>
                        <span>{busy ? "Checking in…" : `Up next: ${card.next.name}`}</span>
                        <ArrowRight size={18} />
                      </button>
                    ) : (
                      <div className="upnext upnext--done">
                        <span>All stamped. Nice crawl.</span>
                        <Check size={18} />
                      </div>
                    )
                  }
                />
                <div className="crawl-foot">
                  <p className={`crawl-msg ${message ? "crawl-msg--error" : ""}`} role="status">
                    {message || (card.next ? "Tap the bar when you arrive to check in." : "")}
                  </p>
                  <button className="link-btn" onClick={() => onNavigate?.("route")}>
                    View route
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-crawl">
                <h3>Start your first crawl</h3>
                <p>Pick a food, set a walking radius, and we'll line up the stops.</p>
                <button className="empty-cta" onClick={() => onNavigate?.("create")}>
                  Create a crawl
                </button>
              </div>
            )}

            {questStops.length > 0 && (
              <div className="trail">
                <span className="trail-icon">
                  <Leaf size={20} />
                </span>
                <span className="trail-text">
                  <strong>Every Ramen Spot in Seattle </strong>
                  <span className="mono">
                    Japanese· {questDone} OF {questStops.length} STAMPED
                    {quest?.completed ? " · Ramen Ruler" : ""}
                  </span>
                </span>
                {quest?.completed && <Check size={18} />}
              </div>
            )}
          </section>

          {/*  feed  */}
          <section>
            <div className="sec-head">
              <h2>At the same table</h2>
              <span className="mono sec-tag sec-tag--blue">Friends + you</span>
            </div>

            <div className="compose">
              <button className="compose-row" onClick={() => onNavigate?.("create")}>
                <Avatar initials={initialsOf(name)} tone="paper" />
                <span className="compose-text">What did you eat, {name}?</span>
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