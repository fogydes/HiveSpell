import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useScene } from "../context/SceneContext";
import { auth } from "../firebase";
import {
  updatePassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  linkWithPopup,
  unlink,
} from "firebase/auth";
import { useToast } from "../context/ToastContext";
import { supabase } from "../services/supabase";
import { DiscordIcon, GoogleIcon } from "./auth/ProviderIcons";
import { discordLoginEnabled, startDiscordOAuth } from "../services/discordOAuth";
import { THEME_PACKAGES, type ThemeId } from "../data/themePackages";
import { SCENE_PACKAGES, type SceneId, getScenePackage } from "../data/themes/scenePackages";
import { LOCALES, type LocaleId } from "../data/localization";
import { changeLanguage } from "../i18n";
import { useReduceMotion } from "../hooks/useAccessibility";
import { useTranslation } from "react-i18next";

type SettingsTab = "audio" | "display" | "privacy" | "account" | "about";

interface SettingsPanelProps {
  onClose: () => void;
}


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

const SCENE_METADATA: Record<SceneId, { label: string; description: string }> = {
  default: { label: "Hive Classic", description: "Warm gold & honey tones with organic pollen particles" },
  neon: { label: "Neon Grid", description: "Electric cyan/pink with digital rain & circuit particles" },
  nature: { label: "Forest Bloom", description: "Earthy greens with floating leaf & pollen particles" },
  cyber: { label: "Cyber Core", description: "Dark tech with hexagonal & ember particles" },
  minimal: { label: "Minimal Light", description: "Clean white with subtle ambient glow" },
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] uppercase tracking-[0.3em] text-text-muted/60 mb-3">
    {children}
  </p>
);

/** One row of the "Connected accounts" list — provider mark, status, action. */
const ConnectionRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  statusText: string;
  linked: boolean;
  busy: boolean;
  disabled: boolean;
  actionLabel: string;
  onAction: () => void;
}> = ({
  icon,
  label,
  statusText,
  linked,
  busy,
  disabled,
  actionLabel,
  onAction,
}) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-surface bg-surface/30 px-3 py-2.5">
    <div className="flex min-w-0 items-center gap-3">
      {icon}
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-main">{label}</p>
        <p className="text-xs text-text-muted">{statusText}</p>
      </div>
    </div>
    <button
      onClick={onAction}
      disabled={disabled || busy}
      aria-label={`${actionLabel} ${label}`}
      className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        linked
          ? "border-surface text-text-muted hover:border-red-500/30 hover:text-red-400"
          : "border-primary/30 bg-primary/20 text-primary hover:bg-primary/30"
      }`}
    >
      {busy ? "..." : actionLabel}
    </button>
  </div>
);

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { user, userData, refreshUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const TABS: { key: SettingsTab; label: string; icon: string }[] = [
    { key: "audio", label: t("settings.tabs.audio"), icon: "🔊" },
    { key: "display", label: t("settings.tabs.display"), icon: "🎨" },
    { key: "privacy", label: t("settings.tabs.privacy"), icon: "🔒" },
    { key: "account", label: t("settings.tabs.account"), icon: "👤" },
    { key: "about", label: t("settings.tabs.about"), icon: "ℹ️" },
  ];

  const {
    ttsVolume,
    setTtsVolume,
    sfxVolume,
    setSfxVolume,
    theme,
    setTheme,
    locale,
    setLocale,
  } = useSettings();
  const { currentScene, setScene, performanceTier } = useScene();
  const reduceMotionPref = useReduceMotion();

  const [activeTab, setActiveTab] = useState<SettingsTab>("audio");

  // Audio settings (persisted to localStorage)
  const [replaySpeed, setReplaySpeed] = useState(() =>
    parseFloat(localStorage.getItem("hive_replay_speed") || "0.9"),
  );

  // Display settings
  const [localReduceMotion, setLocalReduceMotion] = useState(() =>
    localStorage.getItem("hive_reduce_motion") === "1",
  );
  const reduceMotion = reduceMotionPref || localReduceMotion;
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

  // Connected accounts. `providerData` isn't reactive, so the Google row keeps
  // its own state and re-reads it after a link/unlink. Discord lives in the
  // Supabase profile instead (it's a custom-token bridge, not a Firebase
  // provider), so it comes straight from `userData`.
  const [googleLinked, setGoogleLinked] = useState(
    () =>
      auth.currentUser?.providerData.some(
        (p) => p.providerId === "google.com",
      ) ?? false,
  );
  const [connectionLoading, setConnectionLoading] = useState<
    "google" | "discord" | null
  >(null);

  const disableAnimations = performanceTier === "static" || reduceMotion;

  const handleReplaySpeedChange = (speed: number) => {
    setReplaySpeed(speed);
    localStorage.setItem("hive_replay_speed", speed.toString());
  };

  const handleReduceMotionChange = (enabled: boolean) => {
    setLocalReduceMotion(enabled);
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

  const discordLinked = !!userData?.discordId;
  // Discord-first accounts sign in with a custom token, so their Firebase
  // `providerData` is empty — counting it plus the Discord link yields 1 for
  // them, which is exactly what the last-method guard needs.
  const linkedMethods =
    (auth.currentUser?.providerData.length ?? 0) + (discordLinked ? 1 : 0);
  const canUnlink = linkedMethods > 1;
  // A linked row stays visible even when the feature flag is off, so nobody
  // gets stranded with a link they can't remove.
  const showDiscordRow = discordLoginEnabled() || discordLinked;

  const handleLinkGoogle = async () => {
    const current = auth.currentUser;
    if (!current) return;
    setConnectionLoading("google");
    try {
      const result = await linkWithPopup(current, new GoogleAuthProvider());
      setGoogleLinked(
        result.user.providerData.some((p) => p.providerId === "google.com"),
      );
      showToast({
        title: "Google linked",
        message: "You can now sign in with Google.",
        variant: "success",
      });
    } catch (err: any) {
      const code: string = err?.code ?? "";
      // User dismissed / superseded the popup — nothing worth surfacing.
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      let message = "Could not link your Google account.";
      if (
        code === "auth/credential-already-in-use" ||
        code === "auth/email-already-in-use"
      ) {
        message =
          "That Google account is already attached to another HiveSpell account.";
      } else if (code === "auth/provider-already-linked") {
        message = "Google is already linked to this account.";
      } else if (code === "auth/popup-blocked") {
        message = "Popup blocked — please allow popups and try again.";
      } else if (code === "auth/requires-recent-login") {
        message = "Please sign in again, then retry linking.";
      }
      console.error("Google link error", err);
      showToast({ title: "Linking failed", message, variant: "error" });
    } finally {
      setConnectionLoading(null);
    }
  };

  const handleUnlinkGoogle = async () => {
    const current = auth.currentUser;
    if (!current || !canUnlink) return;
    setConnectionLoading("google");
    try {
      const updated = await unlink(current, "google.com");
      setGoogleLinked(
        updated.providerData.some((p) => p.providerId === "google.com"),
      );
      showToast({
        title: "Google unlinked",
        message: "Google sign-in has been removed from this account.",
        variant: "success",
      });
    } catch (err: any) {
      console.error("Google unlink error", err);
      showToast({
        title: "Failed",
        message: err?.message || "Could not unlink your Google account.",
        variant: "error",
      });
    } finally {
      setConnectionLoading(null);
    }
  };

  const handleLinkDiscord = () => {
    // Leaves the app for Discord's consent screen; the exchange finishes in
    // `views/LinkDiscordCallback.tsx` (route `/link/discord`).
    if (!auth.currentUser) return;
    setConnectionLoading("discord");
    startDiscordOAuth("link");
  };

  const handleUnlinkDiscord = async () => {
    if (!auth.currentUser || !user || !canUnlink) return;
    setConnectionLoading("discord");
    try {
      // Clearing `discord_id` is permitted by the `profiles_guard_discord_id`
      // trigger; only the Edge Function (service role) may ever set it.
      const { error } = await supabase
        .from("profiles")
        .update({ discord_id: null })
        .eq("id", user.uid);
      if (error) throw error;
      await refreshUser();
      showToast({
        title: "Discord unlinked",
        message: "Discord sign-in has been removed from this account.",
        variant: "success",
      });
    } catch (err: any) {
      console.error("Discord unlink error", err);
      showToast({
        title: "Failed",
        message: err?.message || "Could not unlink your Discord account.",
        variant: "error",
      });
    } finally {
      setConnectionLoading(null);
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
          <h2 className="text-xl font-bold text-text-main">{t("settings.title")}</h2>
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
                  <SectionLabel>{t("settings.audio.voicePlayback")}</SectionLabel>
                  <label className="flex justify-between text-sm font-medium text-text-muted mb-2">
                    <span>{t("settings.audio.ttsVolume")}</span>
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
                    <span>{t("settings.audio.sfxVolume")}</span>
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
                  <SectionLabel>{t("settings.audio.wordReplay")}</SectionLabel>
                  <label className="text-sm font-medium text-text-muted mb-2 block">
                    {t("settings.audio.replaySpeed")}
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
                  <p className="mt-2 text-xs text-text-muted/60">{t("settings.audio.replaySpeedHint")}</p>
                </div>
              </div>
            )}

            {activeTab === "display" && (
              <div className="space-y-6">
                <div>
                  <SectionLabel>{t("settings.display.theme")}</SectionLabel>
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
                  <SectionLabel>{t("settings.display.accessibility")}</SectionLabel>
                  <label className="flex items-center justify-between py-3 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-text-main">{t("settings.display.reduceMotion")}</p>
                      <p className="text-xs text-text-muted">{t("settings.display.reduceMotionDesc")}</p>
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
                  <SectionLabel>{t("settings.display.language")}</SectionLabel>
                  <label className="text-sm font-medium text-text-muted mb-2 block">
                    {t("settings.display.wordBankLocale")}
                  </label>
                  <select
                    value={locale}
                    onChange={async (e) => {
                      const newLocale = e.target.value as LocaleId;
                      await setLocale(newLocale);
                    }}
                    className="w-full rounded-lg border border-surface bg-surface/40 px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary"
                  >
                    {Object.values(LOCALES).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label} - {option.nativeLabel}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-text-muted/60">
                    {t("settings.display.localeHint")}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-text-muted mb-2 block">
                    {t("settings.display.inputFontSize")}
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

                <div>
                  <SectionLabel>{t("settings.display.scene")}</SectionLabel>
                  <p className="text-xs text-text-muted/60 mb-3">{t("settings.display.chooseAtmosphere")}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(SCENE_PACKAGES).map(([id, scene]) => {
                      const isActive = id === currentScene.id;
                      return (
                        <button
                          key={id}
                          onClick={() => setScene(id as SceneId)}
                          className={`relative px-4 py-3 rounded-xl border transition-all font-medium text-sm ${
                            isActive
                              ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_var(--color-primary)]"
                              : "border-surface bg-panel/50 text-text-muted hover:border-primary/50 hover:text-text-main"
                          }`}
                          style={{
                            background: isActive ? scene.ambient.panelGradient : undefined,
                          }}
                        >
                          {SCENE_METADATA[id as SceneId].label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-center text-sm text-text-muted max-w-xs mx-auto">
                    {SCENE_METADATA[currentScene.id].description}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-6">
                <div>
                  <SectionLabel>{t("settings.privacy.visibility")}</SectionLabel>
                  <label className="flex items-center justify-between py-3 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-text-main">{t("settings.privacy.showOnlineStatus")}</p>
                      <p className="text-xs text-text-muted">{t("settings.privacy.showOnlineStatusDesc")}</p>
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
                  <SectionLabel>{t("settings.privacy.friendRequests")}</SectionLabel>
                  <label className="text-sm font-medium text-text-muted mb-2 block">
                    {t("settings.privacy.whoCanSendRequests")}
                  </label>
                  <select
                    value={friendRequestPref}
                    onChange={(e) => handleFriendRequestPrefChange(e.target.value)}
                    className="w-full rounded-lg border border-surface bg-surface/40 px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="everyone">{t("settings.privacy.everyone")}</option>
                    <option value="friends_of_friends">{t("settings.privacy.friendsOfFriends")}</option>
                    <option value="nobody">{t("settings.privacy.nobody")}</option>
                  </select>
                </div>

                <div>
                  <SectionLabel>{t("settings.privacy.blockedUsers")}</SectionLabel>
                  <p className="text-sm text-text-muted">{t("settings.privacy.noBlockedUsers")}</p>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="space-y-6">
                <div>
                  <SectionLabel>{t("settings.account.username")}</SectionLabel>
                  <p className="text-sm text-text-muted mb-3">
                    {t("settings.account.current")}: <span className="text-text-main font-medium">{userData?.username}</span>
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder={t("settings.account.newUsernamePlaceholder")}
                      maxLength={15}
                      className="flex-1 rounded-lg border border-surface bg-surface/40 px-3 py-2 text-sm text-text-main placeholder:text-text-muted/50 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleChangeUsername}
                      disabled={usernameLoading || !newUsername.trim()}
                      className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-bold border border-primary/30 hover:bg-primary/30 disabled:opacity-50 transition-colors"
                    >
                      {usernameLoading ? "..." : t("settings.account.save")}
                    </button>
                  </div>
                </div>

                <div>
                  <SectionLabel>{t("settings.account.connections.title")}</SectionLabel>
                  <div className="space-y-2">
                    <ConnectionRow
                      icon={<GoogleIcon />}
                      label={t("settings.account.connections.google")}
                      statusText={
                        googleLinked
                          ? t("settings.account.connections.linked")
                          : t("settings.account.connections.notLinked")
                      }
                      linked={googleLinked}
                      busy={connectionLoading === "google"}
                      disabled={
                        connectionLoading !== null || (googleLinked && !canUnlink)
                      }
                      actionLabel={
                        googleLinked
                          ? t("settings.account.connections.unlink")
                          : t("settings.account.connections.link")
                      }
                      onAction={googleLinked ? handleUnlinkGoogle : handleLinkGoogle}
                    />

                    {showDiscordRow && (
                      <ConnectionRow
                        icon={<DiscordIcon />}
                        label={t("settings.account.connections.discord")}
                        statusText={
                          discordLinked
                            ? t("settings.account.connections.linked")
                            : t("settings.account.connections.notLinked")
                        }
                        linked={discordLinked}
                        busy={connectionLoading === "discord"}
                        disabled={
                          connectionLoading !== null ||
                          (discordLinked && !canUnlink)
                        }
                        actionLabel={
                          discordLinked
                            ? t("settings.account.connections.unlink")
                            : t("settings.account.connections.link")
                        }
                        onAction={
                          discordLinked ? handleUnlinkDiscord : handleLinkDiscord
                        }
                      />
                    )}
                  </div>
                  {!canUnlink && (
                    <p className="mt-2 text-[11px] text-text-muted/60">
                      {t("settings.account.connections.lastMethodHint")}
                    </p>
                  )}
                </div>

                <div>
                  <SectionLabel>{t("settings.account.changePassword")}</SectionLabel>
                  <div className="space-y-2">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t("settings.account.currentPasswordPlaceholder")}
                      className="w-full rounded-lg border border-surface bg-surface/40 px-3 py-2 text-sm text-text-main placeholder:text-text-muted/50 focus:outline-none focus:border-primary"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t("settings.account.newPasswordPlaceholder")}
                      className="w-full rounded-lg border border-surface bg-surface/40 px-3 py-2 text-sm text-text-main placeholder:text-text-muted/50 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleChangePassword}
                      disabled={passwordLoading || !currentPassword || !newPassword}
                      className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-bold border border-primary/30 hover:bg-primary/30 disabled:opacity-50 transition-colors"
                    >
                      {passwordLoading ? t("settings.account.updating") : t("settings.account.updatePassword")}
                    </button>
                  </div>
                </div>

                <div>
                  <SectionLabel>{t("settings.account.dangerZone")}</SectionLabel>
                  <p className="text-xs text-text-muted mb-2">{t("settings.account.deleteAccountDesc")}</p>
                  <button className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/10 transition-colors">
                    {t("settings.account.deleteAccount")}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-6">
                <div>
                  <SectionLabel>{t("settings.about.application")}</SectionLabel>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">{t("settings.about.version")}</span>
                      <span className="text-text-main font-mono">0.1.0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">{t("settings.about.build")}</span>
                      <span className="text-text-main font-mono">Production</span>
                    </div>
                  </div>
                </div>

                <div>
                  <SectionLabel>{t("settings.about.keyboardShortcuts")}</SectionLabel>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">{t("settings.about.submitAnswer")}</span>
                      <kbd className="px-2 py-0.5 rounded bg-surface/60 text-text-main text-xs font-mono">Enter</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{t("settings.about.replayWord")}</span>
                      <kbd className="px-2 py-0.5 rounded bg-surface/60 text-text-main text-xs font-mono">Click 🔊</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{t("settings.about.closeModals")}</span>
                      <kbd className="px-2 py-0.5 rounded bg-surface/60 text-text-main text-xs font-mono">Esc</kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <SectionLabel>{t("settings.about.links")}</SectionLabel>
                  <div className="space-y-2">
                    <a
                      href="https://github.com/fogydes/HiveSpell/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-primary hover:underline"
                    >
                      {t("settings.about.reportBug")}
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
