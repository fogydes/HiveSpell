import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { supabase } from "../services/supabase";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import {
  SHOP_ITEMS,
  SHOP_BUNDLES,
  type CustomizationCategory,
  type CustomizationItem,
  type Bundle,
  type ItemRarity,
  type CurrencyType,
  isItemOwned,
  isBundleOwned,
  isBundlePartiallyOwned,
  getTodaysRotation,
  RARITY_COLORS,
  RARITY_LABELS,
  BUNDLE_CATALOG,
  ITEM_CATALOG,
  THEME_OPTIONS,
  isThemeUnlocked,
} from "../data/customizationCatalog";
import { THEME_PACKAGES, type ThemeId } from "../data/themePackages";

const CATEGORY_COPY: Record<
  "all" | CustomizationCategory | "bundles",
  { label: string; blurb: string; eyebrow: string; icon: string }
> = {
  all: {
    label: "Full collection",
    blurb: "Every cosmetic currently in your possession.",
    eyebrow: "Archive sweep",
    icon: "📦",
  },
  theme: {
    label: "Theme chambers",
    blurb: "Scene-wide visual packages with stronger mood and identity.",
    eyebrow: "Atmosphere",
    icon: "🎨",
  },
  cursor: {
    label: "Cursor arts",
    blurb: "Pointer treatments and trails that alter the feel of navigation.",
    eyebrow: "Motion",
    icon: "✨",
  },
  badge: {
    label: "Guild badges",
    blurb: "Compact profile marks that travel with your social surfaces.",
    eyebrow: "Identity",
    icon: "🏷️",
  },
  bundles: {
    label: "Owned bundles",
    blurb: "Complete collections you've assembled or purchased.",
    eyebrow: "Collection",
    icon: "🎁",
  },
};

const CATEGORY_ORDER = ["all", "theme", "cursor", "badge", "bundles"] as const;

const categoryTone = (category: CustomizationCategory | "bundles") =>
  category === "theme"
    ? "from-fuchsia-500/20 via-primary/10 to-transparent"
    : category === "cursor"
      ? "from-sky-500/20 via-primary/10 to-transparent"
      : category === "bundles"
        ? "from-amber-500/20 via-primary/10 to-transparent"
        : "from-amber-400/20 via-primary/10 to-transparent";

const categoryBorder = (category: CustomizationCategory | "bundles") =>
  category === "theme"
    ? "border-fuchsia-400/25 text-fuchsia-200"
    : category === "cursor"
      ? "border-sky-400/25 text-sky-200"
      : category === "bundles"
        ? "border-amber-400/25 text-amber-200"
        : "border-amber-300/25 text-amber-200";

const RarityBadge: React.FC<{ rarity: ItemRarity; size?: "sm" | "md" | "lg" }> = ({
  rarity,
  size = "md",
}) => {
  const colors = RARITY_COLORS[rarity];
  const label = RARITY_LABELS[rarity];
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[9px]",
    md: "px-3 py-1 text-[10px]",
    lg: "px-4 py-1.5 text-[11px]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-[0.2em] ${sizeClasses[size]} ${colors.border} ${colors.bg} ${colors.text}`}
      style={{ boxShadow: `0 0 12px ${colors.glow}` }}
    >
      <span className="relative" style={{ textShadow: `0 0 8px ${colors.glow}` }}>
        {label}
      </span>
    </span>
  );
};

const CurrencyDisplay: React.FC<{ amount: number; currency: CurrencyType; size?: "sm" | "md" | "lg" }> = ({
  amount,
  currency,
  size = "md",
}) => {
  const icons = { nectar: "🍯", premium: "💎" };
  const colors = {
    nectar: "text-amber-300",
    premium: "text-cyan-300",
  };
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold ${sizeClasses[size]} ${colors[currency]}`}>
      {icons[currency]}
      {amount.toLocaleString()}
    </span>
  );
};

const TryOnPreview: React.FC<{
  item: CustomizationItem | Bundle | null;
  theme: any;
  onClose: () => void;
}> = ({ item, theme, onClose }) => {
  if (!item) return null;
  const isBundle = "items" in item;
  if (!isBundle && item.category !== "theme") return null;

  const { performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const disableAnimations = performanceTier === "static" || reduceMotion;

  const themeId = isBundle
    ? item.items.find((id) => id.startsWith("theme_"))
    : item.id;
  const themePackage = themeId ? THEME_PACKAGES[themeId as ThemeId] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      style={{ animation: disableAnimations ? "none" : undefined }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[24px] border border-primary/30 bg-panel/95 backdrop-blur-xl shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-surface/50 p-4">
          <h3 className="text-xl font-black text-text-main">Try On: {item.name}</h3>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full border border-surface/50 text-text-muted hover:border-primary hover:text-primary transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {themePackage ? (
            <div
              className="rounded-[20px] p-8"
              style={{
                background: themePackage.scene.panelGradient,
                minHeight: "300px",
              }}
            >
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-text-main mb-3">Panel Preview</h4>
                  <div
                    className="rounded-[16px] p-6 text-text-main"
                    style={{
                      background: themePackage.colors.panel,
                      border: `1px solid ${themePackage.scene.borderStrong}`,
                    }}
                  >
                    <p className="text-lg font-semibold" style={{ color: themePackage.colors.textMain }}>
                      {themePackage.name}
                    </p>
                    <p className="mt-2 text-text-muted" style={{ color: themePackage.colors.textMuted }}>
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-[12px] h-16" style={{ background: themePackage.colors.primary }} />
                  <div className="rounded-[12px] h-16" style={{ background: themePackage.colors.accent }} />
                  <div className="rounded-[12px] h-16" style={{ background: themePackage.colors.surface }} />
                </div>
                <div className="pt-4 border-t border-surface/30">
                  <p className="text-sm text-text-muted">
                    This preview shows the theme's core palette. The full experience includes ambient particles, cursor effects, and scene transitions.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted">
              Theme preview not available
            </div>
          )}
        </div>
        <div className="border-t border-surface/50 p-4">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-full border border-primary/30 bg-primary/20 text-primary font-bold uppercase tracking-[0.22em] transition-colors hover:bg-primary/30"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

const ItemCard: React.FC<{
  item: CustomizationItem | Bundle;
  selected: boolean;
  owned: boolean;
  partiallyOwned?: boolean;
  onSelect: () => void;
  isBundle?: boolean;
  onEquip?: () => void;
  onUnequip?: () => void;
  equipped?: boolean;
  onTryOn?: () => void;
}> = ({ item, selected, owned, partiallyOwned, onSelect, isBundle = false, onEquip, onUnequip, equipped, onTryOn }) => {
  const rarity = isBundle ? (item as Bundle).rarity : item.rarity;
  const colors = RARITY_COLORS[rarity];
  const itemCategory = isBundle ? "bundles" : (item as CustomizationItem).category;
  const itemIcon = item.icon;
  const itemName = item.name;
  const itemDescription = isBundle
    ? `${(item as Bundle).items.length} items · ${(item as Bundle).discount}% off`
    : (item as CustomizationItem).description;
  const itemPrice = item.price;
  const itemCurrency = isBundle ? (item as Bundle).currency : (item as CustomizationItem).currency;

  const [hovered, setHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onSelect();
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative overflow-hidden rounded-[20px] border p-4 text-left transition-all sm:rounded-[28px] sm:p-5 ${
        selected
          ? `border ${colors.border} bg-gradient-to-br ${colors.bg.replace("bg-", "from-").replace("/10", "/15")} shadow-[0_20px_40px_${colors.glow}]`
          : owned
            ? "border-emerald-400/20 bg-emerald-400/8"
            : partiallyOwned
              ? "border-amber-400/20 bg-amber-400/8"
              : "border-surface/80 bg-black/20 hover:border-primary/20 hover:bg-panel/40"
      }`}
      style={{
        boxShadow: selected ? `0 20px 40px ${colors.glow}` : undefined,
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br opacity-80 ${categoryTone(itemCategory)}`} />
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at center, ${colors.glow} 0%, transparent 70%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/6 text-2xl shadow-[0_16px_30px_rgba(0,0,0,0.24)] sm:h-14 sm:w-14 sm:rounded-[20px] sm:text-3xl">
            {itemIcon}
          </div>
          <RarityBadge rarity={rarity} size="sm" />
        </div>
        <h4 className="mt-4 text-base font-black text-text-main sm:mt-5 sm:text-lg">{itemName}</h4>
        <p className="mt-3 min-h-0 text-sm leading-6 text-text-muted sm:min-h-[72px]">{itemDescription}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <CurrencyDisplay amount={itemPrice} currency={itemCurrency} size="sm" />
          {equipped && (
            <span className="text-xs font-bold text-emerald-300">✓ Equipped</span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {onEquip && !equipped && (
            <button
              onClick={(e) => { e.stopPropagation(); onEquip(); }}
              className="flex-1 h-10 rounded-full border border-primary/30 bg-primary/18 text-xs font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/28"
            >
              Equip
            </button>
          )}
          {onUnequip && equipped && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnequip(); }}
              className="flex-1 h-10 rounded-full border border-amber-300/30 bg-amber-400/12 text-xs font-bold uppercase tracking-[0.18em] text-amber-200 transition-colors hover:bg-amber-400/20"
            >
              Unequip
            </button>
          )}
          {onTryOn && !equipped && (
            <button
              onClick={(e) => { e.stopPropagation(); onTryOn(); }}
              className="flex-1 h-10 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/12 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-200 transition-colors hover:bg-fuchsia-500/20"
            >
              Try On
            </button>
          )}
          {!onEquip && !onUnequip && !onTryOn && (
            <div className="text-center text-sm font-semibold text-emerald-300">
              ✓ Owned
            </div>
          )}
        </div>

        {partiallyOwned && !owned && (
          <div className="mt-4 text-center text-sm font-semibold text-amber-300">
            ⟳ Partially owned
          </div>
        )}
      </div>
    </button>
  );
};

export const Stash: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { userData } = useAuth();
  const {
    theme,
    setTheme,
    equippedCursor,
    setEquippedCursor,
    equippedBadge,
    setEquippedBadge,
  } = useSettings();
  const { performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const disableAnimations = performanceTier === "static" || reduceMotion;
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORY_ORDER[number]>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [tryOnItem, setTryOnItem] = useState<CustomizationItem | Bundle | null>(null);
  const [themePreviewId, setThemePreviewId] = useState<ThemeId | null>(theme);

  const inventory = userData?.inventory ?? [];
  const premiumCurrency = userData?.premium ?? 0;
  const nectarCurrency = userData?.nectar ?? 0;

  const rotation = useMemo(() => getTodaysRotation(), []);
  const [animatedRotation, setAnimatedRotation] = useState(rotation);

  useEffect(() => {
    setAnimatedRotation(getTodaysRotation());
  }, []);

  const ownedItems = useMemo(() => {
    return inventory
      .map((itemId) => ITEM_CATALOG[itemId])
      .filter(Boolean) as CustomizationItem[];
  }, [inventory]);

  const ownedBundles = useMemo(() => {
    return SHOP_ITEMS.filter((item) => item.category === "theme").map((item) => {
      // This is a simplified check - bundles are checked via isBundleOwned
      return item;
    });
  }, [inventory]);

  const itemsByCategory = useMemo(() => {
    const groups: Record<string, CustomizationItem[]> = {
      theme: [],
      cursor: [],
      badge: [],
    };
    ownedItems.forEach((item) => {
      if (groups[item.category]) {
        groups[item.category].push(item);
      }
    });
    return groups;
  }, [ownedItems]);

  const activeCursor = equippedCursor ? ITEM_CATALOG[equippedCursor] : null;
  const activeBadge = equippedBadge ? ITEM_CATALOG[equippedBadge] : null;

  const getVisibleItems = useCallback(() => {
    if (activeCategory === "all") return ownedItems;
    if (activeCategory === "bundles") return SHOP_BUNDLES.filter((b) => isBundleOwned(inventory, b));
    return itemsByCategory[activeCategory] || [];
  }, [activeCategory, ownedItems, ownedBundles, itemsByCategory, inventory]);

  const visibleItems = getVisibleItems();

  const selectedItem =
    (activeCategory === "bundles"
      ? SHOP_BUNDLES.find((b) => isBundleOwned(inventory, b) && b.id === selectedItemId)
      : visibleItems.find((item) => item.id === selectedItemId)) ??
    (activeCategory === "bundles" ? SHOP_BUNDLES.find((b) => isBundleOwned(inventory, b)) : visibleItems[0]) ??
    ownedItems[0] ??
    null;

  const isBundleSelected = activeCategory === "bundles" || (selectedItem && "items" in selectedItem);
  const selectedOwned = isBundleSelected
    ? selectedItem
      ? isBundleOwned(inventory, selectedItem as Bundle)
      : false
    : selectedItem
      ? isItemOwned(inventory, selectedItem.id)
      : false;
  const partiallyOwned = isBundleSelected
    ? selectedItem
      ? isBundlePartiallyOwned(inventory, selectedItem as Bundle) && !selectedOwned
      : false
    : false;
  const selectedEquipped = !isBundleSelected && selectedItem
    ? (selectedItem.category === "cursor" && equippedCursor === selectedItem.id) ||
      (selectedItem.category === "badge" && equippedBadge === selectedItem.id)
    : false;

  const handleEquip = useCallback(() => {
    if (!selectedItem || isBundleSelected) return;
    if (selectedItem.category === "cursor") {
      setEquippedCursor(equippedCursor === selectedItem.id ? null : selectedItem.id);
    } else if (selectedItem.category === "badge") {
      setEquippedBadge(equippedBadge === selectedItem.id ? null : selectedItem.id);
    }
  }, [selectedItem, isBundleSelected, equippedCursor, equippedBadge, setEquippedCursor, setEquippedBadge]);

  const handleTryOn = useCallback(() => {
    if (selectedItem && !isBundleSelected && selectedItem.category === "theme") {
      setTryOnItem(selectedItem);
    }
  }, [selectedItem, isBundleSelected]);

  const handleThemeEquip = useCallback(() => {
    if (!selectedItem || isBundleSelected) return;
    const themeOption = THEME_OPTIONS.find((t) => t.inventoryItemId === selectedItem.id);
    if (themeOption && isThemeUnlocked(themeOption.id, inventory)) {
      setTheme(themeOption.id);
      setThemePreviewId(themeOption.id);
    }
  }, [selectedItem, isBundleSelected, inventory, setTheme]);

  const renderThemePreview = () => {
    if (activeCategory !== "theme" && activeCategory !== "all") return null;
    if (!themePreviewId) return null;

    const themePkg = THEME_PACKAGES[themePreviewId];

    return (
      <div className="mb-5">
        <div className="overflow-hidden rounded-[20px] border border-surface/80 p-4 sm:rounded-[28px] sm:p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                Live preview
              </p>
              <h3 className="mt-2 text-lg font-black text-text-main">
                {themePkg?.name || "Select a theme"}
              </h3>
            </div>
            {themePreviewId !== theme && (
              <button
                onClick={() => {
                  if (themePreviewId !== theme && isThemeUnlocked(themePreviewId, inventory)) {
                    setTheme(themePreviewId);
                  }
                }}
                disabled={!isThemeUnlocked(themePreviewId, inventory)}
                className={`
                  inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-bold uppercase tracking-[0.18em] transition-all
                  ${!isThemeUnlocked(themePreviewId, inventory)
                    ? "cursor-not-allowed border border-surface/60 bg-black/20 text-text-muted"
                    : "border border-primary/35 bg-primary/20 text-primary hover:bg-primary/30"}
                `}
              >
                {themePreviewId === theme ? "Equipped" : "Apply"}
              </button>
            )}
          </div>
          <div
            className="rounded-[20px] border border-white/10 p-4 sm:rounded-[24px] sm:p-5"
            style={{
              background: themePkg?.scene.panelGradient || "transparent",
              minHeight: "200px",
            }}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[12px] h-16" style={{
                  background: themePkg?.colors.primary || "transparent"
                }} />
                <div className="rounded-[12px] h-16" style={{
                  background: themePkg?.colors.accent || "transparent"
                }} />
                <div className="rounded-[12px] h-16" style={{
                  background: themePkg?.colors.surface || "transparent"
                }} />
              </div>
              <div className="rounded-[12px] p-4 text-text-main" style={{
                background: themePkg?.colors.panel || "transparent",
                border: `1px solid ${themePkg?.scene.borderStrong || "transparent"}`,
              }}>
                <p className="font-semibold" style={{
                  color: themePkg?.colors.textMain || "white"
                }}>
                  {themePkg?.name || "Theme Preview"}
                </p>
                <p className="mt-2 text-sm text-text-muted" style={{
                  color: themePkg?.colors.textMuted || "rgba(255,255,255,0.6)"
                }}>
                  Click a theme card to preview its full atmosphere
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderItemInspection = () => {
    if (!selectedItem) {
      return (
        <div className="rounded-[28px] border border-dashed border-surface/80 bg-black/20 p-8 text-center text-text-muted">
          Select an item to inspect its details.
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="overflow-hidden rounded-[20px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[28px] sm:p-5">
          <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
            Inspection rail
          </p>
          <div
            className={`mt-4 rounded-[20px] border p-4 sm:rounded-[26px] sm:p-5 ${categoryBorder(
              isBundleSelected ? "bundles" : ("category" in selectedItem ? selectedItem.category : "theme")
            )} bg-panel/50`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/6 text-3xl sm:h-16 sm:w-16 sm:rounded-[22px] sm:text-4xl">
                {selectedItem.icon}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-surface/70 bg-panel/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
                  {isBundleSelected ? "Bundle" : ("category" in selectedItem ? selectedItem.category : "theme")}
                </span>
                <RarityBadge rarity={isBundleSelected ? (selectedItem as Bundle).rarity : selectedItem.rarity} size="sm" />
              </div>
            </div>
            <h3 className="mt-4 text-xl font-black text-text-main sm:mt-5 sm:text-2xl">
              {selectedItem.name}
            </h3>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              {isBundleSelected
                ? `Contains ${(selectedItem as Bundle).items.length} items with a ${(selectedItem as Bundle).discount}% discount`
                : (selectedItem as CustomizationItem).description}
            </p>

            {isBundleSelected && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/55">Contents</p>
                <div className="flex flex-wrap gap-2">
                  {(selectedItem as Bundle).items.map((itemId) => {
                    const catItem = BUNDLE_CATALOG[itemId] || SHOP_ITEMS.find((i) => i.id === itemId);
                    const itemOwned = isItemOwned(inventory, itemId);
                    return catItem ? (
                      <span
                        key={itemId}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                          itemOwned
                            ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
                            : "border-surface/60 bg-panel/50 text-text-muted"
                        }`}
                      >
                        {catItem.icon} {catItem.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {!isBundleSelected && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[18px] border border-surface/70 bg-black/25 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/55">
                    Original Price
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <CurrencyDisplay
                      amount={selectedItem.price}
                      currency={(selectedItem as CustomizationItem).currency}
                      size="md"
                    />
                  </div>
                </div>
                <div className="rounded-[18px] border border-surface/70 bg-black/25 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/55">
                    Status
                  </p>
                  <p className="mt-2 text-lg font-bold text-text-main">
                    {selectedEquipped ? "Currently equipped" : "Owned · Ready to equip"}
                  </p>
                </div>
              </div>
            )}

            {isBundleSelected && selectedOwned && (
              <div className="mt-5 text-center text-sm font-semibold text-emerald-300">
                ✓ Complete collection archived
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[20px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[28px] sm:p-5">
          <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
            Vault notes
          </p>
          <div className="mt-4 space-y-4 text-sm leading-6 text-text-muted">
            <p>
              Theme packages now act like full environment presets rather
              than flat recolors. Use the preview pane to compare palettes
              before committing.
            </p>
            <p>
              Cursors and badges equip instantly from the item card or this
              rail. Your loadout syncs across sessions.
            </p>
            <p className="text-amber-300/80">
              🎁 Completed bundles show here with all contents. Partial
              bundles show progress toward completion.
            </p>
            <p className="text-fuchsia-300/80">
              💡 Try On lets you experience a theme's full atmosphere before
              equipping it to your session.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderLoadoutSummary = () => (
    <div className="mt-5 rounded-[20px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[28px] sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
        Active loadout
      </p>
      <div className="mt-4 space-y-3 text-sm text-text-muted">
        <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
          <span>Equipped theme</span>
          <span className="font-semibold text-text-main">
            {THEME_PACKAGES[theme].name}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
          <span>Cursor</span>
          <span className="font-semibold text-text-main flex items-center gap-2">
            {activeCursor?.icon} {activeCursor?.name || "Default"}
            {equippedCursor && (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">Equipped</span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
          <span>Badge</span>
          <span className="font-semibold text-text-main flex items-center gap-2">
            {activeBadge?.icon} {activeBadge?.name || "Inactive"}
            {equippedBadge && (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">Equipped</span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
          <span>Unlocked themes</span>
          <span className="font-semibold text-text-main">
            {THEME_OPTIONS.filter((t) => isThemeUnlocked(t.id, inventory)).length}/{THEME_OPTIONS.length}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 p-2 backdrop-blur-md animate-fade-in sm:p-4"
      style={{ animation: disableAnimations ? "none" : undefined }}
    >
      <div className="flex min-h-full items-start justify-center touch-pan-y">
        <div
          className="theme-panel-shell relative mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-hidden overscroll-contain rounded-[22px] border border-surface/80 bg-app shadow-[0_35px_120px_rgba(0,0,0,0.48)] sm:my-4 sm:h-[92vh] sm:rounded-[32px]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-95 sm:h-72">
            <div
              className="h-full w-full"
              style={{
                background: `
                  radial-gradient(circle at 18% 18%, rgba(16,185,129,0.18), transparent 26%),
                  radial-gradient(circle at 82% 18%, rgba(245,158,11,0.16), transparent 24%),
                  radial-gradient(circle at 50% 50%, ${RARITY_COLORS.legendary.glow} 0%, transparent 40%),
                  linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.18))
                `,
              }}
            />
          </div>

          <div className="relative flex items-start justify-between gap-4 border-b border-surface/70 px-4 py-4 sm:px-7 sm:py-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.34em] text-text-muted/60">
                Personal vault
              </p>
              <h2 className="mt-2 font-[var(--font-display)] text-xl font-black text-text-main sm:text-4xl">
                The Relic Vault
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">
                Your owned cosmetics, theme packages, and active loadout arranged
                as a single archive with try-on previews and bundle tracking.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-4">
                <CurrencyDisplay amount={nectarCurrency} currency="nectar" size="md" />
                <CurrencyDisplay amount={premiumCurrency} currency="premium" size="md" />
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface/80 bg-panel/75 text-lg text-text-muted transition-colors hover:text-text-main"
              >
                ✕
              </button>
            </div>
          </div>

          {animatedRotation.featuredItemIds.length > 0 && (
            <div className="relative mx-4 mt-4 rounded-[20px] border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-4 sm:mx-7 sm:rounded-[28px] sm:p-5">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5" />
              <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
                    🔄
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300">Daily Rotation</p>
                    <p className="text-sm font-semibold text-text-main">
                      {animatedRotation.featuredItemIds.length} featured items ·{" "}
                      {animatedRotation.featuredBundleIds.length} featured bundles
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setActiveCategory("bundles"); setSelectedItemId(null); }}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 px-4 text-xs font-bold uppercase tracking-[0.2em] text-amber-200 transition-colors hover:bg-amber-500/20"
                >
                  View Today's Featured
                </button>
              </div>
            </div>
          )}

          <div className="custom-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="relative flex flex-col gap-4 p-3 pb-5 sm:gap-5 sm:p-6 xl:grid xl:grid-cols-[250px_minmax(0,1fr)_300px] xl:items-start">
              <aside className="order-1 flex min-w-0 flex-col gap-4 sm:gap-5">
                <div className="order-3 overflow-hidden rounded-[20px] border border-surface/80 bg-black/20 p-3 backdrop-blur-md sm:order-1 sm:rounded-[28px] sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                    Vault keeper
                  </p>
                  <div className="mt-3 flex items-center gap-3 sm:mt-4 sm:gap-4 sm:items-start xl:flex-col xl:items-stretch">
                    <div className="relative shrink-0 overflow-hidden rounded-[18px] border border-primary/25 bg-panel/70 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:rounded-[24px] sm:p-3">
                      <img
                        src="/assets/shopkeeper.png"
                        alt="Quartermaster"
                        className="h-14 w-14 object-contain sm:h-24 sm:w-24 xl:h-28 xl:w-28"
                      />
                      <div className="pointer-events-none absolute inset-x-4 bottom-0 h-10 rounded-full bg-primary/20 blur-2xl" />
                    </div>
                    <div className="min-w-0 text-left">
                      <h3 className="text-sm font-black text-text-main sm:text-xl">
                        Quartermaster Vey
                      </h3>
                      <p className="mt-2 rounded-[16px] border border-primary/20 bg-primary/10 px-3 py-2 text-xs leading-5 text-text-main sm:mt-3 sm:rounded-[18px] sm:px-4 sm:py-3 sm:text-sm sm:leading-6">
                        "Everything you own lives here. Themes, cursors, badges — pick
                        what represents you today."
                      </p>
                    </div>
                  </div>
                </div>

                <div className="order-1 rounded-[20px] border border-surface/80 bg-black/20 p-3 backdrop-blur-md sm:rounded-[28px] sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                    Wallet & collection
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 xl:grid-cols-1">
                    <div className="rounded-[18px] border border-primary/20 bg-primary/10 px-4 py-4 sm:rounded-[20px]">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/60">
                        Nectar balance
                      </p>
                      <p className="mt-3 text-2xl font-black text-primary sm:text-3xl">
                        {nectarCurrency.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-amber-300/20 bg-amber-400/10 px-4 py-4 sm:rounded-[20px]">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/60">
                        Premium reserve
                      </p>
                      <p className="mt-3 text-2xl font-black text-amber-300 sm:text-3xl">
                        {premiumCurrency.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 sm:rounded-[20px] xl:col-span-2">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/60">
                        Collection progress
                      </p>
                      <p className="mt-3 text-2xl font-black text-emerald-300 sm:text-3xl">
                        {ownedItems.length} / {SHOP_ITEMS.length}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-4 sm:rounded-[20px] xl:col-span-2">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/60">
                        Bundles completed
                      </p>
                      <p className="mt-3 text-2xl font-black text-fuchsia-300 sm:text-3xl">
                        {SHOP_BUNDLES.filter((b) => isBundleOwned(inventory, b)).length} / {SHOP_BUNDLES.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="order-2 rounded-[20px] border border-surface/80 bg-black/20 p-3 backdrop-blur-md sm:rounded-[28px] sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                    Browse lanes
                  </p>
                  <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:mt-4 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                    {CATEGORY_ORDER.map((category) => {
                      const active = category === activeCategory;
                      const copy = CATEGORY_COPY[category];
                      const count = category === "all"
                        ? ownedItems.length
                        : category === "bundles"
                          ? SHOP_BUNDLES.filter((b) => isBundleOwned(inventory, b)).length
                          : (itemsByCategory[category] || []).length;
                      return (
                        <button
                          key={category}
                          onClick={() => {
                            setActiveCategory(category);
                            setSelectedItemId(null);
                          }}
                          className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-1.5 ${
                            active
                              ? "border-primary/35 bg-primary/20 text-primary"
                              : "border-surface/70 bg-panel/60 text-text-muted hover:text-text-main"
                          }`}
                        >
                          {copy.icon} {copy.label}
                          <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              <section className="order-2 min-w-0">
                <div className="rounded-[20px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[28px] sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                    {CATEGORY_COPY[activeCategory].eyebrow}
                  </p>
                  <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-text-main sm:text-2xl">
                        {CATEGORY_COPY[activeCategory].label}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                        {CATEGORY_COPY[activeCategory].blurb}
                      </p>
                    </div>
                    {selectedItem && (
                      <div className="rounded-[20px] border border-surface/70 bg-panel/55 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/55">
                          Currently viewing
                        </p>
                        <p className="mt-2 text-sm font-semibold text-text-main flex items-center gap-2">
                          {selectedItem.name}
                          <RarityBadge rarity={isBundleSelected ? (selectedItem as Bundle).rarity : selectedItem.rarity} size="sm" />
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 pb-2 sm:mt-5 sm:gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {visibleItems.length === 0 ? (
                    <div className="col-span-full rounded-[22px] border border-dashed border-surface/70 bg-black/20 px-5 py-10 text-center sm:rounded-[28px] sm:px-6 sm:py-12">
                      <div className="text-5xl opacity-60">
                        {activeCategory === "bundles" ? "🎁" : activeCategory === "theme" ? "🎨" : activeCategory === "cursor" ? "✨" : "🏷️"}
                      </div>
                      <p className="mt-4 text-lg font-semibold text-text-main">
                        {activeCategory === "bundles"
                          ? "No bundles acquired yet"
                          : `No ${CATEGORY_COPY[activeCategory].label.toLowerCase()} in your vault`}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-text-muted">
                        {activeCategory === "bundles"
                          ? "Purchase bundles from the Bazaar to complete collections."
                          : `Visit the Bazaar to acquire ${CATEGORY_COPY[activeCategory].label.toLowerCase()}.`}
                      </p>
                    </div>
                  ) : activeCategory === "bundles" ? (
                    (SHOP_BUNDLES.filter((b) => isBundleOwned(inventory, b)) as Bundle[]).map((bundle) => {
                      const owned = isBundleOwned(inventory, bundle);
                      const partial = isBundlePartiallyOwned(inventory, bundle) && !owned;
                      const selected = selectedItem?.id === bundle.id;

                      return (
                        <ItemCard
                          key={bundle.id}
                          item={bundle}
                          selected={selected}
                          owned={owned}
                          partiallyOwned={partial}
                          onSelect={() => setSelectedItemId(bundle.id)}
                          isBundle={true}
                        />
                      );
                    })
                  ) : (
                    (itemsByCategory[activeCategory] || []).map((item) => {
                      const owned = isItemOwned(inventory, item.id);
                      const selected = selectedItem?.id === item.id;
                      const equipped = item.category === "cursor" && equippedCursor === item.id ||
                        item.category === "badge" && equippedBadge === item.id;
                      const canEquip = item.category === "cursor" || item.category === "badge";
                      const canTryOn = item.category === "theme";

                      return (
                        <ItemCard
                          key={item.id}
                          item={item}
                          selected={selected}
                          owned={owned}
                          onSelect={() => setSelectedItemId(item.id)}
                          isBundle={false}
                          onEquip={canEquip && !equipped ? handleEquip : undefined}
                          onUnequip={canEquip && equipped ? handleEquip : undefined}
                          equipped={equipped}
                          onTryOn={canTryOn ? handleTryOn : undefined}
                        />
                      );
                    })
                  )}
                </div>
              </section>

              <aside className="order-3 min-w-0">
                {renderThemePreview()}
                {renderItemInspection()}
                {renderLoadoutSummary()}
              </aside>
            </div>
          </div>
        </div>
      </div>

      {tryOnItem && (
        <TryOnPreview
          item={tryOnItem}
          theme={THEME_PACKAGES[theme]}
          onClose={() => setTryOnItem(null)}
        />
      )}
    </div>
  );
};

export default Stash;