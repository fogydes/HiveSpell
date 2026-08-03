import React, { useState, useCallback } from "react";
import { useFriendInvites, FriendWithPresence, OnlineFriend, getPresenceDisplay, formatLastSeen } from "@/hooks/useFriendInvites";
import { PresenceIndicator, PresenceBadge, PresenceDot } from "@/components/PresenceIndicator";

interface FriendListProps {
  filter?: "all" | "online" | "in_game";
  onInvite?: (friendId: string) => void;
  onSpectate?: (friendId: string, roomId: string) => void;
  onJoin?: (friendId: string, roomId: string) => void;
  showActions?: boolean;
  className?: string;
}

export const FriendList: React.FC<FriendListProps> = ({
  filter = "all",
  onInvite,
  onSpectate,
  onJoin,
  showActions = true,
  className = "",
}) => {
  const { friends, onlineFriends, loading, error, refresh } = useFriendInvites();
  const [activeTab, setActiveTab] = useState<"all" | "online">("all");

  // Determine which friend list to show
  const friendList = activeTab === "online" ? onlineFriends : friends;

  // Apply filter - onlineFriends never contains offline users
  const filteredFriends = friendList.filter((friend) => {
    // When showing "online" tab, all friends are already online (presence_status is never "offline")
    // When showing "all" tab, friends can be offline
    const isOnline = activeTab === "online" || friend.presence_status !== "offline";

    if (filter === "online" && !isOnline) return false;
    if (filter === "in_game" && friend.presence_status !== "in_game") return false;
    return true;
  });

  const handleAction = useCallback(
    (action: "invite" | "spectate" | "join", friend: FriendWithPresence | OnlineFriend) => {
      if (action === "invite" && onInvite) {
        onInvite(friend.id);
      } else if (action === "spectate" && onSpectate && friend.current_room_id) {
        onSpectate(friend.id, friend.current_room_id);
      } else if (action === "join" && onJoin && friend.current_room_id) {
        onJoin(friend.id, friend.current_room_id);
      }
    },
    [onInvite, onSpectate, onJoin]
  );

  const getActivityText = (friend: FriendWithPresence | OnlineFriend): string => {
    if (friend.current_activity) return friend.current_activity;
    switch (friend.presence_status) {
      case "in_game":
        return "Playing a match";
      case "in_lobby":
        return "In lobby";
      case "spectating":
        return "Spectating";
      case "online":
        return "Available";
      default:
        return "Offline";
    }
  };

  const canInteract = (friend: FriendWithPresence | OnlineFriend): boolean => {
    return friend.presence_status !== "offline" && friend.presence_status !== "in_game";
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-red-500 mb-2">⚠️ {error}</div>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (filteredFriends.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-slate-500 mb-2">
          {activeTab === "online"
            ? "No friends online right now"
            : "No friends yet. Invite someone to play!"}
        </div>
        {activeTab !== "online" && (
          <button
            onClick={() => {
              // This would open invite modal
              window.dispatchEvent(new CustomEvent("hivespell:open-invite-modal"));
            }}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Invite Friends
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Tab Switcher */}
      <div className="flex gap-1 mb-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <button
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            activeTab === "all"
              ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
          onClick={() => setActiveTab("all")}
        >
          All Friends ({friends.length})
        </button>
        <button
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            activeTab === "online"
              ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
          onClick={() => setActiveTab("online")}
        >
          Online ({onlineFriends.length})
        </button>
      </div>

      {/* Friend List */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {filteredFriends.map((friend) => {
          const display = getPresenceDisplay(friend.presence_status);
          // When in "online" tab, onlineFriends never contains offline users
          // When in "all" tab, friends can be offline
          const isOnline = activeTab === "online" || friend.presence_status !== "offline";

          return (
            <div
              key={friend.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                isOnline
                  ? "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                  : "bg-slate-50/50 dark:bg-slate-800/30 opacity-70"
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {friend.avatar_url ? (
                  <img
                    src={friend.avatar_url}
                    alt={friend.username}
                    className="w-10 h-10 rounded-full object-cover border-2"
                    style={{ borderColor: display.color.replace("text-", "border-") }}
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold"
                    style={{
                      backgroundColor: display.color.replace("text-", "bg-") + "/20",
                      color: display.color.replace("text-", ""),
                    }}
                  >
                    {friend.username.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Presence Dot */}
                <PresenceDot
                  status={friend.presence_status}
                  size={12}
                  className="absolute -bottom-1 -right-1 border-2 border-[var(--bg-primary)]"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 dark:text-white truncate">
                    {friend.username}
                  </span>
                  {"tier" in friend && friend.tier && (
                    <span
                      className="px-2 py-0.5 text-xs font-semibold rounded-full"
                      style={{
                        backgroundColor: `var(--tier-${friend.tier.toLowerCase()}-bg)`,
                        color: `var(--tier-${friend.tier.toLowerCase()}-text)`,
                      }}
                    >
                      {friend.tier}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <PresenceIndicator
                    status={friend.presence_status}
                    size="sm"
                    showLabel
                  />
                  {friend.current_room_id && (
                    <span className="text-xs text-slate-500 font-mono">
                      Room: {friend.current_room_id.slice(0, 8)}...
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {showActions && isOnline && canInteract(friend) && (
                <div className="flex items-center gap-1">
                  {friend.presence_status === "in_lobby" && onJoin && (
                    <button
                      onClick={() => handleAction("join", friend)}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      title="Join Lobby"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 15v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 12a9 9 0 1018 0 9 9 0 00-18 0z" />
                      </svg>
                    </button>
                  )}
                  {friend.presence_status === "in_game" && onSpectate && (
                    <button
                      onClick={() => handleAction("spectate", friend)}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      title="Spectate"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}
                  {onInvite && (
                    <button
                      onClick={() => handleAction("invite", friend)}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      title="Invite to Game"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {(showActions && !isOnline) || friend.presence_status === "offline" ? (
                <span className="text-xs text-slate-400">
                  {formatLastSeen(friend.last_seen)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Compact version for sidebar/widget
export const CompactFriendList: React.FC<{
  friends: (FriendWithPresence | OnlineFriend)[];
  maxVisible?: number;
  onFriendClick?: (friend: FriendWithPresence | OnlineFriend) => void;
}> = ({ friends, maxVisible = 5, onFriendClick }) => {
  const visibleFriends = friends.slice(0, maxVisible);
  const remaining = friends.length - maxVisible;

  return (
    <div className="space-y-1.5">
      {visibleFriends.map((friend) => (
        <button
          key={friend.id}
          onClick={() => onFriendClick?.(friend)}
          className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
            friend.presence_status !== "offline"
              ? "hover:bg-slate-100 dark:hover:bg-slate-800"
              : "opacity-50"
          }`}
        >
          <div className="relative flex-shrink-0">
            {friend.avatar_url ? (
              <img
                src={friend.avatar_url}
                alt={friend.username}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-700">
                {friend.username.charAt(0).toUpperCase()}
              </div>
            )}
            <PresenceDot
              status={friend.presence_status}
              size={10}
              className="absolute -bottom-0.5 -right-0.5 border-2 border-[var(--bg-primary)]"
            />
          </div>
          <div className="flex-1 min-w-0 text-sm">
            <span className="font-medium text-slate-900 dark:text-white truncate block">
              {friend.username}
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <PresenceDot status={friend.presence_status} size={6} />
              <span>{getPresenceDisplay(friend.presence_status).label}</span>
            </div>
          </div>
        </button>
      ))}
      {remaining > 0 && (
        <button className="w-full text-center text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-2">
          +{remaining} more friends
        </button>
      )}
    </div>
  );
};