import React from "react";
import {
  SHOP_ITEMS,
  type CustomizationItem,
  type Bundle,
  isItemOwned,
  BUNDLE_CATALOG,
} from "../../data/customizationCatalog";
import { useTranslation } from "react-i18next";
import { RarityBadge, CurrencyDisplay, categoryBorder } from "./StashShared";
import type { UseStashReturn } from "./useStash";

type StashInspectorProps = Pick<
  UseStashReturn,
  "selectedItem" | "isBundleSelected" | "selectedOwned" | "selectedEquipped" | "inventory"
>;

/** Right-rail detail panel for the currently selected item or bundle. */
export const StashInspector: React.FC<StashInspectorProps> = ({
  selectedItem,
  isBundleSelected,
  selectedOwned,
  selectedEquipped,
  inventory,
}) => {
  const { t } = useTranslation();

  if (!selectedItem) {
    return (
      <div className="rounded-[28px] border border-dashed border-surface/80 bg-black/20 p-8 text-center text-text-muted">
        {t('stash.selectItemToInspect')}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[20px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[28px] sm:p-5">
        <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
          {t('stash.inspectionRail')}
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
                {isBundleSelected
                  ? t('stash.bundleLabel')
                  : t(`stash.categoryEyebrows.${"category" in selectedItem ? selectedItem.category : "theme"}`)}
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
                  {t('stash.originalPrice')}
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
                  {t('stash.status')}
                </p>
                <p className="mt-2 text-lg font-bold text-text-main">
                  {selectedEquipped ? t('stash.currentlyEquipped') : t('stash.ownedReadyToEquip')}
                </p>
              </div>
            </div>
          )}

          {isBundleSelected && selectedOwned && (
            <div className="mt-5 text-center text-sm font-semibold text-emerald-300">
              {t('stash.completeCollectionArchived')}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[20px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[28px] sm:p-5">
        <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
          {t('stash.vaultNotes')}
        </p>
        <div className="mt-4 space-y-4 text-sm leading-6 text-text-muted">
          <p>
            {t('stash.themePresetsNote')}
          </p>
          <p>
            {t('stash.cursorsBadgesNote')}
          </p>
          <p className="text-amber-300/80">
            {t('stash.bundlesNote')}
          </p>
          <p className="text-fuchsia-300/80">
            {t('stash.tryOnNote')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StashInspector;
