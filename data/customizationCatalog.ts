import type { ThemeId } from "./themePackages";

export type CustomizationCategory = "theme" | "cursor" | "badge";

export interface CustomizationItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: CustomizationCategory;
  icon: string;
}

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  unlock: "free" | "inventory";
  inventoryItemId?: string;
}

export const SHOP_ITEMS: CustomizationItem[] = [
  {
    id: "theme_honey",
    name: "Honey Glaze",
    description: "A cathedral-hive package with ember trails, hex sanctuaries, and a stained amber cursor.",
    price: 500,
    category: "theme",
    icon: "🎨",
  },
  {
    id: "theme_night",
    name: "Astral Archive",
    description: "A starlit observatory theme with celestial overlays and a custom cursor.",
    price: 1000,
    category: "theme",
    icon: "🎨",
  },
  {
    id: "cursor_pollen",
    name: "Pollen Trail",
    description: "Leave valuable dust behind.",
    price: 300,
    category: "cursor",
    icon: "✨",
  },
  {
    id: "badge_lexicon",
    name: "Lexicon Badge",
    description: "Show off your vocabulary.",
    price: 200,
    category: "badge",
    icon: "🎖️",
  },
];

export const ITEM_CATALOG: Record<string, CustomizationItem> =
  Object.fromEntries(SHOP_ITEMS.map((item) => [item.id, item]));

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "hive",
    name: "Hive Classic",
    description: "The default emerald-and-amber hive palette.",
    unlock: "free",
  },
  {
    id: "royal",
    name: "Royal Nectar",
    description: "A regal retro-arcade package with scanlines, pixel trails, and cabinet glow.",
    unlock: "free",
  },
  {
    id: "ice",
    name: "Glacier Drift",
    description: "A stormglass package with rain-swept overlays and lightning cursor flashes.",
    unlock: "free",
  },
  {
    id: "forest",
    name: "Forest Bloom",
    description: "A bioluminescent forest package with drifting spores and fungal glow.",
    unlock: "free",
  },
  {
    id: "theme_honey",
    name: "Honey Glaze",
    description: "Unlocks the ember-lit cathedral hive package with a signature cursor trail.",
    unlock: "inventory",
    inventoryItemId: "theme_honey",
  },
  {
    id: "theme_night",
    name: "Astral Archive",
    description: "Unlocks a celestial observatory theme with a signature cursor package.",
    unlock: "inventory",
    inventoryItemId: "theme_night",
  },
];

export const isItemOwned = (inventory: string[], itemId: string) =>
  inventory.includes(itemId);

export const isThemeUnlocked = (themeId: ThemeId, inventory: string[]) => {
  const theme = THEME_OPTIONS.find((option) => option.id === themeId);

  if (!theme || theme.unlock === "free") {
    return true;
  }

  return theme.inventoryItemId
    ? inventory.includes(theme.inventoryItemId)
    : false;
};
