import React from "react";

interface MobilePlayActionsProps {
  activeTab: "none" | "chat" | "players";
  onExit: () => void;
  onToggleTab: (tab: "chat" | "players") => void;
}

const MobilePlayActions: React.FC<MobilePlayActionsProps> = ({
  activeTab,
  onExit,
  onToggleTab,
}) => {
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-surface/80 bg-panel/92 px-3 py-2 shadow-xl backdrop-blur-xl">
      <button
        onClick={onExit}
        className="p-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-full border border-red-500/50 backdrop-blur-sm transition-all shadow-lg"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>
      <button
        onClick={() => onToggleTab("chat")}
        className={`p-3 rounded-full border shadow-lg backdrop-blur-sm transition-all ${activeTab === "chat" ? "bg-emerald-600 border-emerald-500" : "bg-slate-800/80 border-slate-600"}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
      <button
        onClick={() => onToggleTab("players")}
        className={`p-3 rounded-full border shadow-lg backdrop-blur-sm transition-all ${activeTab === "players" ? "bg-emerald-600 border-emerald-500" : "bg-slate-800/80 border-slate-600"}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </button>
      </div>
    </div>
  );
};

export default MobilePlayActions;
