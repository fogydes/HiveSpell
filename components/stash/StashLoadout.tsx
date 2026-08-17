import React from "react";
import {
  THEME_OPTIONS,
  isThemeUnlocked,
} from "../../data/customizationCatalog";
import { THEME_PACKAGES } from "../../data/themePackages";
import { useTranslation } from "react-i18next";
import type { UseStashReturn } from "./useStash";

type StashLoadoutProps = Pick<
  UseStashReturn,
  "theme" | "activeCursor" | "activeBadge" | "equippedCursor" | "equippedBadge" | "inventory"
>;

/** Right-rail summary of the player's currently equipped theme / cursor / badge. */
export const StashLoadout: React.FC<StashLoadoutProps> = ({
  theme,
  activeCursor,
  activeBadge,
  equippedCursor,
  equippedBadge,
  inventory,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-5 rounded-[20px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[28px] sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
        {t('stash.activeLoadout')}
      </p>
      <div className="mt-4 space-y-3 text-sm text-text-muted">
        <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
          <span>{t('stash.equippedTheme')}</span>
          <span className="font-semibold text-text-main">
            {THEME_PACKAGES[theme].name}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
          <span>{t('stash.cursor')}</span>
          <span className="font-semibold text-text-main flex items-center gap-2">
            {activeCursor?.icon} {activeCursor?.name || t('stash.default')}
            {equippedCursor && (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">{t('stash.equipped')}</span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
          <span>{t('stash.badge')}</span>
          <span className="font-semibold text-text-main flex items-center gap-2">
            {activeBadge?.icon} {activeBadge?.name || t('stash.inactive')}
            {equippedBadge && (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">{t('stash.equipped')}</span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
          <span>{t('stash.unlockedThemes')}</span>
          <span className="font-semibold text-text-main">
            {THEME_OPTIONS.filter((themeOption) => isThemeUnlocked(themeOption.id, inventory)).length}/{THEME_OPTIONS.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StashLoadout;
