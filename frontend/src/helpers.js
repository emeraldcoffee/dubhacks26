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