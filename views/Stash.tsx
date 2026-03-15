import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSettings, THEMES } from "../context/SettingsContext";
import {
  ITEM_CATALOG,
  THEME_OPTIONS,
  isThemeUnlocked,
} from "../data/customizationCatalog";

interface StashProps {
  onClose: () => void;
}

export const Stash: React.FC<StashProps> = ({ onClose }) => {
  const { userData } = useAuth();
  const {
    theme,
    setTheme,
    equippedCursor,
    setEquippedCursor,
    equippedBadge,
    setEquippedBadge,
  } = useSettings();
  const [activeTab, setActiveTab] = useState<"themes" | "items">("themes");
  const inventory = userData?.inventory ?? [];
  const ownedItems = inventory
    .map((itemId) => ITEM_CATALOG[itemId])
    .filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-hidden animate-fade-in">
      <div className="relative w-full max-w-3xl bg-panel border border-surface rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-panel p-6 border-b border-surface shrink-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-text-main font-serif tracking-wide">
                MY STASH
              </h2>
              <p className="text-text-muted text-sm">
                Customize your experience
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-main transition-colors text-xl"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-surface">
            <button
              onClick={() => setActiveTab("themes")}
              className={`pb-3 px-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === "themes" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-main"}`}
            >
              Themes
            </button>
            <button
              onClick={() => setActiveTab("items")}
              className={`pb-3 px-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === "items" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-main"}`}
            >
              Collection
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-app/50">
          {activeTab === "themes" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {THEME_OPTIONS.map((themeOption) => {
                const isActive = theme === themeOption.id;
                const unlocked =
                  isThemeUnlocked(themeOption.id, inventory) || isActive;
                const modeColors = THEMES[themeOption.id];

                return (
                  <button
                    key={themeOption.id}
                    onClick={() => unlocked && setTheme(themeOption.id)}
                    disabled={!unlocked}
                    className={`relative p-4 rounded-xl border-2 transition-all group text-left flex items-center gap-4 ${isActive ? "border-primary bg-primary-dim/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]" : unlocked ? "border-surface bg-panel hover:border-text-muted" : "border-surface bg-panel/60 opacity-70 cursor-not-allowed"}`}
                  >
                    {/* Theme Preview Circle */}
                    <div
                      className="w-12 h-12 rounded-full border-2 shadow-lg shrink-0"
                      style={{
                        backgroundColor: modeColors.app,
                        borderColor: modeColors.primary,
                      }}
                    >
                      <div className="w-full h-full flex items-center justify-center text-lg">
                        🎨
                      </div>
                    </div>

                    <div className="flex-1">
                      <h4
                        className={`font-bold uppercase tracking-wider ${isActive ? "text-primary" : "text-text-main"}`}
                      >
                        {themeOption.name}
                      </h4>
                      <p className="mt-1 text-xs text-text-muted">
                        {themeOption.description}
                      </p>
                      <div className="flex gap-1 mt-2">
                        {/* Color Swatches */}
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ background: modeColors.primary }}
                        ></div>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ background: modeColors.panel }}
                        ></div>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ background: modeColors.accent }}
                        ></div>
                      </div>
                    </div>

                    {!unlocked && (
                      <div className="absolute top-4 right-4 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        Locked
                      </div>
                    )}

                    {isActive && (
                      <div className="absolute top-4 right-4 text-primary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === "items" && (
            <>
              {ownedItems.length === 0 ? (
                <div className="text-center py-12 bg-panel/30 rounded-2xl border border-dashed border-surface">
                  <div className="text-5xl mb-4 opacity-50">📦</div>
                  <p className="text-text-muted mb-2">
                    Your collection is empty.
                  </p>
                  <p className="text-text-muted text-sm">
                    Visit the shop to acquire new items!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {ownedItems.map((item) => {
                    const isEquipped =
                      (item.category === "cursor" &&
                        equippedCursor === item.id) ||
                      (item.category === "badge" && equippedBadge === item.id);
                    const buttonLabel =
                      item.category === "theme"
                        ? "View Theme"
                        : isEquipped
                          ? "Unequip"
                          : "Equip";

                    return (
                      <div
                        key={item.id}
                        className="bg-panel border border-surface rounded-xl p-4 flex flex-col items-center text-center hover:border-primary transition-all group cursor-pointer"
                      >
                        <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                          {item.icon}
                        </div>
                        <h4 className="text-text-main font-bold text-sm">
                          {item.name}
                        </h4>
                        <span className="text-xs text-text-muted uppercase tracking-wider mt-1">
                          {item.category}
                        </span>
                        <button
                          onClick={() => {
                            if (item.category === "theme") {
                              setActiveTab("themes");
                              return;
                            }

                            if (item.category === "cursor") {
                              setEquippedCursor(
                                equippedCursor === item.id ? null : item.id,
                              );
                              return;
                            }

                            if (item.category === "badge") {
                              setEquippedBadge(
                                equippedBadge === item.id ? null : item.id,
                              );
                            }
                          }}
                          className={`mt-3 text-xs px-3 py-1 rounded-full transition-colors font-bold ${item.category === "theme" ? "bg-primary hover:bg-primary-dim text-app" : isEquipped ? "bg-amber-400/20 text-amber-200 border border-amber-400/30" : "bg-surface hover:bg-primary-dim text-text-main"}`}
                        >
                          {buttonLabel}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-panel p-4 border-t border-surface text-center shrink-0">
          <p className="text-text-muted text-xs">
            {activeTab === "items"
              ? `${ownedItems.length} item${ownedItems.length !== 1 ? "s" : ""} in your collection`
              : "Core themes are free, shop themes unlock after purchase"}
          </p>
        </div>
      </div>
    </div>
  );
};
