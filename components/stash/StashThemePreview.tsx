import React from "react";
import { isThemeUnlocked } from "../../data/customizationCatalog";
import { THEME_PACKAGES } from "../../data/themePackages";
import { useTranslation } from "react-i18next";
import type { UseStashReturn } from "./useStash";

type StashThemePreviewProps = Pick<
  UseStashReturn,
  "activeCategory" | "themePreviewId" | "theme" | "setTheme" | "inventory"
>;

/**
 * Right-rail live theme palette preview. Only renders for the "theme"/"all"
 * lanes and surfaces an "Apply" button when the previewed theme differs from
 * the active one.
 */
export const StashThemePreview: React.FC<StashThemePreviewProps> = ({
  activeCategory,
  themePreviewId,
  theme,
  setTheme,
  inventory,
}) => {
  const { t } = useTranslation();

  if (activeCategory !== "theme" && activeCategory !== "all") return null;
  if (!themePreviewId) return null;

  const themePkg = THEME_PACKAGES[themePreviewId];

  return (
    <div className="mb-5">
      <div className="overflow-hidden rounded-[20px] border border-surface/80 p-4 sm:rounded-[28px] sm:p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
              {t('stash.livePreview')}
            </p>
            <h3 className="mt-2 text-lg font-black text-text-main">
              {themePkg?.name || t('stash.selectTheme')}
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
              {themePreviewId === theme ? t('stash.equipped') : t('stash.apply')}
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
                {themePkg?.name || t('stash.themePreview')}
              </p>
              <p className="mt-2 text-sm text-text-muted" style={{
                color: themePkg?.colors.textMuted || "rgba(255,255,255,0.6)"
              }}>
                {t('stash.clickToPreview')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StashThemePreview;
