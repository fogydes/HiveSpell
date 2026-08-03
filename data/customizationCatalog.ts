import type { ThemeId } from "./themePackages";

export type CustomizationCategory = "theme" | "cursor" | "badge";
export type ItemRarity = "common" | "rare" | "epic" | "legendary";
export type CurrencyType = "nectar" | "premium";

export interface CustomizationItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: CurrencyType;
  category: CustomizationCategory;
  icon: string;
  rarity: ItemRarity;
  featured?: boolean;
  bundleOnly?: boolean;
}

export interface Bundle {
  id: string;
  name: string;
  description: string;
  items: string[]; // item IDs
  price: number;
  currency: CurrencyType;
  discount: number; // percentage discount
  rarity: ItemRarity;
  icon: string;
  featured?: boolean;
  expiresAt?: string; // ISO date string for limited-time bundles
}

export interface DailyRotationConfig {
  date: string; // ISO date string
  featuredItemIds: string[];
  featuredBundleIds: string[];
}

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  unlock: "free" | "inventory";
  inventoryItemId?: string;
}

export const RARITY_COLORS: Record<ItemRarity, { bg: string; border: string; glow: string; text: string }> = {
  common: {
    bg: "bg-slate-500/10",
    border: "border-slate-400/30",
    glow: "rgba(148, 163, 184, 0.15)",
    text: "text-slate-300",
  },
  rare: {
    bg: "bg-blue-500/10",
    border: "border-blue-400/30",
    glow: "rgba(56, 189, 248, 0.15)",
    text: "text-blue-300",
  },
  epic: {
    bg: "bg-purple-500/10",
    border: "border-purple-400/30",
    glow: "rgba(168, 85, 247, 0.15)",
    text: "text-purple-300",
  },
  legendary: {
    bg: "bg-amber-500/10",
    border: "border-amber-400/30",
    glow: "rgba(251, 191, 36, 0.2)",
    text: "text-amber-300",
  },
};

export const RARITY_LABELS: Record<ItemRarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export const RARITY_WEIGHTS: Record<ItemRarity, number> = {
  common: 50,
  rare: 30,
  epic: 15,
  legendary: 5,
};

export const SHOP_ITEMS: CustomizationItem[] = [
  // THEMES
  {
    id: "theme_honey",
    name: "Honey Glaze",
    description: "A cathedral-hive package with ember trails, hex sanctuaries, and a stained amber cursor.",
    price: 500,
    currency: "nectar",
    category: "theme",
    icon: "🍯",
    rarity: "rare",
    featured: true,
  },
  {
    id: "theme_night",
    name: "Astral Archive",
    description: "A starlit observatory theme with celestial overlays and a custom cursor.",
    price: 1000,
    currency: "nectar",
    category: "theme",
    icon: "🌙",
    rarity: "epic",
    featured: true,
  },
  {
    id: "theme_royal",
    name: "Royal Nectar",
    description: "A regal retro-arcade package with scanlines, pixel trails, and cabinet glow.",
    price: 1500,
    currency: "nectar",
    category: "theme",
    icon: "👑",
    rarity: "legendary",
    featured: false,
  },
  {
    id: "theme_ice",
    name: "Glacier Drift",
    description: "A stormglass package with rain-swept overlays and lightning cursor flashes.",
    price: 1500,
    currency: "nectar",
    category: "theme",
    icon: "❄️",
    rarity: "legendary",
    featured: false,
  },
  {
    id: "theme_forest",
    name: "Forest Bloom",
    description: "A bioluminescent forest package with drifting spores and fungal glow.",
    price: 1500,
    currency: "nectar",
    category: "theme",
    icon: "🌲",
    rarity: "legendary",
    featured: false,
  },
  {
    id: "theme_void",
    name: "Void Walker",
    description: "An abyssal theme with void particles, dark matter trails, and cosmic cursor distortion.",
    price: 2500,
    currency: "premium",
    category: "theme",
    icon: "🕳️",
    rarity: "legendary",
    featured: true,
  },

  // CURSORS
  {
    id: "cursor_pollen",
    name: "Pollen Trail",
    description: "Leave valuable dust behind.",
    price: 300,
    currency: "nectar",
    category: "cursor",
    icon: "✨",
    rarity: "common",
  },
  {
    id: "cursor_ember",
    name: "Ember Dance",
    description: "Glowing ember particles follow your cursor's path.",
    price: 500,
    currency: "nectar",
    category: "cursor",
    icon: "🔥",
    rarity: "rare",
  },
  {
    id: "cursor_frost",
    name: "Frost Bite",
    description: "Crystalline ice shards trail your movements.",
    price: 500,
    currency: "nectar",
    category: "cursor",
    icon: "🧊",
    rarity: "rare",
  },
  {
    id: "cursor_spore",
    name: "Spore Drift",
    description: "Bioluminescent spores bloom where you click.",
    price: 500,
    currency: "nectar",
    category: "cursor",
    icon: "🍄",
    rarity: "rare",
  },
  {
    id: "cursor_astral",
    name: "Astral Whisper",
    description: "Constellation lines connect your cursor to distant stars.",
    price: 800,
    currency: "nectar",
    category: "cursor",
    icon: "✧",
    rarity: "epic",
  },
  {
    id: "cursor_arcade",
    name: "Pixel Perfect",
    description: "Retro scanline cursor with 8-bit trail animation.",
    price: 800,
    currency: "nectar",
    category: "cursor",
    icon: "▋",
    rarity: "epic",
  },
  {
    id: "cursor_void",
    name: "Void Anchor",
    description: "Dark matter singularity distorts space around your pointer.",
    price: 1200,
    currency: "premium",
    category: "cursor",
    icon: "⦿",
    rarity: "legendary",
  },

  // BADGES
  {
    id: "badge_lexicon",
    name: "Lexicon Badge",
    description: "Show off your vocabulary.",
    price: 200,
    currency: "nectar",
    category: "badge",
    icon: "🎖️",
    rarity: "common",
  },
  {
    id: "badge_winner",
    name: "Victor's Laurel",
    description: "Awarded to those who taste victory.",
    price: 400,
    currency: "nectar",
    category: "badge",
    icon: "🏆",
    rarity: "rare",
  },
  {
    id: "badge_streak",
    name: "Flame Keeper",
    description: "For those who never let the fire die.",
    price: 400,
    currency: "nectar",
    category: "badge",
    icon: "🔥",
    rarity: "rare",
  },
  {
    id: "badge_speed",
    name: "Swift Quill",
    description: "Speed is your ally, precision your weapon.",
    price: 400,
    currency: "nectar",
    category: "badge",
    icon: "⚡",
    rarity: "rare",
  },
  {
    id: "badge_sholar",
    name: "Scholar's Seal",
    description: "Knowledge compiled, wisdom earned.",
    price: 800,
    currency: "nectar",
    category: "badge",
    icon: "📜",
    rarity: "epic",
  },
  {
    id: "badge_royal",
    name: "Royal Crest",
    description: "The mark of nectar nobility.",
    price: 1200,
    currency: "nectar",
    category: "badge",
    icon: "👑",
    rarity: "epic",
  },
  {
    id: "badge_void",
    name: "Void Walker's Mark",
    description: "Only the boldest traverse the abyss.",
    price: 2000,
    currency: "premium",
    category: "badge",
    icon: "🕸️",
    rarity: "legendary",
  },
];

export const SHOP_BUNDLES: Bundle[] = [
  {
    id: "bundle_starter",
    name: "Apprentice's Kit",
    description: "Essential cosmetics to begin your journey.",
    items: ["cursor_pollen", "badge_lexicon"],
    price: 400,
    currency: "nectar",
    discount: 20,
    rarity: "common",
    icon: "🎒",
    featured: true,
  },
  {
    id: "bundle_hive_keeper",
    name: "Hive Keeper's Set",
    description: "The Honey Glaze theme with matching cursor and badge.",
    items: ["theme_honey", "cursor_ember", "badge_winner"],
    price: 1000,
    currency: "nectar",
    discount: 25,
    rarity: "rare",
    icon: "🍯",
    featured: true,
  },
  {
    id: "bundle_astral",
    name: "Stargazer's Collection",
    description: "Astral Archive theme with celestial cursor and scholar badge.",
    items: ["theme_night", "cursor_astral", "badge_scholar"],
    price: 2000,
    currency: "nectar",
    discount: 30,
    rarity: "epic",
    icon: "🌙",
    featured: true,
  },
  {
    id: "bundle_royal_court",
    name: "Royal Court Ensemble",
    description: "Full regal package: theme, cursor, and crest.",
    items: ["theme_royal", "cursor_arcade", "badge_royal"],
    price: 3000,
    currency: "nectar",
    discount: 35,
    rarity: "legendary",
    icon: "👑",
    featured: false,
  },
  {
    id: "bundle_void_walker",
    name: "Void Walker's Arsenal",
    description: "Complete void package for the brave.",
    items: ["theme_void", "cursor_void", "badge_void"],
    price: 5000,
    currency: "premium",
    discount: 40,
    rarity: "legendary",
    icon: "🕳️",
    featured: true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const ITEM_CATALOG: Record<string, CustomizationItem> =
  Object.fromEntries(SHOP_ITEMS.map((item) => [item.id, item]));

export const BUNDLE_CATALOG: Record<string, Bundle> =
  Object.fromEntries(SHOP_BUNDLES.map((bundle) => [bundle.id, bundle]));

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
  {
    id: "theme_royal",
    name: "Royal Nectar",
    description: "Unlocks the regal retro-arcade package with scanlines and pixel trails.",
    unlock: "inventory",
    inventoryItemId: "theme_royal",
  },
  {
    id: "theme_ice",
    name: "Glacier Drift",
    description: "Unlocks the stormglass package with rain-swept overlays and lightning cursor.",
    unlock: "inventory",
    inventoryItemId: "theme_ice",
  },
  {
    id: "theme_forest",
    name: "Forest Bloom",
    description: "Unlocks the bioluminescent forest package with drifting spores and fungal glow.",
    unlock: "inventory",
    inventoryItemId: "theme_forest",
  },
  {
    id: "theme_void",
    name: "Void Walker",
    description: "Unlocks the abyssal theme with void particles and cosmic cursor distortion.",
    unlock: "inventory",
    inventoryItemId: "theme_void",
  },
];

export const isItemOwned = (inventory: string[], itemId: string) =>
  inventory.includes(itemId);

export const isBundleOwned = (inventory: string[], bundle: Bundle) =>
  bundle.items.every((itemId) => inventory.includes(itemId));

export const isBundlePartiallyOwned = (inventory: string[], bundle: Bundle) =>
  bundle.items.some((itemId) => inventory.includes(itemId));

export const isThemeUnlocked = (themeId: ThemeId, inventory: string[]) => {
  const theme = THEME_OPTIONS.find((option) => option.id === themeId);

  if (!theme || theme.unlock === "free") {
    return true;
  }

  return theme.inventoryItemId
    ? inventory.includes(theme.inventoryItemId)
    : false;
};

export const getTodaysRotation = (): DailyRotationConfig => {
  const today = new Date().toISOString().split("T")[0];
  // In production, this would come from server or be seeded deterministically
  // For now, return a deterministic rotation based on date
  const dayIndex = parseInt(today.replace(/-/g, "").slice(-2), 10);

  const featuredItems = [
    ["theme_honey", "cursor_ember", "badge_winner"],
    ["theme_night", "cursor_astral", "badge_scholar"],
    ["theme_royal", "cursor_arcade", "badge_royal"],
    ["theme_ice", "cursor_frost", "badge_speed"],
    ["theme_forest", "cursor_spore", "badge_streak"],
    ["theme_void", "cursor_void", "badge_void"],
  ];

  const featuredBundles = [
    ["bundle_hive_keeper"],
    ["bundle_astral"],
    ["bundle_royal_court"],
    ["bundle_starter"],
    ["bundle_hive_keeper", "bundle_astral"],
    ["bundle_void_walker"],
  ];

  return {
    date: today,
    featuredItemIds: featuredItems[dayIndex % featuredItems.length],
    featuredBundleIds: featuredBundles[dayIndex % featuredBundles.length],
  };
};