import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useFriendInvites, FriendWithPresence, FriendInvite, getPresenceDisplay } from "@/hooks/useFriendInvites";
import { FriendList, CompactFriendList } from "./FriendList";
import { InviteModal, useInviteModal } from "./InviteModal";
import { Plus, Users, UserPlus, Search, AlertCircle, X } from "lucide-react";
import { supabase } from "@/services/supabase";

interface FriendsPanelProps {
  variant?: "full" | "sidebar" | "modal";
  onClose?: () => void;
  onInviteToGame?: (friendId: string) => void;
  onSpectate?: (friendId: string, roomId: string) => void;
  onJoin?: (friendId: string, roomId: string) => void;
  onViewProfile?: (userId: string) => void;
  className?: string;
}

export const FriendsPanel: React.FC<FriendsPanelProps> = ({
  variant = "full",
  onClose,
  onInviteToGame,
  onSpectate,
  onJoin,
  onViewProfile,
  className = "",
}) => {
  const { friends, onlineFriends, pendingInvites, sentInvites, loading, createDirectInvite, acceptInvite, declineInvite, fetchPendingInvites } = useFriendInvites();
  const { isOpen: inviteModalOpen, open: openInviteModal, close: closeInviteModal } =
    useInviteModal();
  const { user } = useAuth();
  const userId = user?.uid;

  const totalFriends = friends.length;
  const onlineCount = onlineFriends.length;
  const pendingCount = pendingInvites.length;

  // Get avatar URL for friends (FriendWithPresence)
  const getAvatarUrl = (friend: FriendWithPresence) =>
    friend.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`;

  // Get avatar URL for pending invites (FriendInvite)
  const getInviteAvatarUrl = (invite: FriendInvite) =>
    invite.inviter_avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${invite.inviter_id}`;

  // Modal-variant state and search. These hooks MUST run unconditionally on
  // every render (Rules of Hooks) — they were previously declared inside the
  // `variant === "modal"` block, which crashed whenever the variant changed.
  const { t } = useTranslation("friends");
  const [activeTab, setActiveTab] = useState<"friends" | "pending" | "search">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string;
      username: string;
      avatar_url?: string | null;
      tier?: string;
      friendshipStatus?: string | null;
    }>
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, tier")
        .ilike("username", `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      // Check friendship status for each result
      if (data) {
        const resultsWithStatus = await Promise.all(
          data.map(async (user: any) => {
            // Check if already friends
            const { data: friendship } = await supabase
              .from("friendships")
              .select("status")
              .eq("status", "accepted")
              .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
              .maybeSingle();

            if (friendship) {
              return { ...user, friendshipStatus: "accepted" };
            }

            // Check for pending invite
            const { data: invite } = await supabase
              .from("friend_invites")
              .select("status")
              .eq("status", "pending")
              .gt("expires_at", new Date().toISOString())
              .or(`and(inviter_id.eq.${userId},invitee_id.eq.${user.id}),and(inviter_id.eq.${user.id},invitee_id.eq.${userId})`)
              .maybeSingle();

            if (invite) {
              return { ...user, friendshipStatus: "pending" };
            }

            return { ...user, friendshipStatus: null };
          })
        );
        setSearchResults(resultsWithStatus);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, userId]);

  if (variant === "sidebar") {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Header with stats */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">{t("friends.title")}</h3>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                {pendingCount}
              </span>
            )}
            <button
              onClick={openInviteModal}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t("friends.addFriend")}
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Compact friend list */}
        <CompactFriendList
          friends={friends}
          maxVisible={6}
          onFriendClick={(friend) => {
            if (friend.presence_status === "in_game" && onSpectate && friend.current_room_id) {
              onSpectate(friend.id, friend.current_room_id);
            } else if (friend.presence_status === "in_lobby" && onJoin && friend.current_room_id) {
              onJoin(friend.id, friend.current_room_id);
            } else if (onInviteToGame) {
              onInviteToGame(friend.id);
            }
          }}
        />

        <button
          onClick={openInviteModal}
          className="w-full py-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" />
          {t("friends.viewAllAndInvite")}
        </button>

        {/* Invite Modal */}
        <InviteModal isOpen={inviteModalOpen} onClose={closeInviteModal} />
      </div>
    );
  }

  if (variant === "modal") {
    return (
      <div
        className={`fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 ${onClose ? "cursor-pointer" : ""}`}
        onClick={onClose || (() => {})}
        role="dialog"
        aria-modal="true"
        aria-labelledby="friends-modal-title"
      >
        <div
          className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-surface bg-panel shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface">
            <h2 id="friends-modal-title" className="text-lg font-bold text-text-main">
              {t("friends.title")}
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-main transition-colors text-xl"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-surface">
            {[
              { key: "friends", label: t("friends.title"), count: totalFriends },
              { key: "pending", label: t("common.pending"), count: pendingCount },
              { key: "search", label: t("common.search") },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? "text-primary"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="max-h-[75vh] flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-6 text-center">
                <div className="text-4xl animate-spin">🐝</div>
                <p className="mt-2 text-text-muted">{t("common.loading")}</p>
              </div>
            ) : (
              <>
                {/* Friends Tab */}
                {activeTab === "friends" && (
                  <>
                    {totalFriends === 0 ? (
                      <div className="p-12 text-center">
                        <span className="text-4xl block mb-3 opacity-50">🐝</span>
                        <p className="text-text-muted text-sm">{t("friends.noFriends")}</p>
                      </div>
                    ) : (
                      friends.map((friend) => (
                        <div
                          key={friend.id}
                          className="flex items-center gap-3 px-4 py-3 border-b border-surface/50 hover:bg-surface/20 transition-colors"
                        >
                          <img
                            src={getAvatarUrl(friend)}
                            alt={friend.username}
                            className="w-10 h-10 rounded-full object-cover border-2 border-primary/30"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-main truncate">
                              {friend.username}
                            </p>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">
                              {friend.tier || "Bronze"}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {onViewProfile && (
                              <button
                                onClick={() => onViewProfile(friend.id)}
                                className="px-2 py-1 text-[10px] font-bold text-text-muted border border-surface rounded-lg hover:bg-surface/50 transition-colors"
                              >
                                {t("friends.viewProfile")}
                              </button>
                            )}
                            {onInviteToGame && friend.presence_status === "online" && (
                              <button
                                onClick={() => onInviteToGame(friend.id)}
                                className="px-2 py-1 text-[10px] font-bold text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors"
                              >
                                {t("common.invite")}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* Pending Tab */}
                {activeTab === "pending" && (
                  <>
                    {pendingCount === 0 ? (
                      <div className="p-12 text-center">
                        <span className="text-4xl block mb-3 opacity-50">📬</span>
                        <p className="text-text-muted text-sm">{t("friends.noRequests")}</p>
                      </div>
                    ) : (
                      pendingInvites.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center gap-3 px-4 py-3 border-b border-surface/50 hover:bg-surface/20 transition-colors"
                        >
                          <img
                            src={getInviteAvatarUrl(invite)}
                            alt={invite.inviter_username}
                            className="w-10 h-10 rounded-full object-cover border-2 border-primary/30"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-main truncate">
                              {invite.inviter_username}
                            </p>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">
                              {t("friends.wantsToBeFriends")}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                acceptInvite(invite.invite_code).then(() => fetchPendingInvites());
                              }}
                              className="px-2 py-1 text-[10px] font-bold text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors"
                            >
                              {t("friends.accept")}
                            </button>
                            <button
                              onClick={() => {
                                declineInvite(invite.invite_code).then(() => fetchPendingInvites());
                              }}
                              className="px-2 py-1 text-[10px] font-bold text-red-400 border border-red-400 rounded-lg hover:bg-red-400/10 transition-colors"
                            >
                              {t("friends.decline")}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* Search Tab */}
                {activeTab === "search" && (
                  <div className="p-4 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input
                        type="text"
                        placeholder={t("friends.searchPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="w-full pl-10 pr-4 py-3 border border-surface rounded-xl bg-panel text-text-main placeholder-text-muted focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={searchLoading || !searchQuery.trim()}
                      className="w-full py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {searchLoading ? t("common.searching") : t("common.search")}
                    </button>
                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        {searchResults.map((result) => (
                          <div
                            key={result.id}
                            className="flex items-center gap-3 px-4 py-3 border-b border-surface/50 hover:bg-surface/20 transition-colors"
                          >
                            <img
                              src={
                                result.avatar_url ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.id}`
                              }
                              alt={result.username}
                              className="w-10 h-10 rounded-full object-cover border-2 border-primary/30"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-text-main truncate">
                                {result.username}
                              </p>
                              <p className="text-[10px] text-text-muted uppercase tracking-wider">
                                {result.tier || "Bronze"}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {result.friendshipStatus === "accepted" && (
                                <span className="px-2 py-1 text-[10px] font-bold text-primary border border-primary rounded-lg">
                                  {t("friends.title")}
                                </span>
                              )}
                              {result.friendshipStatus === "pending" && (
                                <span className="px-2 py-1 text-[10px] font-bold text-amber-400 border border-amber-400 rounded-lg">
                                  {t("common.pending")}
                                </span>
                              )}
                              {!result.friendshipStatus && (
                                <button
                                  onClick={() => {
                                    // Send friend request
                                  }}
                                  className="px-2 py-1 text-[10px] font-bold text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors"
                                >
                                  {t("common.add")}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("friends.title")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("friends.statsSummary", { friends: totalFriends, online: onlineCount })}
            {pendingCount > 0 && ` • ${t("friends.pendingSummary", { count: pendingCount })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={openInviteModal}
              className="px-3 py-1.5 text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors flex items-center gap-1"
            >
              <AlertCircle className="w-4 h-4" />
              {t("friends.pendingButton", { count: pendingCount })}
            </button>
          )}
          <button
            onClick={openInviteModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            {t("friends.addFriend")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder={t("friends.searchFriends")}
          className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Friend List */}
      <FriendList
        filter="all"
        onInvite={onInviteToGame}
        onSpectate={onSpectate}
        onJoin={onJoin}
        showActions={true}
      />

      {/* Invite Modal */}
      <InviteModal isOpen={inviteModalOpen} onClose={closeInviteModal} />
    </div>
  );
}

// Export for use in other components
export { CompactFriendList } from "./FriendList";
export { InviteModal, useInviteModal } from "./InviteModal";
export { PresenceIndicator, PresenceBadge, PresenceDot } from "@/components/PresenceIndicator";
export { useFriendInvites, getPresenceDisplay, formatLastSeen } from "@/hooks/useFriendInvites";