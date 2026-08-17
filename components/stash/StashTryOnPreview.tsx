import React from "react";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import {
  type CustomizationItem,
  type Bundle,
} from "../../data/customizationCatalog";
import { THEME_PACKAGES, type ThemeId } from "../../data/themePackages";
import { useTranslation } from "react-i18next";

/**
 * Fullscreen theme "try on" preview. Rendered as the last child of StashLayout's
 * z-[100] overlay so its backdrop stacks above the panel and its click bubbles
 * to the overlay's onClose.
 */
export const StashTryOnPreview: React.FC<{
  item: CustomizationItem | Bundle | null;
  onClose: () => void;
}> = ({ item, onClose }) => {
  if (!item) return null;
  const { t } = useTranslation();
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
          <h3 className="text-xl font-black text-text-main">{t('stash.tryOnButton')}: {item.name}</h3>
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
                  <h4 className="text-lg font-bold text-text-main mb-3">{t('stash.panelPreview')}</h4>
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
              {t('stash.noItems')}
            </div>
          )}
        </div>
        <div className="border-t border-surface/50 p-4">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-full border border-primary/30 bg-primary/20 text-primary font-bold uppercase tracking-[0.22em] transition-colors hover:bg-primary/30"
          >
            {t('stash.closePreview')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StashTryOnPreview;
