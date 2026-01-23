import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { useSettings, THEMES, ThemeId } from "../context/SettingsContext";

// Map of item IDs to their display properties
const ITEM_CATALOG: Record<
  string,
  { name: string; category: string; icon: string }
> = {
  theme_honey: { name: "Honey Glaze", category: "Theme", icon: "🎨" },
  theme_night: { name: "Nightshade", category: "Theme", icon: "🎨" },
  cursor_pollen: { name: "Pollen Trail", category: "Cursor", icon: "✨" },
  badge_lexicon: { name: "Lexicon Badge", category: "Badge", icon: "🎖️" },
};

interface StashProps {
  onClose: () => void;
}

export const Stash: React.FC<StashProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { theme, setTheme } = useSettings();
  const [inventory, setInventory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"themes" | "items">("themes");

  useEffect(() => {
    const fetchInventory = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("inventory")
          .eq("id", user.uid)
          .single();

        if (fetchError) throw fetchError;
        setInventory(data?.inventory || []);
      } catch (err: any) {
        console.error("Failed to fetch inventory:", err);
        setError("Could not load your stash.");
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [user]);

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
              {Object.keys(THEMES).map((tId) => {
                const isActive = theme === tId;
                const modeColors = THEMES[tId as ThemeId];

                return (
                  <button
                    key={tId}
                    onClick={() => setTheme(tId as ThemeId)}
                    className={`relative p-4 rounded-xl border-2 transition-all group text-left flex items-center gap-4 ${isActive ? "border-primary bg-primary-dim/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]" : "border-surface bg-panel hover:border-text-muted"}`}
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
                        {tId}
                      </h4>
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
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin text-4xl mb-4">🐝</div>
                  <p className="text-text-muted">Checking your hive...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-400">{error}</p>
                </div>
              ) : inventory.length === 0 ? (
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
                  {inventory.map((itemId) => {
                    const item = ITEM_CATALOG[itemId];
                    if (!item) return null; // Unknown item

                    return (
                      <div
                        key={itemId}
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
                        <button className="mt-3 text-xs bg-primary hover:bg-primary-dim text-app px-3 py-1 rounded-full transition-colors font-bold">
                          Equip
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
              ? `${inventory.length} item${inventory.length !== 1 ? "s" : ""} in your collection`
              : "Basic themes are unlocked by default"}
          </p>
        </div>
      </div>
    </div>
  );
};
