import { Coffee, Croissant, CupSoda, IceCreamCone, Leaf, Soup, UtensilsCrossed } from "lucide-react";

/* Category names come from the backend (Location.category). Add icons here as you add categories. */
const ICONS = {
  matcha: Leaf,
  boba: CupSoda,
  coffee: Coffee,
  cafe: Coffee,
  bakery: Croissant,
  dessert: IceCreamCone,
  ramen: Soup,
  dumplings: Soup,
};

export const iconFor = (category) => ICONS[category?.toLowerCase()] ?? UtensilsCrossed;

export const labelFor = (category) =>
  category ? category.charAt(0).toUpperCase() + category.slice(1) : "";

export function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ---------- location types: what kind of place it is ---------- */
export const LOCATION_TYPES = [
  { id: "cafe", label: "Cafe", Icon: Coffee },
  { id: "bakery", label: "Bakery", Icon: Croissant },
  { id: "restaurant", label: "Restaurant", Icon: UtensilsCrossed },
];

/* Which type each backend category (Location.category) belongs to.
   Add a line here whenever the backend gets a new category.
   If the backend later adds a `type` field to Location, that wins automatically. */
const TYPE_OF_CATEGORY = {
  matcha: "cafe",
  boba: "cafe",
  tea: "cafe",
  coffee: "cafe",
  cafe: "cafe",
  bakery: "bakery",
  pastry: "bakery",
  dessert: "bakery",
  ramen: "restaurant",
  dumplings: "restaurant",
  restaurant: "restaurant",
};

export const typeOfCategory = (category) =>
  TYPE_OF_CATEGORY[category?.toLowerCase()] ?? "restaurant";

export const typeOfLocation = (loc) => loc.type ?? typeOfCategory(loc.category);

/* Finds the first known category mentioned in free text:
   "an iced matcha latte" -> "matcha" (or null if none is mentioned). */
export function detectCategory(text, categories) {
  let best = null;
  let bestIndex = Infinity;
  for (const c of categories) {
    const safe = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp(`\\b${safe}s?\\b`, "i").exec(text);
    if (m && m.index < bestIndex) {
      best = c;
      bestIndex = m.index;
    }
  }
  return best;
}