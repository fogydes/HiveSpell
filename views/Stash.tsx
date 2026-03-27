import React, { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import {
  ITEM_CATALOG,
  THEME_OPTIONS,
  isThemeUnlocked,
} from "../data/customizationCatalog";
import { THEME_PACKAGES, type ThemeId } from "../data/themePackages";

interface StashProps {
  onClose: () => void;
}

type StashTab = "themes" | "items";

const themesById = Object.fromEntries(THEME_OPTIONS.map((option) => [option.id, option]));

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
  const [activeTab, setActiveTab] = useState<StashTab>("themes");
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId | null>(theme);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const inventory = userData?.inventory ?? [];

  const ownedItems = useMemo(
    () => inventory.map((itemId) => ITEM_CATALOG[itemId]).filter(Boolean),
    [inventory],
  );

  const selectedTheme =
    THEME_PACKAGES[selectedThemeId ?? theme] ?? THEME_PACKAGES[theme];
  const selectedItem =
    ownedItems.find((item) => item.id === selectedItemId) ?? ownedItems[0] ?? null;

  const themeCount = THEME_OPTIONS.filter((option) =>
    isThemeUnlocked(option.id, inventory),
  ).length;
  const activeCursor = equippedCursor ? ITEM_CATALOG[equippedCursor] : null;
  const activeBadge = equippedBadge ? ITEM_CATALOG[equippedBadge] : null;
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
          <div className="h-full w-full bg-[radial-gradient(circle_at_14%_18%,rgba(16,185,129,0.18),transparent_22%),radial-gradient(circle_at_84%_16%,rgba(245,158,11,0.16),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.12))]" />
        </div>

        <div className="relative flex items-start justify-between gap-4 border-b border-surface/70 px-4 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.34em] text-text-muted/60">
              Personal vault
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-2xl font-black text-text-main sm:text-4xl">
              The Relic Vault
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">
              Your owned cosmetics, theme packages, and active loadout arranged
              as a single archive instead of two disconnected tabs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface/80 bg-panel/75 text-lg text-text-muted transition-colors hover:text-text-main"
          >
            ✕
          </button>
        </div>

        <div className="relative grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0">
            <div className="rounded-[28px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                    Archive lanes
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-text-main">
                    Switch between package curation and owned relics
                  </h3>
                </div>
                <div className="inline-flex rounded-full border border-surface/70 bg-panel/60 p-1">
                  <button
                    onClick={() => setActiveTab("themes")}
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${
                      activeTab === "themes"
                        ? "bg-primary/20 text-primary"
                        : "text-text-muted"
                    }`}
                  >
                    Themes
                  </button>
                  <button
                    onClick={() => setActiveTab("items")}
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${
                      activeTab === "items"
                        ? "bg-primary/20 text-primary"
                        : "text-text-muted"
                    }`}
                  >
                    Collection
                  </button>
                </div>
              </div>
            </div>

            {activeTab === "themes" ? (
              <>
                <div
                  className="mt-5 overflow-hidden rounded-[30px] border border-surface/80 p-5 shadow-[var(--theme-shadow-panel)]"
                  style={{ background: selectedTheme.scene.panelGradient }}
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-xl">
                      <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/65">
                        Featured package
                      </p>
                      <h3 className="mt-3 text-3xl font-black text-text-main">
                        {selectedTheme.name}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-text-muted">
                        {themesById[selectedTheme.id]?.description ||
                          "A mood-driven theme package with its own palette and scene treatment."}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="rounded-full border border-primary/25 bg-primary/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                          {selectedTheme.id === theme ? "Currently equipped" : "Previewing"}
                        </span>
                        <span className="rounded-full border border-surface/70 bg-black/15 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-text-muted">
                          {isThemeUnlocked(selectedTheme.id, inventory)
                            ? "Unlocked"
                            : "Locked"}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <div className="flex gap-3">
                        <div
                          className="h-12 w-12 rounded-full border"
                          style={{
                            background: selectedTheme.colors.primary,
                            borderColor: selectedTheme.colors.accent,
                          }}
                        />
                        <div
                          className="h-12 w-12 rounded-full border"
                          style={{
                            background: selectedTheme.colors.panel,
                            borderColor: selectedTheme.colors.primary,
                          }}
                        />
                        <div
                          className="h-12 w-12 rounded-full border"
                          style={{
                            background: selectedTheme.colors.accent,
                            borderColor: selectedTheme.colors.textMain,
                          }}
                        />
                      </div>
                      <button
                        onClick={() =>
                          isThemeUnlocked(selectedTheme.id, inventory) &&
                          setTheme(selectedTheme.id)
                        }
                        disabled={!isThemeUnlocked(selectedTheme.id, inventory)}
                        className={`mt-4 inline-flex h-11 items-center justify-center rounded-full px-5 text-xs font-bold uppercase tracking-[0.2em] transition-all ${
                          isThemeUnlocked(selectedTheme.id, inventory)
                            ? selectedTheme.id === theme
                              ? "border border-surface/70 bg-black/25 text-text-main"
                              : "border border-primary/35 bg-primary/20 text-primary hover:bg-primary/30"
                            : "cursor-not-allowed border border-surface/60 bg-black/20 text-text-muted"
                        }`}
                      >
                        {selectedTheme.id === theme
                          ? "Equipped"
                          : isThemeUnlocked(selectedTheme.id, inventory)
                            ? "Equip theme"
                            : "Locked"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {THEME_OPTIONS.map((themeOption) => {
                    const themePackage = THEME_PACKAGES[themeOption.id];
                    const active = themeOption.id === theme;
                    const selected = themeOption.id === selectedTheme.id;
                    const unlocked = isThemeUnlocked(themeOption.id, inventory);

                    return (
                      <button
                        key={themeOption.id}
                        onClick={() => setSelectedThemeId(themeOption.id)}
                        className={`overflow-hidden rounded-[28px] border p-5 text-left transition-all ${
                          selected
                            ? "border-primary/35 bg-primary/10 shadow-[0_18px_36px_rgba(var(--primary-rgb),0.16)]"
                            : unlocked
                              ? "border-surface/80 bg-black/20 hover:border-primary/20"
                              : "border-surface/60 bg-black/15 opacity-75"
                        }`}
                      >
                        <div
                          className="rounded-[22px] border border-white/10 p-4"
                          style={{ background: themePackage.scene.surfaceGradient }}
                        >
                          <div className="flex gap-2">
                            <div
                              className="h-10 w-10 rounded-full border"
                              style={{
                                background: themePackage.colors.primary,
                                borderColor: themePackage.colors.accent,
                              }}
                            />
                            <div
                              className="h-10 w-10 rounded-full border"
                              style={{
                                background: themePackage.colors.panel,
                                borderColor: themePackage.colors.primary,
                              }}
                            />
                            <div
                              className="h-10 w-10 rounded-full border"
                              style={{
                                background: themePackage.colors.accent,
                                borderColor: themePackage.colors.textMain,
                              }}
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-black text-text-main">
                              {themeOption.name}
                            </h4>
                            <p className="mt-2 text-sm leading-6 text-text-muted">
                              {themeOption.description}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${
                              active
                                ? "border-primary/25 bg-primary/12 text-primary"
                                : unlocked
                                  ? "border-surface/70 bg-panel/55 text-text-muted"
                                  : "border-amber-300/20 bg-amber-400/10 text-amber-200"
                            }`}
                          >
                            {active ? "Equipped" : unlocked ? "Unlocked" : "Locked"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[28px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                      Active cursor
                    </p>
                    <h3 className="mt-3 text-xl font-black text-text-main">
                      {activeCursor?.name || "Standard pointer"}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-text-muted">
                      {activeCursor?.description ||
                        "No alternate cursor equipped yet."}
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                      Active badge
                    </p>
                    <h3 className="mt-3 text-xl font-black text-text-main">
                      {activeBadge?.name || "No badge equipped"}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-text-muted">
                      {activeBadge?.description ||
                        "Equip a badge to change the social identity cues."}
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                      Stored relics
                    </p>
                    <h3 className="mt-3 text-3xl font-black text-primary">
                      {ownedItems.length}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-text-muted">
                      Cosmetics acquired from the bazaar and ready to equip or
                      inspect.
                    </p>
                  </div>
                </div>

                {ownedItems.length === 0 ? (
                  <div className="mt-5 rounded-[28px] border border-dashed border-surface/70 bg-black/20 px-6 py-12 text-center">
                    <div className="text-5xl opacity-60">📦</div>
                    <p className="mt-4 text-lg font-semibold text-text-main">
                      The vault is still empty.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      Acquire new relics from the bazaar to start building your
                      loadout.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                    {ownedItems.map((item) => {
                      const isEquipped =
                        (item.category === "cursor" &&
                          equippedCursor === item.id) ||
                        (item.category === "badge" && equippedBadge === item.id);
                      const selected = selectedItem?.id === item.id;
                      const linkedTheme = THEME_OPTIONS.find(
                        (themeOption) => themeOption.inventoryItemId === item.id,
                      );

                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedItemId(item.id)}
                          className={`overflow-hidden rounded-[28px] border p-5 text-left transition-all ${
                            selected
                              ? "border-primary/35 bg-primary/10 shadow-[0_18px_36px_rgba(var(--primary-rgb),0.16)]"
                              : "border-surface/80 bg-black/20 hover:border-primary/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/10 bg-white/6 text-3xl">
                              {item.icon}
                            </div>
                            <span className="rounded-full border border-surface/70 bg-panel/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
                              {item.category}
                            </span>
                          </div>
                          <h4 className="mt-5 text-lg font-black text-text-main">
                            {item.name}
                          </h4>
                          <p className="mt-3 text-sm leading-6 text-text-muted">
                            {item.description}
                          </p>
                          <div className="mt-5">
                            {item.category === "theme" && linkedTheme ? (
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActiveTab("themes");
                                  setSelectedThemeId(linkedTheme.id);
                                }}
                                className="inline-flex h-10 items-center rounded-full border border-primary/30 bg-primary/18 px-4 text-xs font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/28"
                              >
                                View theme
                              </button>
                            ) : (
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (item.category === "cursor") {
                                    setEquippedCursor(
                                      equippedCursor === item.id ? null : item.id,
                                    );
                                  }
                                  if (item.category === "badge") {
                                    setEquippedBadge(
                                      equippedBadge === item.id ? null : item.id,
                                    );
                                  }
                                }}
                                className={`inline-flex h-10 items-center rounded-full px-4 text-xs font-bold uppercase tracking-[0.18em] transition-all ${
                                  isEquipped
                                    ? "border border-amber-300/25 bg-amber-400/12 text-amber-200"
                                    : "border border-primary/30 bg-primary/18 text-primary hover:bg-primary/28"
                                }`}
                              >
                                {isEquipped ? "Unequip" : "Equip"}
                              </button>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>

          <aside className="min-w-0">
            <div className="space-y-5">
              <div className="rounded-[28px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
                <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                  Loadout summary
                </p>
                <div className="mt-4 space-y-3 text-sm text-text-muted">
                  <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
                    <span>Equipped theme</span>
                    <span className="font-semibold text-text-main">
                      {THEME_PACKAGES[theme].name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
                    <span>Cursor</span>
                    <span className="font-semibold text-text-main">
                      {activeCursor?.name || "Default"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
                    <span>Badge</span>
                    <span className="font-semibold text-text-main">
                      {activeBadge?.name || "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
                    <span>Unlocked themes</span>
                    <span className="font-semibold text-text-main">
                      {themeCount}/{THEME_OPTIONS.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
                <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                  Inspection notes
                </p>
                {activeTab === "themes" ? (
                  <div className="mt-4 space-y-4 text-sm leading-6 text-text-muted">
                    <p>
                      Theme packages now act like full environment presets rather
                      than flat recolors, so the stash is organized around mood,
                      readability, and loadout clarity.
                    </p>
                    <p>
                      Use this lane to compare unlocked palettes before pushing
                      the same visual language into the broader app surfaces.
                    </p>
                  </div>
                ) : selectedItem ? (
                  <div className="mt-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/10 bg-white/6 text-3xl">
                        {selectedItem.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-black text-text-main">
                          {selectedItem.name}
                        </h3>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-text-muted/60">
                          {selectedItem.category}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-text-muted">
                      {selectedItem.description}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-text-muted">
                    Select an owned item to inspect it more closely.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
        </div>
      </div>
    </div>
  );
};
