import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { Shop } from "../views/Shop";
import { Stash } from "../views/Stash";
import { ProfileModal } from "./ProfileModal";
import { auth, db } from "../firebase";
// Fix: Use namespace import for Auth and cast to any to resolve signOut export error
import * as firebaseAuth from "firebase/auth";
import * as firebaseDatabase from "firebase/database";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabase";

// Fix: Destructure signOut from namespace
const { signOut } = firebaseAuth as any;
// Cast firebaseDatabase to any to resolve TS errors
const { ref, get, query, orderByChild, limitToLast } = firebaseDatabase as any;

const Header: React.FC = () => {
  const { userData, user } = useAuth();
  const { ttsVolume, setTtsVolume, sfxVolume, setSfxVolume, theme, setTheme } =
    useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<
    Array<{ uid: string; name: string; corrects: number; wins: number }>
  >([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const isPlayMode = location.pathname.startsWith("/play");

  if (!user) return null;

  const handleLogout = () => {
    signOut(auth);
    setIsDropdownOpen(false);
    navigate("/auth");
  };

  const fetchLeaderboard = async () => {
    setShowLeaderboard(true);
    setLoadingLeaderboard(true);
    setLeaderboardData([]);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, corrects, wins")
        .order("corrects", { ascending: false })
        .limit(25);

      if (error) throw error;

      if (data) {
        const entries = data.map((profile: any) => ({
          uid: profile.id,
          name: profile.username || "Unknown Bee",
          corrects: profile.corrects || 0,
          wins: profile.wins || 0,
        }));
        setLeaderboardData(entries);
      }
    } catch (error) {
      console.error("Leaderboard fetch failed:", error);
      // Fallback or error state
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // Dynamic positioning for desktop sidebar
  // If in play mode, position below the chatbox (which ends at ~80vh)
  const desktopContainerClasses = isPlayMode
    ? "hidden md:flex fixed left-4 top-[82vh] z-40 flex-row gap-2 pointer-events-auto"
    : "hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-3 pointer-events-auto";

  return (
    <>
      {/* Top Header: Stats & Profile Only */}
      <header className="fixed top-0 left-0 w-full p-4 flex justify-between items-start z-50 pointer-events-none">
        {/* Left: Stats */}
        <div className="flex items-center gap-3 bg-panel/40 backdrop-blur-md border border-primary-dim rounded-full px-5 py-2 pointer-events-auto shadow-lg shadow-app/20">
          <span className="text-xl">🍯</span>
          <span
            className="text-primary-dim text-opacity-100 placeholder-opacity-100 text-emerald-100 font-bold font-mono text-lg"
            style={{ color: "var(--primary)" }}
          >
            {userData?.nectar ?? userData?.stars ?? 0}
          </span>
          <div className="w-px h-5 bg-primary-dim mx-1"></div>
          <span className="text-accent font-medium text-sm tracking-wide uppercase">
            {userData?.title || "Newbee"}
          </span>
        </div>

        {/* Right: Profile Dropdown */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-12 h-12 rounded-full border-2 border-primary-dim p-[2px] shadow-lg hover:scale-105 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-panel flex items-center justify-center overflow-hidden">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-panel border border-surface rounded-lg shadow-xl overflow-hidden animate-fade-in-down z-50">
                <div className="px-4 py-3 border-b border-surface">
                  <p className="text-sm text-text-main font-medium truncate">
                    {userData?.username || user.email}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfile(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-primary-dim hover:text-primary transition-colors"
                  >
                    Profile
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-primary-dim hover:text-primary transition-colors opacity-50 cursor-not-allowed">
                    Messages (Soon)
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-primary-dim hover:text-primary transition-colors"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE: Burger Menu (Left Middle) - Hidden on md+ */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-start gap-2 pointer-events-auto md:hidden">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`p-3 rounded-xl bg-panel border border-surface text-text-main shadow-xl hover:bg-surface transition-all ${isMenuOpen ? "bg-primary border-primary" : ""}`}
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {isMenuOpen && (
          <div className="flex flex-col gap-2 animate-fade-in-left origin-top-left">
            <MenuButtons
              onShop={() => {
                setShowShop(true);
                setIsMenuOpen(false);
              }}
              onLeaderboard={() => {
                fetchLeaderboard();
                setIsMenuOpen(false);
              }}
              onInventory={() => {
                setShowInventory(true);
                setIsMenuOpen(false);
              }}
            />
          </div>
        )}
      </div>

      {/* DESKTOP: Persistent Sidebar or Bottom Bar based on route */}
      <div className={desktopContainerClasses}>
        <MenuButtons
          onShop={() => setShowShop(true)}
          onLeaderboard={() => fetchLeaderboard()}
          onInventory={() => setShowInventory(true)}
          desktop
          compact={isPlayMode} // Pass compact flag for play mode
        />
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-panel w-full max-w-md rounded-2xl border border-surface shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-4 flex justify-between items-center border-b border-surface bg-panel/50">
              <h2 className="text-xl font-bold text-text-main">Leaderboard</h2>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-text-muted hover:text-text-main"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-[1fr_80px_60px] px-6 py-2 text-xs text-text-muted font-bold uppercase tracking-wider">
                <span>People</span>
                <span className="text-right">Correct</span>
                <span className="text-right">Wins</span>
              </div>
              {loadingLeaderboard ? (
                <div className="p-8 text-center text-text-muted">
                  Loading...
                </div>
              ) : leaderboardData.length > 0 ? (
                leaderboardData.map((p, i) => (
                  <button
                    key={p.uid}
                    onClick={() => {
                      setSelectedProfileId(p.uid);
                      setShowLeaderboard(false);
                    }}
                    className="grid grid-cols-[1fr_80px_60px] px-6 py-4 border-b border-surface hover:bg-surface/50 transition-colors items-center w-full text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-surface flex items-center justify-center">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.uid}`}
                          className="w-6 h-6"
                          alt="avatar"
                        />
                      </div>
                      <span className="text-text-main font-medium">
                        {p.name} {i < 3 && "🔥"}
                      </span>
                    </div>
                    <div className="text-right font-mono text-primary">
                      {p.corrects.toLocaleString()}
                    </div>
                    <div className="text-right font-mono text-text-muted">
                      {p.wins.toLocaleString()}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-text-muted">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-panel w-full max-w-md rounded-2xl border border-surface shadow-2xl p-6 animate-scale-in">
            <h2 className="text-2xl font-bold text-text-main mb-6">Settings</h2>

            <div className="space-y-6">
              <div>
                <label className="flex justify-between text-sm font-bold text-text-muted mb-2">
                  <span>TTS Volume (Voice)</span>
                  <span>{Math.round(ttsVolume * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={ttsVolume}
                  onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div>
                <label className="flex justify-between text-sm font-bold text-text-muted mb-2">
                  <span>SFX Volume (Typing)</span>
                  <span>{Math.round(sfxVolume * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-2 bg-surface hover:bg-surface/80 rounded-lg text-text-main font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shop Modal */}
      {showShop && <Shop onClose={() => setShowShop(false)} />}

      {/* Inventory Modal */}
      {showInventory && <Stash onClose={() => setShowInventory(false)} />}

      {/* Profile Modal (Self) */}
      {showProfile && (
        <ProfileModal userId={user.uid} onClose={() => setShowProfile(false)} />
      )}

      {/* Profile Modal (From Leaderboard/Game) */}
      {selectedProfileId && (
        <ProfileModal
          userId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
        />
      )}
    </>
  );
};

// Extracted for reusability
const MenuButtons: React.FC<{
  onShop: () => void;
  onLeaderboard: () => void;
  onInventory: () => void;
  desktop?: boolean;
  compact?: boolean;
}> = ({ onShop, onLeaderboard, onInventory, desktop, compact }) => {
  const baseClass =
    "flex items-center gap-3 p-3 rounded-xl bg-panel/90 backdrop-blur border border-surface text-text-main hover:bg-primary-dim hover:border-primary transition-all shadow-xl group";

  // Logic for width:
  // If compact (row mode), we only show icons or smaller widths.
  // If normal sidebar, we have hover expand.
  let widthClass = "w-48";
  if (desktop) {
    if (compact) {
      // In Play mode: Fixed square buttons or slightly rectangular
      widthClass = "w-14 justify-center";
    } else {
      // In Lobby mode: Expandable sidebar
      widthClass = "w-14 hover:w-48 overflow-hidden whitespace-nowrap";
    }
  }

  return (
    <>
      <button
        onClick={onShop}
        className={`${baseClass} ${widthClass} hover:scale-105`}
        title="Shop"
      >
        <span className="text-xl min-w-[24px]">🛒</span>
        {(!compact || !desktop) && (
          <span
            className={`font-bold text-sm ${desktop ? "opacity-0 group-hover:opacity-100 transition-opacity duration-300" : ""}`}
          >
            Shop
          </span>
        )}
      </button>

      <button
        onClick={onLeaderboard}
        className={`${baseClass} ${widthClass} hover:scale-105`}
        title="Leaderboard"
      >
        <span className="text-xl min-w-[24px]">🏆</span>
        {(!compact || !desktop) && (
          <span
            className={`font-bold text-sm ${desktop ? "opacity-0 group-hover:opacity-100 transition-opacity duration-300" : ""}`}
          >
            Leaderboard
          </span>
        )}
      </button>

      <button
        onClick={onInventory}
        className={`${baseClass} ${widthClass} hover:scale-105`}
        title="Inventory"
      >
        <span className="text-xl min-w-[24px]">🎒</span>
        {(!compact || !desktop) && (
          <span
            className={`font-bold text-sm ${desktop ? "opacity-0 group-hover:opacity-100 transition-opacity duration-300" : ""}`}
          >
            Inventory
          </span>
        )}
      </button>
    </>
  );
};

export default Header;
