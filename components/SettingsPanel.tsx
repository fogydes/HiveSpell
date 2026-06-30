import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { auth } from "../firebase";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { useToast } from "../context/ToastContext";
import { supabase } from "../services/supabase";
import { THEME_PACKAGES, type ThemeId } from "../data/themePackages";

type SettingsTab = "audio" | "display" | "privacy" | "account" | "about";

interface SettingsPanelProps {
  onClose: () => void;
}

const TABS: { key: SettingsTab; label: string; icon: string }[] = [
  { key: "audio", label: "Audio", icon: "🔊" },
  { key: "display", label: "Display", icon: "🎨" },
  { key: "privacy", label: "Privacy", icon: "🔒" },
  { key: "account", label: "Account", icon: "👤" },
  { key: "about", label: "About", icon: "ℹ️" },
];

const REPLAY_SPEEDS = [
  { value: 0.7, label: "0.7x" },
  { value: 0.8, label: "0.8x" },
  { value: 0.9, label: "0.9x" },
  { value: 1.0, label: "1.0x" },
];

const INPUT_FONT_SIZES = [
  { value: "text-xl sm:text-3xl", label: "Small" },
  { value: "text-2xl sm:text-5xl", label: "Medium" },
  { value: "text-3xl sm:text-6xl", label: "Large" },
];

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] uppercase tracking-[0.3em] text-text-muted/60 mb-3">
    {children}
  </p>
);

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { user, userData } = useAuth();
  const { showToast } = useToast();
  const {
    ttsVolume,
    setTtsVolume,
    sfxVolume,
    setSfxVolume,
    theme,
    setTheme,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<SettingsTab>("audio");

  // Audio settings (persisted to localStorage)
  const [replaySpeed, setReplaySpeed] = useState(() =>
    parseFloat(localStorage.getItem("hive_replay_speed") || "0.9"),
  );

  // Display settings
  const [reduceMotion, setReduceMotion] = useState(() =>
    localStorage.getItem("hive_reduce_motion") === "1",
  );
  const [inputFontSize, setInputFontSize] = useState(() =>
    localStorage.getItem("hive_input_font_size") || "text-2xl sm:text-5xl",
  );

  // Privacy settings
  const [onlineStatus, setOnlineStatus] = useState(() =>
    localStorage.getItem("hive_online_status") !== "hidden",
  );
  const [friendRequestPref, setFriendRequestPref] = useState(() =>
    localStorage.getItem("hive_friend_requests") || "everyone",
  );

  // Account
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);

  const handleReplaySpeedChange = (speed: number) => {
    setReplaySpeed(speed);
    localStorage.setItem("hive_replay_speed", speed.toString());
  };

  const handleReduceMotionChange = (enabled: boolean) => {
    setReduceMotion(enabled);
    localStorage.setItem("hive_reduce_motion", enabled ? "1" : "0");
    document.documentElement.classList.toggle("reduce-motion", enabled);
  };

  const handleInputFontSizeChange = (size: string) => {
    setInputFontSize(size);
    localStorage.setItem("hive_input_font_size", size);
  };

  const handleOnlineStatusChange = (visible: boolean) => {
    setOnlineStatus(visible);
    localStorage.setItem("hive_online_status", visible ? "visible" : "hidden");
  };

  const handleFriendRequestPrefChange = (pref: string) => {
    setFriendRequestPref(pref);
    localStorage.setItem("hive_friend_requests", pref);
  };

  const handleChangePassword = async () => {
    if (!user || !user.email || !currentPassword || !newPassword) return;
    if (newPassword.length < 6) {
      showToast({ title: "Too short", message: "Password must be at least 6 characters.", variant: "error" });
      return;
    }
    setPasswordLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      showToast({ title: "Password updated", message: "Your password has been changed.", variant: "success" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      showToast({ title: "Failed", message: err.message || "Could not update password.", variant: "error" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChangeUsername = async () => {
    if (!user || !newUsername.trim()) return;
    const trimmed = newUsername.trim();
    if (trimmed.length < 3 || trimmed.length > 15) {
      showToast({ title: "Invalid", message: "Username must be 3-15 characters.", variant: "error" });
      return;
    }
    setUsernameLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: trimmed })
        .eq("id", user.uid);
      if (error) throw error;
      showToast({ title: "Username updated", message: `You are now "${trimmed}".`, variant: "success" });
      setNewUsername("");
    } catch (err: any) {
      showToast({ title: "Failed", message: err.message || "Could not update username.", variant: "error" });
    } finally {
      setUsernameLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-panel w-full max-w-2xl max-h-[90vh] rounded-2xl border border-surface shadow-2xl overflow-hidden animate-scale-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface">
          <h2 className="text-xl font-bold text-text-main">Settings</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-main text-xl">✕</button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Tab Navigation */}
          <nav className="w-36 sm:w-44 border-r border-surface bg-black/10 py-2 overflow-y-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "text-primary bg-primary/10 border-r-2 border-primary"
                    : "text-text-muted hover:text-text-main hover:bg-surface/30"
                }`}
              >
                <span>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
            {activeTab === "audio" && (
              <div className="space-y-6">
                <div>
                  <SectionLabel>Voice playback</SectionLabel>
                  <label className="flex justify-between text-sm font-medium text-text-muted mb-2">
                    <span>TTS Volume</span>
                    <span className="text-text-main">{Math.round(ttsVolume * 100)}%</span>
                  </label>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={ttsVolume}
                    onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-sm font-medium text-text-muted mb-2">
                    <span>SFX Volume</span>
                    <span className="text-text-main">{Math.round(sfxVolume * 100)}%</span>
                  </label>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={sfxVolume}
                    onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div>
                  <SectionLabel>Word replay</SectionLabel>
                  <label className="text-sm font-medium text-text-muted mb-2 block">
                    Replay Speed
                  </label>
                  <div className="flex gap-2">
                    {REPLAY_SPEEDS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => handleReplaySpeedChange(s.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                          replaySpeed === s.value
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-surface/40 text-text-muted border border-surface hover:text-text-main"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-text-muted/60">Slower speeds give you more time to hear the word.</p>
                </div>
              </div>
            )}

            {activeTab === "display" && (
              <div className="space-y-6">
                <div>
                  <SectionLabel>Theme</SectionLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(THEME_PACKAGES).map(([id, pkg]) => (
                      <button
                        key={id}
                        onClick={() => setTheme(id as ThemeId)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          theme === id
                            ? "border-primary/40 bg-primary/10"
                            : "border-surface hover:border-primary/20"
                        }`}
                      >
                        <div className="flex gap-1 mb-2">
                          <div className="w-4 h-4 rounded-full" style={{ background: pkg.colors.primary }} />
                          <div className="w-4 h-4 rounded-full" style={{ background: pkg.colors.accent }} />
                          <div className="w-4 h-4 rounded-full" style={{ background: pkg.colors.panel }} />
                        </div>
                        <p className="text-xs font-bold text-text-main truncate">{pkg.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Accessibility</SectionLabel>
                  <label className="flex items-center justify-between py-3 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-text-main">Reduce motion</p>
                      <p className="text-xs text-text-muted">Disable animations and transitions</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={reduceMotion}
                      onChange={(e) => handleReduceMotionChange(e.target.checked)}
                      className="w-5 h-5 rounded accent-primary cursor-pointer"
                    />
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium text-text-muted mb-2 block">
                    Input font size
                  </label>
                  <div className="flex gap-2">
                    {INPUT_FONT_SIZES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => handleInputFontSizeChange(s.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                          inputFontSize === s.value
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-surface/40 text-text-muted border border-surface hover:text-text-main"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-6">
                <div>
                  <SectionLabel>Visibility</SectionLabel>
                  <label className="flex items-center justify-between py-3 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-text-main">Show online status</p>
                      <p className="text-xs text-text-muted">Let friends see when you're active</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={onlineStatus}
                      onChange={(e) => handleOnlineStatusChange(e.target.checked)}
                      className="w-5 h-5 rounded accent-primary cursor-pointer"
                    />
                  </label>
                </div>

                <div>
                  <SectionLabel>Friend requests</SectionLabel>
                  <label className="text-sm font-medium text-text-muted mb-2 block">
                    Who can send you requests
                  </label>
                  <select
                    value={friendRequestPref}
                    onChange={(e) => handleFriendRequestPrefChange(e.target.value)}
                    className="w-full rounded-lg border border-surface bg-surface/40 px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="friends_of_friends">Friends of friends</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div>
                  <SectionLabel>Blocked users</SectionLabel>
                  <p className="text-sm text-text-muted">No blocked users.</p>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="space-y-6">
                <div>
                  <SectionLabel>Username</SectionLabel>
                  <p className="text-sm text-text-muted mb-3">
                    Current: <span className="text-text-main font-medium">{userData?.username}</span>
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="New username"
                      maxLength={15}
                      className="flex-1 rounded-lg border border-surface bg-surface/40 px-3 py-2 text-sm text-text-main placeholder:text-text-muted/50 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleChangeUsername}
                      disabled={usernameLoading || !newUsername.trim()}
                      className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-bold border border-primary/30 hover:bg-primary/30 disabled:opacity-50 transition-colors"
                    >
                      {usernameLoading ? "..." : "Save"}
                    </button>
                  </div>
                </div>

                <div>
                  <SectionLabel>Change password</SectionLabel>
                  <div className="space-y-2">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      className="w-full rounded-lg border border-surface bg-surface/40 px-3 py-2 text-sm text-text-main placeholder:text-text-muted/50 focus:outline-none focus:border-primary"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password (min 6 chars)"
                      className="w-full rounded-lg border border-surface bg-surface/40 px-3 py-2 text-sm text-text-main placeholder:text-text-muted/50 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleChangePassword}
                      disabled={passwordLoading || !currentPassword || !newPassword}
                      className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-bold border border-primary/30 hover:bg-primary/30 disabled:opacity-50 transition-colors"
                    >
                      {passwordLoading ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </div>

                <div>
                  <SectionLabel>Danger zone</SectionLabel>
                  <p className="text-xs text-text-muted mb-2">Permanently delete your account and all data.</p>
                  <button className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/10 transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-6">
                <div>
                  <SectionLabel>Application</SectionLabel>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Version</span>
                      <span className="text-text-main font-mono">0.1.0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Build</span>
                      <span className="text-text-main font-mono">Production</span>
                    </div>
                  </div>
                </div>

                <div>
                  <SectionLabel>Keyboard shortcuts</SectionLabel>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Submit answer</span>
                      <kbd className="px-2 py-0.5 rounded bg-surface/60 text-text-main text-xs font-mono">Enter</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Replay word</span>
                      <kbd className="px-2 py-0.5 rounded bg-surface/60 text-text-main text-xs font-mono">Click 🔊</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Close modals</span>
                      <kbd className="px-2 py-0.5 rounded bg-surface/60 text-text-main text-xs font-mono">Esc</kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <SectionLabel>Links</SectionLabel>
                  <div className="space-y-2">
                    <a
                      href="https://github.com/fogydes/HiveSpell/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-primary hover:underline"
                    >
                      Report a bug →
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
