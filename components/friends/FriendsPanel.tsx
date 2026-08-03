import React, { useState } from "react";
import { useFriendInvites, FriendWithPresence, OnlineFriend } from "@/hooks/useFriendInvites";
import { FriendList, CompactFriendList } from "./FriendList";
import { InviteModal, useInviteModal } from "./InviteModal";
import { Plus, Users, UserPlus, Search, AlertCircle } from "lucide-react";

interface FriendsPanelProps {
  variant?: "full" | "sidebar" | "modal";
  onInviteToGame?: (friendId: string) => void;
  onSpectate?: (friendId: string, roomId: string) => void;
  onJoin?: (friendId: string, roomId: string) => void;
  className?: string;
}

export const FriendsPanel: React.FC<FriendsPanelProps> = ({
  variant = "full",
  onInviteToGame,
  onSpectate,
  onJoin,
  className = "",
}) => {
  const { friends, onlineFriends, pendingInvites, sentInvites, loading } = useFriendInvites();
  const { isOpen: inviteModalOpen, open: openInviteModal, close: closeInviteModal } =
    useInviteModal();

  const totalFriends = friends.length;
  const onlineCount = onlineFriends.length;
  const pendingCount = pendingInvites.length;

  if (variant === "sidebar") {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Header with stats */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">Friends</h3>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                {pendingCount}
              </span>
            )}
            <button
              onClick={openInviteModal}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Add Friend"
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
          View All & Invite
        </button>

        {/* Invite Modal */}
        <InviteModal isOpen={inviteModalOpen} onClose={closeInviteModal} />
      </div>
    );
  }

  // Full variant
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Friends</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {totalFriends} friends • {onlineCount} online
            {pendingCount > 0 && ` • ${pendingCount} pending`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={openInviteModal}
              className="px-3 py-1.5 text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors flex items-center gap-1"
            >
              <AlertCircle className="w-4 h-4" />
              {pendingCount} Pending
            </button>
          )}
          <button
            onClick={openInviteModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Add Friend
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search friends..."
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