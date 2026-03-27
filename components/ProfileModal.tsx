import React, { useState, useEffect } from "react";
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
    <div className="rounded-[24px] border border-surface/80 bg-black/20 px-4 py-4 backdrop-blur-md">
      <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
        {label}
      </p>
      <p className={`mt-3 text-3xl font-black leading-none ${accentClass}`}>
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
          "Setup Required: Add Supabase Keys to your Hosting Environment.",
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
        setError("Could not load profile.");
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
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];

      // Allowed extensions
      const allowedExtensions = ["png", "jpg", "jpeg", "webp", "gif"];
      const fileExt = file.name.split(".").pop()?.toLowerCase();

      if (!fileExt || !allowedExtensions.includes(fileExt)) {
        throw new Error(
          "Invalid file type. Please upload an image (PNG, JPG, JPEG, WEBP, or GIF).",
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
        title: "Avatar upload failed",
        message: error.message || "Error uploading avatar!",
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
  const handlePanelWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.currentTarget.scrollTop += event.deltaY;
  };
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 p-2 backdrop-blur-md animate-fade-in sm:p-4"
      onClick={onClose}
    >
      <div className="flex min-h-full items-start justify-center touch-pan-y">
        <div
          className="theme-panel-shell custom-scrollbar relative flex h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-y-auto overscroll-contain rounded-[24px] border border-surface/80 bg-app shadow-[0_32px_100px_rgba(0,0,0,0.45)] animate-scale-in sm:my-6 sm:h-[84vh] sm:rounded-[30px]"
          onClick={(e) => e.stopPropagation()}
          onWheel={handlePanelWheel}
        >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-main transition-colors text-xl z-10"
        >
          ✕
        </button>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin text-4xl mb-4">🐝</div>
            <p className="text-text-muted">Loading profile...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4 opacity-50">❌</div>
            <p className="text-red-400">{error}</p>
          </div>
        ) : profile ? (
          <>
            <div className="relative p-3 sm:p-6">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-36 opacity-90 sm:h-64"
                style={{ background: activeTheme.scene.appGradient }}
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.08)_0,transparent_18%),radial-gradient(circle_at_80%_12%,rgba(16,185,129,0.14)_0,transparent_24%),radial-gradient(circle_at_74%_78%,rgba(245,158,11,0.12)_0,transparent_22%)] sm:h-64" />

              <div className="relative overflow-hidden rounded-[28px] border border-surface/80 bg-black/20 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="relative h-24 overflow-hidden border-b border-surface/60 sm:h-48">
                  <div
                    className="absolute inset-0"
                    style={{ background: activeTheme.scene.panelGradient }}
                  />
                  <div className="absolute -left-10 top-6 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
                  <div className="absolute right-4 top-4 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-200">
                    {isOwnProfile ? "Your dossier" : "Player dossier"}
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
                            {uploading ? "Uploading" : "Change photo"}
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
                          HiveSpell profile
                        </p>
                        <h2 className="mt-2 truncate text-2xl font-black leading-none text-text-main sm:text-[2.7rem]">
                          {profile.username}
                        </h2>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-primary/25 bg-primary/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                            {profile.title || "Novice Bee"}
                          </span>
                          <span className="rounded-full border border-surface/70 bg-surface/30 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-text-muted">
                            {collectionCount} relics logged
                          </span>
                        </div>
                      </div>
                    </div>
                    {!isOwnProfile && (
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <div className="flex flex-wrap gap-2">
                          {friendshipStatus === "accepted" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                              🤝 Friends
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
                                    title: "Cancel failed",
                                    message:
                                      result.error ||
                                      "Failed to cancel friend request",
                                    variant: "error",
                                  });
                                }
                                setFriendActionLoading(false);
                              }}
                              disabled={friendActionLoading}
                              className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                            >
                              {friendActionLoading
                                ? "Cancelling..."
                                : "Cancel Request"}
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
                                      title: "Accept failed",
                                      message:
                                        result.error ||
                                        "Failed to accept friend request",
                                      variant: "error",
                                    });
                                  }
                                  setFriendActionLoading(false);
                                }}
                                disabled={friendActionLoading}
                                className="rounded-full border border-primary/30 bg-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
                              >
                                Accept
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
                                      title: "Decline failed",
                                      message:
                                        result.error ||
                                        "Failed to decline friend request",
                                      variant: "error",
                                    });
                                  }
                                  setFriendActionLoading(false);
                                }}
                                disabled={friendActionLoading}
                                className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                              >
                                Decline
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
                                    title: "Friend request failed",
                                    message:
                                      result.error || "Failed to send request",
                                    variant: "error",
                                  });
                                }
                                setFriendActionLoading(false);
                              }}
                              disabled={friendActionLoading}
                              className="rounded-full border border-primary/30 bg-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
                            >
                              {friendActionLoading ? "Sending..." : "👋 Add Friend"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)]">
                    <div className="space-y-6">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                          label="Wins"
                          value={(profile.wins ?? 0).toLocaleString()}
                          accent="primary"
                          detail="Round victories secured in live play."
                        />
                        <StatCard
                          label="Corrects"
                          value={(profile.corrects ?? 0).toLocaleString()}
                          detail="Accepted answers across tracked matches."
                        />
                        <StatCard
                          label="Current Nectar"
                          value={currentNectar.toLocaleString()}
                          accent="accent"
                          detail="Available balance for purchases and unlocks."
                        />
                        <StatCard
                          label="Corrects / Win"
                          value={correctsPerWin}
                          detail="Efficiency ratio based on persistent stats."
                        />
                      </div>

                      <div className="rounded-[26px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                              Active loadout
                            </p>
                            <h3 className="mt-2 text-xl font-black text-text-main">
                              Current customization package
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
                            label="Theme"
                            value={activeTheme.name}
                            tone="primary"
                          />
                          <LoadoutCard
                            label="Cursor"
                            value={equippedCursor?.name || "Standard pointer"}
                            tone="accent"
                          />
                          <LoadoutCard
                            label="Badge"
                            value={equippedBadge?.name || "No badge equipped"}
                            tone="primary"
                          />
                        </div>
                      </div>

                      <div className="rounded-[26px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                              Collection vault
                            </p>
                            <h3 className="mt-2 text-xl font-black text-text-main">
                              Owned relics and cosmetics
                            </h3>
                          </div>
                          <p className="text-sm text-text-muted">
                            {collectionCount} item{collectionCount === 1 ? "" : "s"} logged
                          </p>
                        </div>

                        {ownedItems.length > 0 ? (
                          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {ownedItems.slice(0, 6).map((item) => (
                              <div
                                key={item.id}
                                className="rounded-[22px] border border-surface/70 bg-panel/60 p-4"
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
                              No relics equipped yet
                            </p>
                            <p className="mt-2 text-sm leading-6 text-text-muted">
                              Purchases from the bazaar and stash unlocks will appear
                              here once they are collected.
                            </p>
                          </div>
                        )}

                        {ownedItems.length > 6 && (
                          <p className="mt-4 text-sm text-text-muted">
                            +{ownedItems.length - 6} more item
                            {ownedItems.length - 6 === 1 ? "" : "s"} in storage
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-[26px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
                        <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                          Dossier summary
                        </p>
                        <h3 className="mt-2 text-xl font-black text-text-main">
                          Progress and reserve balance
                        </h3>

                        <div className="mt-5 rounded-[24px] border border-surface/70 bg-panel/55 p-4">
                          <div className="flex items-center justify-between text-sm text-text-muted">
                            <span>Reserve ratio</span>
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
                                Current reserve
                              </p>
                              <p className="mt-2 text-2xl font-black text-primary">
                                {currentNectar.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted/55">
                                Lifetime nectar
                              </p>
                              <p className="mt-2 text-2xl font-black text-accent">
                                {lifetimeNectar.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 space-y-3 text-sm text-text-muted">
                          <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
                            <span>Theme package</span>
                            <span className="font-semibold text-text-main">
                              {activeTheme.name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
                            <span>Badge state</span>
                            <span className="font-semibold text-text-main">
                              {equippedBadge?.name || "Inactive"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-[18px] border border-surface/70 bg-panel/45 px-4 py-3">
                            <span>Cursor effect</span>
                            <span className="font-semibold text-text-main">
                              {equippedCursor?.name || "Default"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[26px] border border-surface/80 bg-black/20 p-5 backdrop-blur-md">
                        <p className="text-[10px] uppercase tracking-[0.32em] text-text-muted/55">
                          Archivist notes
                        </p>
                        <h3 className="mt-2 text-xl font-black text-text-main">
                          How this dossier reads
                        </h3>
                        <div className="mt-5 space-y-4 text-sm leading-6 text-text-muted">
                          <p>
                            This profile surfaces persistent multiplayer
                            progression, active customization choices, and the
                            current collection state pulled from the live
                            profile record.
                          </p>
                          <p>
                            Wins and correct answers reflect tracked matches,
                            while nectar separates what is currently spendable
                            from the total amount earned over time.
                          </p>
                          <p>
                            The next phase is to bring the same visual system to
                            the bazaar and relic vault so profile, shop, and
                            stash feel like one connected experience.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <p className="text-text-muted">No profile data found.</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
