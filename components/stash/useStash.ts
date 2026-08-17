import { useMemo, useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import {
  SHOP_BUNDLES,
  type CustomizationItem,
  type Bundle,
  isItemOwned,
  isBundleOwned,
  getTodaysRotation,
  ITEM_CATALOG,
} from "../../data/customizationCatalog";
import { type ThemeId } from "../../data/themePackages";
import { CATEGORY_ORDER, type StashCategory } from "./StashShared";

/**
 * Owns all of the Stash modal's selection / equip / preview state and the
 * derivations built on top of it. The presentational Stash components
 * (StashLayout, StashItemGrid, StashInspector, StashThemePreview, StashLoadout)
 * are thin consumers of this hook's return value.
 */
export const useStash = () => {
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

  const inventory = userData?.inventory ?? [];
  const premiumCurrency = userData?.premium ?? 0;
  const nectarCurrency = userData?.nectar ?? 0;

  const [activeCategory, setActiveCategory] = useState<StashCategory>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [tryOnItem, setTryOnItem] = useState<CustomizationItem | Bundle | null>(null);
  // themePreviewId is frozen at the mount theme; the live-preview panel compares
  // it against the active theme to decide whether to surface an "Apply" button.
  const [themePreviewId] = useState<ThemeId | null>(theme);

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
  }, [activeCategory, ownedItems, itemsByCategory, inventory]);

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

  return {
    theme,
    setTheme,
    equippedCursor,
    equippedBadge,
    disableAnimations,
    inventory,
    premiumCurrency,
    nectarCurrency,
    activeCategory,
    setActiveCategory,
    setSelectedItemId,
    tryOnItem,
    setTryOnItem,
    themePreviewId,
    animatedRotation,
    ownedItems,
    itemsByCategory,
    activeCursor,
    activeBadge,
    visibleItems,
    selectedItem,
    isBundleSelected,
    selectedOwned,
    selectedEquipped,
    handleEquip,
    handleTryOn,
  };
};

export type UseStashReturn = ReturnType<typeof useStash>;
