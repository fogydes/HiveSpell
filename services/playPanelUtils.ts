export type PlayPanelTab = "none" | "chat" | "players";

const getPanelClasses = (
  activeTab: PlayPanelTab,
  panel: Exclude<PlayPanelTab, "none">,
  desktopClasses: string,
) => {
  const base =
    "fixed z-40 bg-panel/95 backdrop-blur-xl border border-surface shadow-2xl flex flex-col overflow-hidden transition-all duration-300";
  const mobilePos =
    "right-4 top-1/2 -translate-y-1/2 w-[85vw] h-[50vh] rounded-2xl origin-right";
  const mobileState =
    activeTab === panel
      ? "scale-100 opacity-100 pointer-events-auto"
      : "scale-0 opacity-0 pointer-events-none";

  return `${base} ${mobilePos} ${mobileState} ${desktopClasses}`;
};

export const getChatPanelClasses = (activeTab: PlayPanelTab) =>
  getPanelClasses(
    activeTab,
    "chat",
    "lg:right-auto lg:left-4 lg:top-1/2 lg:-translate-y-1/2 lg:w-72 lg:h-[60vh] lg:rounded-xl lg:origin-center lg:scale-100 lg:opacity-100 lg:pointer-events-auto",
  );

export const getPlayerPanelClasses = (activeTab: PlayPanelTab) =>
  getPanelClasses(
    activeTab,
    "players",
    "lg:right-4 lg:top-1/2 lg:-translate-y-1/2 lg:w-64 lg:h-[60vh] lg:rounded-xl lg:origin-center lg:scale-100 lg:opacity-100 lg:pointer-events-auto",
  );
