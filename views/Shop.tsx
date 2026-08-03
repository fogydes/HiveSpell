import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
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
} from "../data/customizationCatalog";

type ShopCategory = "all" | CustomizationCategory | "bundles";

const CATEGORY_COPY: Record<
  ShopCategory,
  { label: string; blurb: string; eyebrow: string; icon: string }
> = {
  all: {
    label: "Full catalogue",
    blurb: "Every cosmetic currently circulating through the bazaar.",
    eyebrow: "Bazaar sweep",
    icon: "🛍️",
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
    label: "Curated bundles",
    blurb: "Thematic collections at a steep discount — limited availability.",
    eyebrow: "Collection",
    icon: "🎁",
  },
};

const CATEGORY_ORDER: ShopCategory[] = ["all", "theme", "cursor", "badge", "bundles"];

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

const PurchaseButton: React.FC<{
  item: CustomizationItem | Bundle;
  owned: boolean;
  onPurchased: () => void;
  isBundle?: boolean;
  canAfford?: boolean;
}> = ({ item, owned, onPurchased, isBundle = false, canAfford: canAffordProp }) => {
  const { refreshUser, user, userData } = useAuth();
  const { showToast } = useToast();
  const [buying, setBuying] = useState(false);
  const canAfford = canAffordProp ?? (isBundle
    ? (item as Bundle).currency === "nectar"
      ? (userData?.nectar ?? 0) >= (item as Bundle).price
      : (userData?.premium ?? 0) >= (item as Bundle).price
    : (item.currency === "nectar" ? (userData?.nectar ?? 0) : (userData?.premium ?? 0)) >= item.price);
  const itemCurrency = isBundle ? (item as Bundle).currency : item.currency;

  const handleBuy = async () => {
    if (buying || !user || owned || !canAfford) return;
    setBuying(true);

    try {
      if (isBundle) {
        const bundle = item as Bundle;
        const { data, error } = await supabase.rpc("purchase_bundle", {
          p_user_id: user.uid,
          bundle_id: bundle.id,
          cost: bundle.price,
          currency: bundle.currency,
        });

        if (error) throw error;

        if (data && data.success) {
          showToast({
            title: "Bundle acquired",
            message: `${bundle.name} added to your stash.`,
            variant: "success",
          });
          await refreshUser();
          onPurchased();
        } else {
          showToast({
            title: "Purchase failed",
            message: data?.message || "Your transaction could not be completed.",
            variant: "error",
          });
        }
      } else {
        const shopItem = item as CustomizationItem;
        const { data, error } = await supabase.rpc("purchase_item", {
          p_user_id: user.uid,
          item_id: shopItem.id,
          cost: shopItem.price,
          category: shopItem.category,
        });

        if (error) throw error;

        if (data && data.success) {
          showToast({
            title: "Purchase complete",
            message: `${shopItem.name} is now in your stash.`,
            variant: "success",
          });
          await refreshUser();
          onPurchased();
        } else {
          showToast({
            title: "Purchase failed",
            message: data?.message || "Your transaction could not be completed.",
            variant: "error",
          });
        }
      }
    } catch (err: any) {
      console.error("Purchase error details:", JSON.stringify(err, null, 2));
      showToast({
        title: "Transaction failed",
        message: err.message || "Unknown error",
        variant: "error",
      });
    } finally {
      setBuying(false);
    }
  };

  const rarity = isBundle ? (item as Bundle).rarity : item.rarity;
  const colors = RARITY_COLORS[rarity];

  return (
    <button
      onClick={handleBuy}
      disabled={buying || owned || !canAfford}
      className={`inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-sm font-bold uppercase tracking-[0.22em] transition-all ${
        buying || owned || !canAfford
          ? "cursor-not-allowed border border-surface/70 bg-surface/35 text-text-muted"
          : `border ${colors.border} bg-gradient-to-r ${colors.bg.replace("bg-", "from-").replace("/10", "/20")} ${colors.text} hover:from-opacity-30 hover:to-opacity-30 shadow-[0_18px_36px_${colors.glow}]`
      }`}
      style={{
        boxShadow: buying || owned || !canAfford ? undefined : `0 18px 36px ${colors.glow}`,
      }}
    >
      {owned
        ? "Already owned"
        : !canAfford
          ? `Need ${itemCurrency === "nectar" ? "nectar" : "premium"}`
          : buying
            ? "Processing"
            : `Acquire · ${item.price.toLocaleString()} ${itemCurrency === "nectar" ? "🍯" : "💎"}`}
    </button>
  );
};

const ItemCard: React.FC<{
  item: CustomizationItem | Bundle;
  selected: boolean;
  owned: boolean;
  partiallyOwned?: boolean;
  onSelect: () => void;
  onPurchase: () => void;
  isBundle?: boolean;
  canAfford?: boolean;
}> = ({ item, selected, owned, partiallyOwned, onSelect, onPurchase, isBundle = false, canAfford }) => {
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

  return (
    <button
      onClick={onSelect}
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
          {!owned && (
            <span
              className={`text-xs font-bold uppercase tracking-[0.2em] ${
                canAfford ? "text-primary" : "text-red-300"
              }`}
            >
              {canAfford ? "Affordable" : "Insufficient funds"}
            </span>
          )}
        </div>
        {!owned && (
          <div className="mt-4">
            <PurchaseButton item={item} owned={owned} onPurchased={onPurchase} isBundle={isBundle} />
          </div>
        )}
        {owned && (
          <div className="mt-4 text-center text-sm font-semibold text-emerald-300">
            ✓ Owned
          </div>
        )}
        {partiallyOwned && !owned && (
          <div className="mt-4 text-center text-sm font-semibold text-amber-300">
            ⟳ Partially owned
          </div>
        )}
      </div>
    </button>
  );
};

const TryOnPreview: React.FC<{
  item: CustomizationItem | Bundle | null;
  theme: any;
  onClose: () => void;
}> = ({ item, theme, onClose }) => {
  if (!item || ("category" in item && item.category !== "theme")) return null;

  const { performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const disableAnimations = performanceTier === "static" || reduceMotion;

  const isBundle = "items" in item;
  const themeId = isBundle ? (item as Bundle).items.find((id: string) => id.startsWith("theme_")) : item.id;
  const themePackage = themeId ? (window as any).__THEME_PACKAGES__?.[themeId] : null;

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
                      border: `1px solid ${themePackage.colors.border}`,
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

export const Shop: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { userData } = useAuth();
  const { theme } = useSettings();
  const { performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const disableAnimations = performanceTier === "static" || reduceMotion;
  const [activeCategory, setActiveCategory] = useState<ShopCategory>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [tryOnItem, setTryOnItem] = useState<CustomizationItem | Bundle | null>(null);
  const inventory = userData?.inventory ?? [];
  const premiumCurrency = userData?.premium ?? 0;
  const nectarCurrency = userData?.nectar ?? 0;

  const rotation = useMemo(() => getTodaysRotation(), []);
  const [animatedRotation, setAnimatedRotation] = useState(rotation);

  useEffect(() => {
    setAnimatedRotation(getTodaysRotation());
  }, []);

  const visibleItems = useMemo(() => {
    if (activeCategory === "all") return SHOP_ITEMS;
    if (activeCategory === "bundles") return SHOP_BUNDLES;
    return SHOP_ITEMS.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const visibleBundles = useMemo(() => SHOP_BUNDLES, []);

  const selectedItem =
    (activeCategory === "bundles"
      ? visibleBundles.find((b) => b.id === selectedItemId)
      : visibleItems.find((item) => item.id === selectedItemId)) ??
    (activeCategory === "bundles" ? visibleBundles[0] : visibleItems[0]) ??
    SHOP_ITEMS[0];

  const isBundleSelected = activeCategory === "bundles" || (selectedItem && "items" in selectedItem);
  const selectedOwned = isBundleSelected
    ? isBundleOwned(inventory, selectedItem as Bundle)
    : isItemOwned(inventory, selectedItem?.id ?? "");
  const partiallyOwned = isBundleSelected
    ? isBundlePartiallyOwned(inventory, selectedItem as Bundle) && !selectedOwned
    : false;

  const handlePurchase = useCallback(() => {
    if (isBundleSelected) {
      // Bundle purchase handled by PurchaseButton
    } else {
      // Item purchase handled by PurchaseButton
    }
  }, [isBundleSelected]);

  const handleTryOn = useCallback((item: CustomizationItem | Bundle) => {
    if (!isBundleSelected && "category" in item && item.category === "theme") {
      setTryOnItem(item);
    }
  }, [isBundleSelected]);

  const canAffordSelected = !selectedOwned && (() => {
    if (isBundleSelected && selectedItem) {
      const bundle = selectedItem as Bundle;
      return bundle.currency === "nectar"
        ? (userData?.nectar ?? 0) >= bundle.price
        : (userData?.premium ?? 0) >= bundle.price;
    }
    if (selectedItem && "currency" in selectedItem) {
      const item = selectedItem as CustomizationItem;
      return item.currency === "nectar"
        ? (userData?.nectar ?? 0) >= item.price
        : (userData?.premium ?? 0) >= item.price;
    }
    return false;
  })();

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 p-2 backdrop-blur-md animate-fade-in sm:p-4"
      style={{ animation: disableAnimations ? "none" : undefined }}
    >
      <div className="flex min-h-full items-start justify-center touch-pan-y">
        <div
          className="theme-panel-shell relative mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-hidden overscroll-contain rounded-[22px] border border-surface/80 bg-app shadow-[0_35px_120px_rgba(0,0,0,0.48)] sm:my-4 sm:h-[92vh] sm:rounded-[32px]"
        >
          {/* Animated Background */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-95 sm:h-72">
            <div
              className="h-full w-full"
              style={{
                background: `
                  radial-gradient(circle at 18% 18%, rgba(245,158,11,0.18), transparent 26%),
                  radial-gradient(circle at 82% 18%, rgba(16,185,129,0.15), transparent 24%),
                  radial-gradient(circle at 50% 50%, ${RARITY_COLORS.legendary.glow} 0%, transparent 40%),
                  linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.18))
                `,
              }}
            />
          </div>

          {/* Header */}
          <div className="relative flex items-start justify-between gap-4 border-b border-surface/70 px-4 py-4 sm:px-7 sm:py-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.34em] text-text-muted/60">
                Curated marketplace
              </p>
              <h2 className="mt-2 font-[var(--font-display)] text-xl font-black text-text-main sm:text-4xl">
                The Aetheric Bazaar
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">
                A denser, more atmospheric storefront built around featured
                cosmetics, nectar economy, and a proper item inspection rail.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Currency Display */}
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

          {/* Daily Rotation Banner */}
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
                  onClick={() => setActiveCategory("bundles")}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 px-4 text-xs font-bold uppercase tracking-[0.2em] text-amber-200 transition-colors hover:bg-amber-500/20"
                >
                  View Featured
                </button>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="custom-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="relative flex flex-col gap-4 p-3 pb-5 sm:gap-5 sm:p-6 xl:grid xl:grid-cols-[250px_minmax(0,1fr)_300px] xl:items-start">
              {/* Left Sidebar */}
              <aside className="order-1 flex min-w-0 flex-col gap-4 sm:gap-5">
                {/* Shopkeeper */}
                <div className="order-3 overflow-hidden rounded-[20px] border border-surface/80 bg-black/20 p-3 backdrop-blur-md sm:order-1 sm:rounded-[28px] sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                    Bazaar guide
                  </p>
                  <div className="mt-3 flex items-center gap-3 sm:mt-4 sm:gap-4 sm:items-start xl:flex-col xl:items-stretch">
                    <div className="relative shrink-0 overflow-hidden rounded-[18px] border border-primary/25 bg-panel/70 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:rounded-[24px] sm:p-3">
                      <img
                        src="/assets/shopkeeper.png"
                        alt="Shopkeeper"
                        className="h-14 w-14 object-contain sm:h-24 sm:w-24 xl:h-28 xl:w-28"
                      />
                      <div className="pointer-events-none absolute inset-x-4 bottom-0 h-10 rounded-full bg-primary/20 blur-2xl" />
                    </div>
                    <div className="min-w-0 text-left">
                      <h3 className="text-sm font-black text-text-main sm:text-xl">
                        Quartermaster Vey
                      </h3>
                      <p className="mt-2 rounded-[16px] border border-primary/20 bg-primary/10 px-3 py-2 text-xs leading-5 text-text-main sm:mt-3 sm:rounded-[18px] sm:px-4 sm:py-3 sm:text-sm sm:leading-6">
                        "Browse slow. The rare pieces are the ones that change how
                        the whole hive feels."
                      </p>
                    </div>
                  </div>
                </div>

                {/* Wallet */}
                <div className="order-1 rounded-[20px] border border-surface/80 bg-black/20 p-3 backdrop-blur-md sm:rounded-[28px] sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                    Wallet & inventory
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
                        {SHOP_ITEMS.filter((item) => isItemOwned(inventory, item.id)).length} / {SHOP_ITEMS.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="order-2 rounded-[20px] border border-surface/80 bg-black/20 p-3 backdrop-blur-md sm:rounded-[28px] sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                    Browse lanes
                  </p>
                  <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:mt-4 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                    {CATEGORY_ORDER.map((category) => {
                      const active = category === activeCategory;
                      const copy = CATEGORY_COPY[category];
                      return (
                        <button
                          key={category}
                          onClick={() => {
                            setActiveCategory(category);
                            setSelectedItemId(null);
                          }}
                          className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${
                            active
                              ? "border-primary/35 bg-primary/20 text-primary"
                              : "border-surface/70 bg-panel/60 text-text-muted hover:text-text-main"
                          }`}
                        >
                          {copy.icon} {copy.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              {/* Center Grid */}
              <section className="order-2 min-w-0">
                {/* Category Header */}
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
                        <p className="mt-2 text-sm font-semibold text-text-main">
                          {selectedItem.name}
                          <RarityBadge rarity={isBundleSelected ? (selectedItem as Bundle).rarity : selectedItem.rarity} size="sm" />
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Grid */}
                <div className="mt-4 grid gap-3 pb-2 sm:mt-5 sm:gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {activeCategory === "bundles" ? (
                    visibleBundles.map((bundle) => {
                      const owned = isBundleOwned(inventory, bundle);
                      const partial = isBundlePartiallyOwned(inventory, bundle) && !owned;
                      const selected = selectedItem?.id === bundle.id;
                      const canAfford = !owned && ((bundle.currency === "nectar" ? (userData?.nectar ?? 0) : (userData?.premium ?? 0)) >= bundle.price);

                      return (
                        <ItemCard
                          key={bundle.id}
                          item={bundle}
                          selected={selected}
                          owned={owned}
                          partiallyOwned={partial}
                          onSelect={() => setSelectedItemId(bundle.id)}
                          onPurchase={handlePurchase}
                          isBundle={true}
                          canAfford={canAfford}
                        />
                      );
                    })
                  ) : (
                    visibleItems.map((item) => {
                      const owned = isItemOwned(inventory, item.id);
                      const selected = selectedItem?.id === item.id;
                      const canAfford = !owned && ((item.currency === "nectar" ? (userData?.nectar ?? 0) : (userData?.premium ?? 0)) >= item.price);

                      return (
                        <ItemCard
                          key={item.id}
                          item={item}
                          selected={selected}
                          owned={owned}
                          onSelect={() => setSelectedItemId(item.id)}
                          onPurchase={handlePurchase}
                          isBundle={false}
                          canAfford={canAfford}
                        />
                      );
                    })
                  )}
                </div>
              </section>

              {/* Right Inspection Rail */}
              <aside className="order-3 min-w-0">
                {selectedItem ? (
                  <div className="space-y-5">
                    {/* Item Inspection */}
                    <div className="overflow-hidden rounded-[20px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[28px] sm:p-5">
                      <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                        Inspection rail
                      </p>
                      <div
                        className={`mt-4 rounded-[20px] border p-4 sm:rounded-[26px] sm:p-5 ${categoryBorder(
                          isBundleSelected ? "bundles" : (selectedItem as CustomizationItem).category
                        )} bg-panel/50`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/6 text-3xl sm:h-16 sm:w-16 sm:rounded-[22px] sm:text-4xl">
                            {selectedItem.icon}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-surface/70 bg-panel/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
                              {isBundleSelected ? "Bundle" : (selectedItem as CustomizationItem).category}
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

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                          <div className="rounded-[18px] border border-surface/70 bg-black/25 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/55">
                              Price
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                              <CurrencyDisplay
                                amount={selectedItem.price}
                                currency={isBundleSelected ? (selectedItem as Bundle).currency : (selectedItem as CustomizationItem).currency}
                                size="md"
                              />
                              {(!isBundleSelected && (selectedItem as CustomizationItem).currency === "nectar") ||
                              (isBundleSelected && (selectedItem as Bundle).currency === "nectar") ? (
                                <span className="text-sm text-text-muted line-through">
                                  {(selectedItem.price * (1 + (isBundleSelected ? (selectedItem as Bundle).discount : 0) / 100)).toLocaleString()} 🍯
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="rounded-[18px] border border-surface/70 bg-black/25 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/55">
                              Ownership
                            </p>
                            <p className="mt-2 text-lg font-bold text-text-main">
                              {selectedOwned ? "Already archived" : partiallyOwned ? "Partially owned" : "Available now"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-col gap-3">
                          {!selectedOwned && (
                            <PurchaseButton
                              item={selectedItem}
                              owned={selectedOwned}
                              onPurchased={() => setSelectedItemId(selectedItem.id)}
                              isBundle={isBundleSelected}
                            />
                          )}
                          {!selectedOwned && !isBundleSelected && (selectedItem as CustomizationItem).category === "theme" && (
                            <button
                              onClick={() => handleTryOn(selectedItem as CustomizationItem)}
                              className="inline-flex h-12 items-center justify-center rounded-full border border-primary/30 bg-primary/18 px-6 text-sm font-bold uppercase tracking-[0.22em] text-primary transition-colors hover:bg-primary/28"
                            >
                              Try On Theme
                            </button>
                          )}
                          {selectedOwned && (
                            <div className="text-center text-sm font-semibold text-emerald-300">
                              ✓ Already in your collection
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bazaar Notes */}
                    <div className="rounded-[20px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[28px] sm:p-5">
                      <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                        Bazaar notes
                      </p>
                      <div className="mt-4 space-y-4 text-sm leading-6 text-text-muted">
                        <p>
                          Themes change the overall atmosphere, cursor arts alter how
                          movement feels, and badges sharpen identity in the social
                          surfaces.
                        </p>
                        <p>
                          Shop purchases feed directly into the stash and profile
                          loadout flow, so the next step after acquisition is always
                          equip, compare, or archive.
                        </p>
                        <p className="text-amber-300/80">
                          💎 Premium items require premium currency. Earn it through
                          competitive play or special events.
                        </p>
                        <p className="text-amber-300/80">
                          🎁 Bundles offer the best value — complete collections at a steep
                          discount. Some are time-limited.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-dashed border-surface/80 bg-black/20 p-8 text-center text-text-muted">
                    Select an item to inspect its details.
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* Try-On Modal */}
      {tryOnItem && (
        <TryOnPreview
          item={tryOnItem}
          theme={theme}
          onClose={() => setTryOnItem(null)}
        />
      )}
    </div>
  );
};

export default Shop;