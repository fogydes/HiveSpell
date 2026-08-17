import React, { useState, useEffect, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getFriendshipStatus,
  sendFriendRequest,
  Friendship,
} from "../services/friendService";
import { ITEM_CATALOG } from "../data/customizationCatalog";
import { THEME_PACKAGES, ThemeId } from "../data/themePackages";
import { TierBadge, TierBadgeMini, TierProgressBar } from "./tier/TierBadge";
import { getTierFromStats, getTierProgress, getNextTierName, type PlayerStats } from "../utils/tierRanking";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import { useTranslation } from "react-i18next";

interface ProfileData {
  id: string;
  username: string;
  title: string;
  corrects: number;
  wins: number;
  current_nectar: number;
  lifetime_nectar: number;
  inventory: string[];
  equipped_theme?: string | null;
  equipped_cursor?: string | null;
  equipped_badge?: string | null;
  avatar_url?: string;
  avatar_seed?: string;
}

interface ProfileModalProps {
  userId: string;
  onClose: () => void;
}

const StatCard: React.FC<{
  label: string;
  value: string | number;
  accent?: "primary" | "accent" | "muted";
  detail?: string;
}> = ({ label, value, accent = "muted", detail }) => {
  const accentClass =
    accent === "primary"
      ? "text-primary"
      : accent === "accent"
        ? "text-accent"
        : "text-text-main";

  return (
    <div className="rounded-[20px] border border-surface/80 bg-black/20 px-4 py-4 backdrop-blur-md sm:rounded-[24px]">
      <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
        {label}
      </p>
      <p className={`mt-3 text-2xl font-black leading-none sm:text-3xl ${accentClass}`}>
        {value}
      </p>
      {detail && (
        <p className="mt-2 text-xs leading-5 text-text-muted">{detail}</p>
      )}
    </div>
  );
};

const LoadoutCard: React.FC<{
  label: string;
  value: string;
  tone?: "primary" | "accent";
}> = ({ label, value, tone = "primary" }) => (
  <div
    className={`rounded-[22px] border px-4 py-4 ${
      tone === "primary"
        ? "border-primary/20 bg-primary/10"
        : "border-amber-400/20 bg-amber-400/10"
    }`}
  >
    <p className="text-[10px] uppercase tracking-[0.3em] text-text-muted/60">
      {label}
    </p>
    <p className="mt-3 text-sm font-semibold text-text-main">{value}</p>
  </div>
);

export const ProfileModal: React.FC<ProfileModalProps> = ({
  userId,
  onClose,
}) => {
  const { user, userData, refreshUser } = useAuth();
  const { showToast } = useToast();
  const { performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const { t } = useTranslation("profileModal");
  const disableAnimations = performanceTier === "static" || reduceMotion;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOwnProfile = user?.uid === userId;
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      // 0. Configuration Check
      if (!isSupabaseConfigured) {
        setLoading(false);
        setError(
          t("profileModal.setupRequired"),
        );
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (fetchError) throw fetchError;
        setProfile(data);
      } catch (err: any) {
        console.error("Failed to fetch profile:", err);
        setError(t("profileModal.errorLoadingProfile"));
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
      // Fetch friendship status if viewing another user
      if (user && user.uid !== userId) {
        getFriendshipStatus(user.uid, userId).then((f) => {
          setFriendship(f);
          setFriendshipStatus(f?.status || null);
        });
      }
    }
  }, [userId, user]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error(t("profileModal.selectImageToUpload"));
      }

      const file = event.target.files[0];

      // Allowed extensions
      const allowedExtensions = ["png", "jpg", "jpeg", "webp", "gif"];
      const fileExt = file.name.split(".").pop()?.toLowerCase();

      if (!fileExt || !allowedExtensions.includes(fileExt)) {
        throw new Error(
          t("profileModal.invalidFileType"),
        );
      }

      const fileName = `${profile.id}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // 3. Update Profile with cache-busting timestamp
      const finalUrl = `${publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: finalUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      // 4. Update local state and global context
      setProfile({ ...profile, avatar_url: finalUrl });
      await refreshUser();

      // Optional: Refresh parent if needed (window.location.reload() is heavy but effective)
      // window.location.reload();
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      showToast({
        title: t("profileModal.avatarUploadFailed"),
        message: error.message || t("profileModal.errorUploadingAvatar"),
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const themeKey = (
    profile?.equipped_theme ||
    (isOwnProfile ? userData?.equippedTheme : null) ||
    "hive"
  ) as ThemeId;
  const activeTheme = THEME_PACKAGES[themeKey] || THEME_PACKAGES.hive;
  const equippedCursorId =
    profile?.equipped_cursor ||
    (isOwnProfile ? userData?.equippedCursor : null) ||
    null;
  const equippedBadgeId =
    profile?.equipped_badge ||
    (isOwnProfile ? userData?.equippedBadge : null) ||
    null;
  const equippedCursor = equippedCursorId ? ITEM_CATALOG[equippedCursorId] : null;
  const equippedBadge = equippedBadgeId ? ITEM_CATALOG[equippedBadgeId] : null;
  const ownedItems = (profile?.inventory ?? [])
    .map((itemId) => ITEM_CATALOG[itemId])
    .filter(Boolean);
  const collectionCount = profile?.inventory?.length ?? 0;
  const currentNectar = profile?.current_nectar ?? 0;
  const lifetimeNectar = profile?.lifetime_nectar ?? 0;
  const nectarProgress =
    lifetimeNectar > 0 ? Math.min(100, (currentNectar / lifetimeNectar) * 100) : 0;
  const correctsPerWin =
    profile && profile.wins > 0 ? (profile.corrects / profile.wins).toFixed(1) : "—";
  const profileAvatar =
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.avatar_seed || profile?.id || userId}`;

  // Compute tier from profile stats
  const playerStats: PlayerStats = useMemo(() => ({
    wins: profile?.wins ?? 0,
    corrects: profile?.corrects ?? 0,
    lifetimeNectar: profile?.lifetime_nectar ?? 0,
    gamesPlayed: 0, // Not tracked in profile currently
  }), [profile]);

  const tier = useMemo(() => getTierFromStats(playerStats), [playerStats]);
  const tierProgress = useMemo(() => getTierProgress(playerStats), [playerStats]);
  const nextTierName = useMemo(() => getNextTierName(playerStats), [playerStats]);
  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 p-2 backdrop-blur-md animate-fade-in sm:p-4"
      onClick={onClose}
      style={{
        animation: disableAnimations ? "none" : "fadeIn 0.2s ease-out",
      }}
    >
      <div className="flex min-h-full items-start justify-center touch-pan-y">
        <div
          className="theme-panel-shell relative flex h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden overscroll-contain rounded-[22px] border border-surface/80 bg-app shadow-[0_32px_100px_rgba(0,0,0,0.45)] animate-scale-in sm:my-6 sm:h-[88vh] sm:rounded-[30px]"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-main transition-colors text-xl z-10"
        >
          ✕
        </button>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex min-h-full items-center justify-center p-12 text-center">
            <div>
              <div className="mb-4 text-4xl animate-spin">🐝</div>
              <p className="text-text-muted">{t("profileModal.loadingProfile")}</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-full items-center justify-center p-12 text-center">
            <div>
              <div className="mb-4 text-4xl opacity-50">❌</div>
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        ) : profile ? (
            <div className="relative p-3 pb-5 pt-12 sm:p-6 sm:pb-6 sm:pt-6">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-36 opacity-90 sm:h-64"
                style={{ background: activeTheme.scene.appGradient }}
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.08)_0,transparent_18%),radial-gradient(circle_at_80%_12%,rgba(16,185,129,0.14)_0,transparent_24%),radial-gradient(circle_at_74%_78%,rgba(245,158,11,0.12)_0,transparent_22%)] sm:h-64" />

              <div className="relative overflow-hidden rounded-[22px] border border-surface/80 bg-black/20 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:rounded-[28px]">
                <div className="relative h-24 overflow-hidden border-b border-surface/60 sm:h-48">
                  <div
                    className="absolute inset-0"
                    style={{ background: activeTheme.scene.panelGradient }}
                  />
                  <div className="absolute -left-10 top-6 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
                  <div className="absolute right-4 top-4 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-200">
                    {isOwnProfile ? t("profileModal.yourDossier") : t("profileModal.playerDossier")}
                  </div>
                </div>

                <div className="relative px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
                  <div className="-mt-8 flex flex-col gap-4 lg:-mt-12 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex min-w-0 items-end gap-4">
                      <div className="group relative h-20 w-20 overflow-hidden rounded-[24px] border-4 border-primary/30 bg-panel shadow-[0_20px_45px_rgba(0,0,0,0.45)] sm:h-28 sm:w-28 sm:rounded-[28px]">
                        <img
                          src={profileAvatar}
                          alt={profile.username}
                          className="h-full w-full object-cover"
                        />

                        {isOwnProfile && (
                          <label
                            htmlFor="avatar-upload"
                            className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/65 text-[10px] font-bold uppercase tracking-[0.2em] text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            {uploading ? t("profileModal.uploading") : t("profileModal.changePhoto")}
                            <input
                              id="avatar-upload"
                              type="file"
                              accept=".png,.jpg,.jpeg,.webp,.gif"
                              className="hidden"
                              onChange={handleUpload}
                              disabled={uploading}
                            />
                          </label>
                        )}
                      </div>

                      <div className="min-w-0 pb-1">
                        <p className="text-[10px] uppercase tracking-[0.34em] text-text-muted/55">
                          {t("profileModal.hiveSpellProfile")}
                        </p>
                        <h2 className="mt-2 truncate text-[2rem] font-black leading-none text-text-main sm:text-[2.7rem]">
                          {profile.username}
                        </h2>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {/* Tier Badge */}
                          <TierBadge tier={tier} size="md" showProgress={true} progress={tierProgress} nextTierName={nextTierName} animate={true} />
                          <span className="rounded-full border border-primary/25 bg-primary/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                            {profile.title || t("profileModal.newbee")}
                          </span>
                          <span className="rounded-full border border-surface/70 bg-surface/30 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-text-muted">
                            {t("profileModal.relicsLogged", { count: collectionCount })}
                          </span>
                        </div>
                        {/* Tier progress bar */}
                        <TierProgressBar
                          tier={tier}
                          progress={tierProgress}
                          nextTierName={nextTierName}
                          showLabels={true}
                          className="mt-3 max-w-sm"
                        />
                      </div>
                    </div>
                    {!isOwnProfile && (
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <div className="flex flex-wrap gap-2">
                          {friendshipStatus === "accepted" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                              🤝 {t("profileModal.friends")}
                            </span>
                          ) : friendshipStatus === "pending" &&
                            friendship?.requester_id === user?.uid ? (
                            <button
                              onClick={async () => {
                                if (!user || !friendship) return;
                                setFriendActionLoading(true);
                                const result = await cancelFriendRequest(
                                  friendship.id,
                                  user.uid,
                                );
                                if (result.success) {
                                  setFriendship(null);
                                  setFriendshipStatus(null);
                                } else {
                                  showToast({
                                    title: t("profileModal.cancelFailed"),
                                    message:
                                      result.error ||
                                      t("profileModal.failedToCancelRequest"),
                                    variant: "error",
                                  });
                                }
                                setFriendActionLoading(false);
                              }}
                              disabled={friendActionLoading}
                              className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                            >
                              {friendActionLoading
                                ? t("profileModal.cancelling")
                                : t("profileModal.cancelRequest")}
                            </button>
                          ) : friendshipStatus === "pending" &&
                            friendship?.addressee_id === user?.uid ? (
                            <div className="flex flex-wrap justify-center gap-2">
                              <button
                                onClick={async () => {
                                  if (!userData || !friendship) return;
                                  setFriendActionLoading(true);
                                  const result = await acceptFriendRequest(
                                    friendship.id,
                                    userData.username || "Someone",
                                  );
                                  if (result.success) {
                                    setFriendship({
                                      ...friendship,
                                      status: "accepted",
                                    });
                                    setFriendshipStatus("accepted");
                                  } else {
                                    showToast({
                                      title: t("profileModal.acceptFailed"),
                                      message:
                                        result.error ||
                                        t("profileModal.failedToAcceptRequest"),
                                      variant: "error",
                                    });
                                  }
                                  setFriendActionLoading(false);
                                }}
                                disabled={friendActionLoading}
                                className="rounded-full border border-primary/30 bg-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
                              >
                                {t("profileModal.acceptRequest")}
                              </button>
                              <button
                                onClick={async () => {
                                  if (!friendship) return;
                                  setFriendActionLoading(true);
                                  const result =
                                    await declineFriendRequest(friendship.id);
                                  if (result.success) {
                                    setFriendship(null);
                                    setFriendshipStatus(null);
                                  } else {
                                    showToast({
                                      title: t("profileModal.declineFailed"),
                                      message:
                                        result.error ||
                                        t("profileModal.failedToDeclineRequest"),
                                      variant: "error",
                                    });
                                  }
                                  setFriendActionLoading(false);
                                }}
                                disabled={friendActionLoading}
                                className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                              >
                                {t("profileModal.declineRequest")}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={async () => {
                                if (!user || !userData) return;
                                setFriendActionLoading(true);
                                const result = await sendFriendRequest(
                                  user.uid,
                                  userId,
                                  userData.username || "Someone",
                                );
                                if (result.success) {
                                  setFriendship({
                                    id: crypto.randomUUID(),
                                    requester_id: user.uid,
                                    addressee_id: userId,
                                    status: "pending",
                                    created_at: new Date().toISOString(),
                                  });
                                  setFriendshipStatus("pending");
                                } else {
                                  showToast({
                                    title: t("profileModal.friendRequestFailed"),
                                    message:
                                      result.error || t("profileModal.failedToSendRequest"),
                                    variant: "error",
                                  });
                                }
                                setFriendActionLoading(false);
                              }}
                              disabled={friendActionLoading}
                              className="rounded-full border border-primary/30 bg-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
                            >
                              {friendActionLoading ? t("profileModal.sending") : t("profileModal.sendFriendRequest")}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)]">
                    <div className="space-y-6">
                      <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
                        <StatCard
                          label={t("profileModal.wins")}
                          value={(profile.wins ?? 0).toLocaleString()}
                          accent="primary"
                          detail={t("profileModal.roundVictories")}
                        />
                        <StatCard
                          label={t("profileModal.corrects")}
                          value={(profile.corrects ?? 0).toLocaleString()}
                          detail={t("profileModal.acceptedAnswers")}
                        />
                        <StatCard
                          label={t("profileModal.currentNectar")}
                          value={currentNectar.toLocaleString()}
                          accent="accent"
                          detail={t("profileModal.availableBalance")}
                        />
                        <StatCard
                          label={t("profileModal.correctsPerWin")}
                          value={correctsPerWin}
                          detail={t("profileModal.efficiencyRatio")}
                        />
                      </div>

                      <div className="rounded-[22px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[26px] sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                              {t("profileModal.activeLoadout")}
                            </p>
                            <h3 className="mt-2 text-xl font-black text-text-main">
                              {t("profileModal.currentCustomizationPackage")}
                            </h3>
                          </div>
                          <div
                            className="rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em]"
                            style={{
                              borderColor: activeTheme.scene.borderStrong,
                              boxShadow: activeTheme.scene.glowShadow,
                            }}
                          >
                            {activeTheme.name}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 lg:grid-cols-3">
                          <LoadoutCard
                            label={t("profileModal.theme")}
                            value={activeTheme.name}
                            tone="primary"
                          />
                          <LoadoutCard
                            label={t("profileModal.cursor")}
                            value={equippedCursor?.name || t("profileModal.standardPointer")}
                            tone="accent"
                          />
                          <LoadoutCard
                            label={t("profileModal.badge")}
                            value={equippedBadge?.name || t("profileModal.noBadgeEquipped")}
                            tone="primary"
                          />
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[26px] sm:p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                              {t("profileModal.collectionVault")}
                            </p>
                            <h3 className="mt-2 text-xl font-black text-text-main">
                              {t("profileModal.ownedRelicsAndCosmetics")}
                            </h3>
                          </div>
                          <p className="text-sm text-text-muted">
                            {t("profileModal.relicsLogged", { count: collectionCount })}
                          </p>
                        </div>

                        {ownedItems.length > 0 ? (
                          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {ownedItems.slice(0, 6).map((item) => (
                              <div
                                key={item.id}
                                className="rounded-[18px] border border-surface/70 bg-panel/60 p-4 sm:rounded-[22px]"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-xl">
                                    {item.icon}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-text-main">
                                      {item.name}
                                    </p>
                                    <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-text-muted/60">
                                      {item.category}
                                    </p>
                                  </div>
                                </div>
                                <p className="mt-4 text-sm leading-6 text-text-muted">
                                  {item.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-5 rounded-[22px] border border-dashed border-surface/70 bg-panel/35 px-5 py-8 text-center">
                            <p className="text-sm font-semibold text-text-main">
                              {t("profileModal.noRelicsEquipped")}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-text-muted">
                              {t("profileModal.purchasesAppearHere")}
                            </p>
                          </div>
                        )}

                        {ownedItems.length > 6 && (
                          <p className="mt-4 text-sm text-text-muted">
                            {t("profileModal.moreItemsInStorage", { count: ownedItems.length - 6, count_plural: ownedItems.length - 6 === 1 ? "" : "s" })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-[22px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[26px] sm:p-5">
                        <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                          {t("profileModal.dossierSummary")}
                        </p>
                        <h3 className="mt-2 text-xl font-black text-text-main">
                          {t("profileModal.progressAndReserveBalance")}
                        </h3>

                        <div className="mt-5 rounded-[24px] border border-surface/70 bg-panel/55 p-4">
                          <div className="flex items-center justify-between text-sm text-text-muted">
                            <span>{t("profileModal.reserveRatio")}</span>
                            <span>{Math.round(nectarProgress)}%</span>
                          </div>
                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface/60">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${nectarProgress}%`,
                                background: activeTheme.scene.appGradient,
                              }}
                            />
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/55">
                                {t("profileModal.currentReserve")}
                              </p>
                              <p className="mt-2 text-2xl font-black text-primary">
                                {currentNectar.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/55">
                                {t("profileModal.lifetimeNectar")}
                              </p>
                              <p className="mt-2 text-2xl font-black text-accent">
                                {lifetimeNectar.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 space-y-3 text-sm text-text-muted">
                          <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
                            <span>{t("profileModal.themePackage")}</span>
                            <span className="font-semibold text-text-main">
                              {activeTheme.name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
                            <span>{t("profileModal.badgeState")}</span>
                            <span className="font-semibold text-text-main">
                              {equippedBadge?.name || t("profileModal.inactive")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
                            <span>{t("profileModal.cursorEffect")}</span>
                            <span className="font-semibold text-text-main">
                              {equippedCursor?.name || t("profileModal.default")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-surface/80 bg-black/20 p-4 backdrop-blur-md sm:rounded-[26px] sm:p-5">
                        <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                          {t("profileModal.archivistNotes")}
                        </p>
                        <h3 className="mt-2 text-xl font-black text-text-main">
                          {t("profileModal.howThisDossierReads")}
                        </h3>
                        <div className="mt-5 space-y-4 text-sm leading-6 text-text-muted">
                          <p>
                            {t("profileModal.dossierNote1")}
                          </p>
                          <p>
                            {t("profileModal.dossierNote2")}
                          </p>
                          <p>
                            {t("profileModal.dossierNote3")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        ) : (
          <div className="flex min-h-full items-center justify-center p-12 text-center">
            <p className="text-text-muted">{t("profileModal.noProfileData")}</p>
          </div>
        )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
