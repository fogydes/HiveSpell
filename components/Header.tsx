import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { Shop } from "../views/Shop";
import { ProfileModal } from "./ProfileModal";
import CustomizationEffects from "./CustomizationEffects";
import NotificationBell from "./NotificationBell";
import { FriendsPanel } from "@/components/friends";
import ChatPanel from "./ChatPanel";
import SettingsPanel from "./SettingsPanel";
import { StashModal } from "./StashModal";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { ITEM_CATALOG } from "../data/customizationCatalog";
import { useFocusTrap, useRestoreFocus } from "../hooks/useAccessibility";
import { useTranslation } from "react-i18next";

const Header: React.FC = () => {
  const { userData, user } = useAuth();
  const {
    equippedBadge,
  } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );
  const [showFriends, setShowFriends] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showStash, setShowStash] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isPlayMode = location.pathname.startsWith("/play");
  const equippedBadgeItem = equippedBadge ? ITEM_CATALOG[equippedBadge] : null;

  // Refs for focus management
  const dropdownRef = useRef<HTMLDivElement>(null);
  const friendsRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const stashRef = useRef<HTMLDivElement>(null);

  // Focus traps for modals
  useFocusTrap(isDropdownOpen, { current: dropdownRef.current });
  useFocusTrap(showFriends, friendsRef);
  useFocusTrap(showChat, chatRef);
  useFocusTrap(showStash, stashRef);
  useFocusTrap(isMenuOpen, mobileMenuRef);

  // Restore focus when modals close
  useRestoreFocus(isDropdownOpen);
  useRestoreFocus(showFriends);
  useRestoreFocus(showChat);
  useRestoreFocus(showStash);
  useRestoreFocus(isMenuOpen);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [isDropdownOpen]);

  // Global Escape key handler for all modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showShop) { setShowShop(false); return; }
      if (showSettings) { setShowSettings(false); return; }
      if (showProfile) { setShowProfile(false); return; }
      if (selectedProfileId) { setSelectedProfileId(null); return; }
      if (showFriends) { setShowFriends(false); return; }
      if (showChat) { setShowChat(false); return; }
      if (showStash) { setShowStash(false); return; }
      if (isDropdownOpen) { setIsDropdownOpen(false); return; }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showShop, showSettings, showProfile, selectedProfileId, showFriends, showChat, showStash, isDropdownOpen]);

  if (!user) return null;

  const handleLogout = () => {
    signOut(auth);
    setIsDropdownOpen(false);
    navigate("/auth");
  };

  // Dynamic positioning for desktop sidebar
  // In play mode: bottom-left horizontal strip to avoid overlapping game content
  // Otherwise: left-middle vertical sidebar
  const desktopContainerClasses = isPlayMode
    ? "hidden md:flex fixed left-4 bottom-4 z-40 flex-row gap-2 pointer-events-auto"
    : "hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-3 pointer-events-auto";

  return (
    <>
      <CustomizationEffects />
      {/* Top Header: Stats & Profile Only */}
      <header className="fixed top-0 left-0 w-full p-4 flex justify-between items-start z-50 pointer-events-none">
        {/* Left: Stats */}
        <div className="flex items-center gap-3 bg-panel/40 backdrop-blur-md border border-primary-dim rounded-full px-5 py-2 pointer-events-auto shadow-lg shadow-app/20">
          <span className="text-xl">🍯</span>
          <span
            className="text-primary-dim text-opacity-100 placeholder-opacity-100 text-emerald-100 font-bold font-mono text-lg"
            style={{ color: "var(--primary)" }}
          >
            {userData?.nectar ?? 0}
          </span>
          <div className="w-px h-5 bg-primary-dim mx-1"></div>
          <span className="text-accent font-medium text-sm tracking-wide uppercase">
            {userData?.title || t("header.newbee")}
          </span>
          {equippedBadgeItem && (
            <>
              <div className="w-px h-5 bg-primary-dim mx-1"></div>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
                <span>{equippedBadgeItem.icon}</span>
                <span>{equippedBadgeItem.name}</span>
              </span>
            </>
          )}
        </div>

        {/* Right: Profile Dropdown */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <NotificationBell />
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(!isDropdownOpen);
              }}
              aria-expanded={isDropdownOpen}
              aria-haspopup="menu"
              aria-label={isDropdownOpen ? t("header.closeProfileMenu") : t("header.openProfileMenu")}
              className="w-12 h-12 rounded-full border-2 border-primary-dim p-[2px] shadow-lg hover:scale-105 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-panel flex items-center justify-center overflow-hidden">
                <img
                  src={
                    userData?.avatarUrl ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
                  }
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                role="menu"
                className="absolute right-0 mt-2 w-48 bg-panel border border-surface rounded-lg shadow-xl overflow-hidden animate-fade-in-down z-50"
              >
                <div className="px-4 py-3 border-b border-surface">
                  <p className="text-sm text-text-main font-medium truncate">
                    {userData?.username || user.email}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowProfile(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-primary-dim hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <span className="text-base">👤</span> {t("header.profile")}
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowFriends(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-primary-dim hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <span className="text-base">👥</span> {t("header.friends")}
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowChat(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-primary-dim hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <span className="text-base">💬</span> {t("header.messages")}
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowSettings(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-primary-dim hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <span className="text-base">⚙️</span> {t("header.settings")}
                  </button>
                  <div className="border-t border-surface my-1"></div>
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2"
                  >
                    <span className="text-base">🚪</span> {t("header.logout")}
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
                navigate("/leaderboards");
                setIsMenuOpen(false);
              }}
              onStash={() => {
                setShowStash(true);
                setIsMenuOpen(false);
              }}
            />
          </div>
        )}
      </div>

      {/* DESKTOP: Persistent Sidebar */}
      <div className={desktopContainerClasses}>
        <MenuButtons
          onShop={() => setShowShop(true)}
          onLeaderboard={() => navigate("/leaderboards")}
          onStash={() => setShowStash(true)}
          desktop
          compact={isPlayMode}
        />
      </div>

      {/* Settings Panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Shop Modal */}
      {showShop && <Shop onClose={() => setShowShop(false)} />}

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

      {/* Friends Panel */}
      {showFriends && (
        <FriendsPanel
          variant="modal"
          onClose={() => setShowFriends(false)}
          onViewProfile={(userId) => {
            setShowFriends(false);
            setSelectedProfileId(userId);
          }}
        />
      )}

      {/* Chat Panel */}
      {showChat && <ChatPanel onClose={() => setShowChat(false)} />}

      {/* Stash Modal */}
      {showStash && <StashModal onClose={() => setShowStash(false)} />}
    </>
  );
};

// Extracted for reusability
const MenuButtons: React.FC<{
  onShop: () => void;
  onLeaderboard: () => void;
  onStash: () => void;
  desktop?: boolean;
  compact?: boolean;
}> = ({ onShop, onLeaderboard, onStash, desktop, compact }) => {
  const { t } = useTranslation();
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
        title={t("header.shop")}
      >
        <span className="text-xl min-w-[24px]">🛒</span>
        {(!compact || !desktop) && (
          <span
            className={`font-bold text-sm ${desktop ? "opacity-0 group-hover:opacity-100 transition-opacity duration-300" : ""}`}
          >
            {t("header.shop")}
          </span>
        )}
      </button>

      <button
        onClick={onLeaderboard}
        className={`${baseClass} ${widthClass} hover:scale-105`}
        title={t("header.leaderboard")}
      >
        <span className="text-xl min-w-[24px]">🏆</span>
        {(!compact || !desktop) && (
          <span
            className={`font-bold text-sm ${desktop ? "opacity-0 group-hover:opacity-100 transition-opacity duration-300" : ""}`}
          >
            {t("header.leaderboard")}
          </span>
        )}
      </button>

      <button
        onClick={onStash}
        className={`${baseClass} ${widthClass} hover:scale-105`}
        title={t("header.stash")}
      >
        <span className="text-xl min-w-[24px]">📦</span>
        {(!compact || !desktop) && (
          <span
            className={`font-bold text-sm ${desktop ? "opacity-0 group-hover:opacity-100 transition-opacity duration-300" : ""}`}
          >
            {t("header.stash")}
          </span>
        )}
      </button>
    </>
  );
};

export default Header;
