import React, { useState, useRef } from "react";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  SHOP_BUNDLES,
  type CustomizationItem,
  type Bundle,
  isItemOwned,
  isBundleOwned,
  isBundlePartiallyOwned,
  RARITY_COLORS,
} from "../../data/customizationCatalog";
import { useTranslation } from "react-i18next";
import { RarityBadge, CurrencyDisplay, categoryTone } from "./StashShared";
import type { UseStashReturn } from "./useStash";

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
  const { t } = useTranslation();
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

  const reduceMotion = useReduceMotion();
  const { performanceTier } = useScene();
  const disableAnimations = performanceTier === "static" || reduceMotion;
  const cardRef = useRef<HTMLButtonElement>(null);
  const equippedRef = useRef<HTMLSpanElement>(null);
  const prevEquippedRef = useRef(equipped);

  // "Equip pop": the ✓ indicator springs in the moment this item becomes equipped.
  // Skips the initial render so already-equipped items don't pop on modal open.
  useGSAP(
    () => {
      const el = equippedRef.current;
      const wasEquipped = prevEquippedRef.current;
      prevEquippedRef.current = equipped;
      if (disableAnimations || !el || !equipped || wasEquipped) return;
      gsap.fromTo(
        el,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.5)" },
      );
    },
    { dependencies: [equipped], scope: cardRef },
  );

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onSelect();
  };

  return (
    <button
      ref={cardRef}
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
          <RarityBadge rarity={rarity} size="sm" animateIn={!disableAnimations} />
        </div>
        <h4 className="mt-4 text-base font-black text-text-main sm:mt-5 sm:text-lg">{itemName}</h4>
        <p className="mt-3 min-h-0 text-sm leading-6 text-text-muted sm:min-h-[72px]">{itemDescription}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <CurrencyDisplay amount={itemPrice} currency={itemCurrency} size="sm" />
          {equipped && (
            <span ref={equippedRef} className="text-xs font-bold text-emerald-300">✓ {t('stash.equipped')}</span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {onEquip && !equipped && (
            <button
              onClick={(e) => { e.stopPropagation(); onEquip(); }}
              className="flex-1 h-10 rounded-full border border-primary/30 bg-primary/18 text-xs font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/28"
            >
              {t('stash.equipButton')}
            </button>
          )}
          {onUnequip && equipped && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnequip(); }}
              className="flex-1 h-10 rounded-full border border-amber-300/30 bg-amber-400/12 text-xs font-bold uppercase tracking-[0.18em] text-amber-200 transition-colors hover:bg-amber-400/20"
            >
              {t('stash.unequipButton')}
            </button>
          )}
          {onTryOn && !equipped && (
            <button
              onClick={(e) => { e.stopPropagation(); onTryOn(); }}
              className="flex-1 h-10 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/12 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-200 transition-colors hover:bg-fuchsia-500/20"
            >
              {t('stash.tryOnButton')}
            </button>
          )}
          {!onEquip && !onUnequip && !onTryOn && (
            <div className="text-center text-sm font-semibold text-emerald-300">
              {t('stash.ownedLabel')}
            </div>
          )}
        </div>

        {partiallyOwned && !owned && (
          <div className="mt-4 text-center text-sm font-semibold text-amber-300">
            ⟳ {t('stash.partiallyOwned')}
          </div>
        )}
      </div>
    </button>
  );
};

type StashItemGridProps = Pick<
  UseStashReturn,
  | "activeCategory"
  | "selectedItem"
  | "isBundleSelected"
  | "visibleItems"
  | "inventory"
  | "equippedCursor"
  | "equippedBadge"
  | "handleEquip"
  | "handleTryOn"
  | "setSelectedItemId"
>;

/** Center column: category header + the browsable grid of owned items / bundles. */
export const StashItemGrid: React.FC<StashItemGridProps> = ({
  activeCategory,
  selectedItem,
  isBundleSelected,
  visibleItems,
  inventory,
  equippedCursor,
  equippedBadge,
  handleEquip,
  handleTryOn,
  setSelectedItemId,
}) => {
  const { t } = useTranslation();

  return (
    <section className="order-2 min-w-0">
      <div className="rounded-[20px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[28px] sm:p-5">
        <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
          {t(`stash.categoryEyebrows.${activeCategory}`)}
        </p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-text-main sm:text-2xl">
              {t(`stash.categories.${activeCategory}`)}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              {t(`stash.categoryBlurbs.${activeCategory}`)}
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

      <div className="mt-4 grid gap-3 pb-2 sm:mt-5 sm:gap-4 sm:grid-cols-2 2xl:grid-cols-3 min-h-[400px] content-start">
        {visibleItems.length === 0 ? (
          <div className="col-span-full rounded-[22px] border border-dashed border-surface/70 bg-black/20 px-5 py-10 text-center sm:rounded-[28px] sm:px-6 sm:py-12">
            <div className="text-5xl opacity-60">
              {activeCategory === "bundles" ? "🎁" : activeCategory === "theme" ? "🎨" : activeCategory === "cursor" ? "✨" : "🏷️"}
            </div>
            <p className="mt-4 text-lg font-semibold text-text-main">
              {activeCategory === "bundles"
                ? t('stash.noBundlesAcquired')
                : t('stash.noItemsInVault', { category: t(`stash.categories.${activeCategory}`).toLowerCase() })}
            </p>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {activeCategory === "bundles"
                ? t('stash.purchaseBundlesFromBazaar')
                : t('stash.visitBazaarToAcquire', { category: t(`stash.categories.${activeCategory}`).toLowerCase() })}
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
          (visibleItems as CustomizationItem[]).map((item) => {
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
  );
};

export default StashItemGrid;
