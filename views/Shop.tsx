import React, { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../services/supabase";
import {
  SHOP_ITEMS,
  type CustomizationCategory,
  type CustomizationItem,
  isItemOwned,
} from "../data/customizationCatalog";

type ShopCategory = "all" | CustomizationCategory;

const CATEGORY_COPY: Record<
  ShopCategory,
  { label: string; blurb: string; eyebrow: string }
> = {
  all: {
    label: "Full catalogue",
    blurb: "Every cosmetic currently circulating through the bazaar.",
    eyebrow: "Bazaar sweep",
  },
  theme: {
    label: "Theme chambers",
    blurb: "Scene-wide visual packages with stronger mood and identity.",
    eyebrow: "Atmosphere",
  },
  cursor: {
    label: "Cursor arts",
    blurb: "Pointer treatments and trails that alter the feel of navigation.",
    eyebrow: "Motion",
  },
  badge: {
    label: "Guild badges",
    blurb: "Compact profile marks that travel with your social surfaces.",
    eyebrow: "Identity",
  },
};

const CATEGORY_ORDER: ShopCategory[] = ["all", "theme", "cursor", "badge"];

const categoryTone = (category: CustomizationCategory) =>
  category === "theme"
    ? "from-fuchsia-500/20 via-primary/10 to-transparent"
    : category === "cursor"
      ? "from-sky-500/20 via-primary/10 to-transparent"
      : "from-amber-400/20 via-primary/10 to-transparent";

const categoryBorder = (category: CustomizationCategory) =>
  category === "theme"
    ? "border-fuchsia-400/25 text-fuchsia-200"
    : category === "cursor"
      ? "border-sky-400/25 text-sky-200"
      : "border-amber-300/25 text-amber-200";

const PurchaseButton: React.FC<{
  item: CustomizationItem;
  owned: boolean;
  onPurchased: () => void;
}> = ({ item, owned, onPurchased }) => {
  const { refreshUser, user, userData } = useAuth();
  const { showToast } = useToast();
  const [buying, setBuying] = useState(false);
  const canAfford = (userData?.nectar ?? 0) >= item.price;

  const handleBuy = async () => {
    if (buying || !user || owned || !canAfford) return;
    setBuying(true);

    try {
      const { data, error } = await supabase.rpc("purchase_item", {
        p_user_id: user.uid,
        item_id: item.id,
        cost: item.price,
        category: item.category,
      });

      if (error) throw error;

      if (data && data.success) {
        showToast({
          title: "Purchase complete",
          message: `${item.name} is now in your stash.`,
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

  return (
    <button
      onClick={handleBuy}
      disabled={buying || owned || !canAfford}
      className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold uppercase tracking-[0.22em] transition-all ${
        buying || owned || !canAfford
          ? "cursor-not-allowed border border-surface/70 bg-surface/35 text-text-muted"
          : "border border-primary/35 bg-primary/20 text-primary shadow-[0_18px_36px_rgba(var(--primary-rgb),0.24)] hover:-translate-y-0.5 hover:bg-primary/30"
      }`}
    >
      {owned
        ? "Already owned"
        : !canAfford
          ? "Not enough nectar"
          : buying
            ? "Processing"
            : `Acquire · ${item.price}`}
    </button>
  );
};

export const Shop: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { userData } = useAuth();
  const [activeCategory, setActiveCategory] = useState<ShopCategory>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const inventory = userData?.inventory ?? [];
  const ownedCount = SHOP_ITEMS.filter((item) => isItemOwned(inventory, item.id)).length;

  const visibleItems = useMemo(
    () =>
      activeCategory === "all"
        ? SHOP_ITEMS
        : SHOP_ITEMS.filter((item) => item.category === activeCategory),
    [activeCategory],
  );

  const selectedItem =
    visibleItems.find((item) => item.id === selectedItemId) ??
    visibleItems[0] ??
    SHOP_ITEMS[0];
  const selectedOwned = selectedItem
    ? isItemOwned(inventory, selectedItem.id)
    : false;
  const handlePanelWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.currentTarget.scrollTop += event.deltaY;
  };
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 p-2 backdrop-blur-md animate-fade-in sm:p-4"
    >
      <div className="flex min-h-full items-start justify-center touch-pan-y">
        <div
          className="theme-panel-shell custom-scrollbar relative mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-y-auto overscroll-contain rounded-[24px] border border-surface/80 bg-app shadow-[0_35px_120px_rgba(0,0,0,0.48)] sm:my-4 sm:h-[92vh] sm:rounded-[32px]"
          onWheel={handlePanelWheel}
        >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-95 sm:h-72">
          <div className="h-full w-full bg-[radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.18),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(16,185,129,0.15),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.18))]" />
        </div>

        <div className="relative flex items-start justify-between gap-4 border-b border-surface/70 px-4 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.34em] text-text-muted/60">
              Curated marketplace
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-2xl font-black text-text-main sm:text-4xl">
              The Aetheric Bazaar
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">
              A denser, more atmospheric storefront built around featured
              cosmetics, nectar economy, and a proper item inspection rail.
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface/80 bg-panel/75 text-lg text-text-muted transition-colors hover:text-text-main"
          >
            ✕
          </button>
        </div>

        <div className="relative grid gap-5 p-4 sm:p-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="flex flex-col gap-5">
            <div className="overflow-hidden rounded-[28px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                Bazaar guide
              </p>
              <div className="mt-4 flex flex-col gap-4">
                <div className="relative mx-auto overflow-hidden rounded-[24px] border border-primary/25 bg-panel/70 p-3 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
                  <img
                    src="/assets/shopkeeper.png"
                    alt="Shopkeeper"
                    className="h-28 w-28 object-contain sm:h-32 sm:w-32"
                  />
                  <div className="pointer-events-none absolute inset-x-4 bottom-0 h-10 rounded-full bg-primary/20 blur-2xl" />
                </div>
                <div className="min-w-0 text-center xl:text-left">
                  <h3 className="text-xl font-black text-text-main">
                    Quartermaster Vey
                  </h3>
                  <p className="mt-3 rounded-[18px] border border-primary/20 bg-primary/10 px-4 py-3 text-sm leading-6 text-text-main">
                    “Browse slow. The rare pieces are the ones that change how
                    the whole hive feels.”
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                Wallet and inventory
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[22px] border border-primary/20 bg-primary/10 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/60">
                    Nectar balance
                  </p>
                  <p className="mt-3 text-3xl font-black text-primary">
                    {userData?.nectar?.toLocaleString() ?? 0}
                  </p>
                </div>
                <div className="rounded-[22px] border border-surface/70 bg-panel/55 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/60">
                    Items owned
                  </p>
                  <p className="mt-3 text-3xl font-black text-text-main">
                    {ownedCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                Browse lanes
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {CATEGORY_ORDER.map((category) => {
                  const active = category === activeCategory;
                  const copy = CATEGORY_COPY[category];
                  return (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${
                        active
                          ? "border-primary/35 bg-primary/20 text-primary"
                          : "border-surface/70 bg-panel/60 text-text-muted hover:text-text-main"
                      }`}
                    >
                      {copy.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="rounded-[28px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                {CATEGORY_COPY[activeCategory].eyebrow}
              </p>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-2xl font-black text-text-main">
                    {CATEGORY_COPY[activeCategory].label}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                    {CATEGORY_COPY[activeCategory].blurb}
                  </p>
                </div>
                {selectedItem && (
                  <div className="rounded-[20px] border border-surface/70 bg-panel/55 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/55">
                      Featured relic
                    </p>
                    <p className="mt-2 text-sm font-semibold text-text-main">
                      {selectedItem.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-4 pb-2 sm:grid-cols-2 2xl:grid-cols-3">
              {visibleItems.map((item) => {
                const owned = isItemOwned(inventory, item.id);
                const selected = selectedItem?.id === item.id;
                const affordable = (userData?.nectar ?? 0) >= item.price;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`group relative overflow-hidden rounded-[28px] border p-5 text-left transition-all ${
                      selected
                        ? "border-primary/35 bg-primary/10 shadow-[0_20px_40px_rgba(var(--primary-rgb),0.16)]"
                        : owned
                          ? "border-emerald-400/20 bg-emerald-400/8"
                          : "border-surface/80 bg-black/20 hover:border-primary/20 hover:bg-panel/40"
                    }`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br opacity-80 ${categoryTone(item.category)}`}
                    />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/6 text-3xl shadow-[0_16px_30px_rgba(0,0,0,0.24)]">
                          {item.icon}
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${categoryBorder(item.category)}`}
                        >
                          {item.category}
                        </span>
                      </div>
                      <h4 className="mt-5 text-lg font-black text-text-main">
                        {item.name}
                      </h4>
                      <p className="mt-3 min-h-[72px] text-sm leading-6 text-text-muted">
                        {item.description}
                      </p>
                      <div className="mt-5 flex items-center justify-between gap-3">
                        <div className="rounded-full border border-surface/60 bg-panel/65 px-4 py-2 text-sm font-semibold text-text-main">
                          {owned ? "Owned" : `${item.price.toLocaleString()} nectar`}
                        </div>
                        {!owned && (
                          <span
                            className={`text-xs font-bold uppercase tracking-[0.2em] ${
                              affordable ? "text-primary" : "text-red-300"
                            }`}
                          >
                            {affordable ? "Affordable" : "Short on nectar"}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="min-w-0">
            {selectedItem ? (
              <div className="space-y-5">
                <div className="overflow-hidden rounded-[28px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                    Inspection rail
                  </p>
                  <div
                    className={`mt-4 rounded-[26px] border p-5 ${categoryBorder(selectedItem.category)} bg-panel/50`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 bg-white/6 text-4xl">
                        {selectedItem.icon}
                      </div>
                      <span className="rounded-full border border-surface/70 bg-panel/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
                        {selectedItem.category}
                      </span>
                    </div>
                    <h3 className="mt-5 text-2xl font-black text-text-main">
                      {selectedItem.name}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-text-muted">
                      {selectedItem.description}
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <div className="rounded-[18px] border border-surface/70 bg-black/25 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/55">
                          Price
                        </p>
                        <p className="mt-2 text-2xl font-black text-accent">
                          {selectedItem.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-[18px] border border-surface/70 bg-black/25 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/55">
                          Ownership
                        </p>
                        <p className="mt-2 text-lg font-bold text-text-main">
                          {selectedOwned ? "Already archived" : "Available now"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5">
                      <PurchaseButton
                        item={selectedItem}
                        owned={selectedOwned}
                        onPurchased={() => setSelectedItemId(selectedItem.id)}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
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
  );
};
