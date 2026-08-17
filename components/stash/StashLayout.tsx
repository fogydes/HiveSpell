import React, { useEffect } from "react";
import {
  SHOP_ITEMS,
  SHOP_BUNDLES,
  isBundleOwned,
  RARITY_COLORS,
} from "../../data/customizationCatalog";
import { useTranslation } from "react-i18next";
import { CATEGORY_ICONS, CATEGORY_ORDER, CurrencyDisplay } from "./StashShared";
import type { UseStashReturn } from "./useStash";

type StashLayoutProps = Pick<
  UseStashReturn,
  | "disableAnimations"
  | "nectarCurrency"
  | "premiumCurrency"
  | "animatedRotation"
  | "setActiveCategory"
  | "setSelectedItemId"
  | "ownedItems"
  | "inventory"
  | "itemsByCategory"
  | "activeCategory"
> & {
  onClose: () => void;
  /** Widens the content grid to three columns when an item is selected. */
  hasSelection: boolean;
  /** Fullscreen try-on overlay, rendered as the last child so it stacks above the panel. */
  tryOn?: React.ReactNode;
  /** Center column + right inspection rail supplied by the orchestrator. */
  children: React.ReactNode;
};

/**
 * The Stash modal chrome: full-screen overlay, panel shell, header, daily
 * rotation banner, and the left "Quartermaster" sidebar. The content grid
 * (item grid + inspection rail) is injected via {children}.
 */
export const StashLayout: React.FC<StashLayoutProps> = ({
  disableAnimations,
  nectarCurrency,
  premiumCurrency,
  animatedRotation,
  setActiveCategory,
  setSelectedItemId,
  ownedItems,
  inventory,
  itemsByCategory,
  activeCategory,
  onClose,
  hasSelection,
  tryOn,
  children,
}) => {
  const { t } = useTranslation();

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 p-2 backdrop-blur-md animate-fade-in sm:p-4"
      style={{ animation: disableAnimations ? "none" : undefined }}
      onClick={onClose}
    >
      <div className="flex min-h-full items-start justify-center touch-pan-y">
        <div
          className="theme-panel-shell relative mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-hidden overscroll-contain rounded-[22px] border border-surface/80 bg-app shadow-[0_35px_120px_rgba(0,0,0,0.48)] sm:my-4 sm:h-[92vh] sm:rounded-[32px]"
          onClick={(e) => e.stopPropagation()}
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
                {t('stash.personalVault')}
              </p>
              <h2 className="mt-2 font-[var(--font-display)] text-xl font-black text-text-main sm:text-4xl">
                {t('stash.relicVault')}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">
                {t('stash.vaultDescription')}
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
                    <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300">{t('stash.dailyRotation')}</p>
                    <p className="text-sm font-semibold text-text-main">
                      {t('stash.featuredItemsBundles', { itemCount: animatedRotation.featuredItemIds.length, bundleCount: animatedRotation.featuredBundleIds.length })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setActiveCategory("bundles"); setSelectedItemId(null); }}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 px-4 text-xs font-bold uppercase tracking-[0.2em] text-amber-200 transition-colors hover:bg-amber-500/20"
                >
                  {t('stash.viewTodaysFeatured')}
                </button>
              </div>
            </div>
          )}

          <div className="custom-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className={`relative flex flex-col gap-4 p-3 pb-5 sm:gap-5 sm:p-6 xl:grid ${hasSelection ? 'xl:grid-cols-[250px_minmax(0,1fr)_300px]' : 'xl:grid-cols-[250px_minmax(0,1fr)]'} xl:items-start transition-all duration-500`}>
              <aside className="order-1 flex min-w-0 flex-col gap-4 sm:gap-5">
                <div className="order-3 overflow-hidden rounded-[20px] border border-surface/80 bg-black/20 p-3 backdrop-blur-md sm:order-1 sm:rounded-[28px] sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                    {t('stash.vaultKeeper')}
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
                        {t('stash.vaultKeeperQuote')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="order-1 rounded-[20px] border border-surface/80 bg-black/20 p-3 backdrop-blur-md sm:rounded-[28px] sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                    {t('stash.walletAndCollection')}
                  </p>
                  <div className="mt-3 flex flex-col gap-3 sm:mt-4">
                    <div className="rounded-[18px] border border-primary/20 bg-primary/10 px-4 py-4 sm:rounded-[20px]">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/60">
                        {t('stash.nectarBalance')}
                      </p>
                      <p className="mt-3 text-2xl font-black text-primary sm:text-3xl">
                        {nectarCurrency.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-amber-300/20 bg-amber-400/10 px-4 py-4 sm:rounded-[20px]">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/60">
                        {t('stash.premiumReserve')}
                      </p>
                      <p className="mt-3 text-2xl font-black text-amber-300 sm:text-3xl">
                        {premiumCurrency.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 sm:rounded-[20px]">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/60">
                        {t('stash.collectionProgress')}
                      </p>
                      <p className="mt-3 text-2xl font-black text-emerald-300 sm:text-3xl">
                        {ownedItems.length} / {SHOP_ITEMS.length}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-4 sm:rounded-[20px]">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/60">
                        {t('stash.bundlesCompleted')}
                      </p>
                      <p className="mt-3 text-2xl font-black text-fuchsia-300 sm:text-3xl">
                        {SHOP_BUNDLES.filter((b) => isBundleOwned(inventory, b)).length} / {SHOP_BUNDLES.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="order-2 rounded-[20px] border border-surface/80 bg-black/20 p-3 backdrop-blur-md sm:rounded-[28px] sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                    {t('stash.browseLanes')}
                  </p>
                  <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:mt-4 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                    {CATEGORY_ORDER.map((category) => {
                      const active = category === activeCategory;
                      const icon = CATEGORY_ICONS[category];
                      const label = t(`stash.categories.${category}`);
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
                          {icon} {label}
                          <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              {children}
            </div>
          </div>
        </div>
      </div>

      {tryOn}
    </div>
  );
};

export default StashLayout;
