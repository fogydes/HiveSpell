import React, { useState } from "react";
import { Conversation } from "../../services/messageService";
import { FriendWithProfile } from "../../services/friendService";
import { ComposeIcon } from "./ChatIcons";
import { getAvatarUrl, timeAgo } from "./ChatUtils";

interface ChatSidebarProps {
  conversations: Conversation[];
  friends: FriendWithProfile[];
  selectedFriendId: string | null;
  loading: boolean;
  user: any;
  onSelectConversation: (friendId: string) => void;
  loadFriends: () => Promise<void>;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  friends,
  selectedFriendId,
  loading,
  user,
  onSelectConversation,
  loadFriends,
}) => {
  const [showNewChat, setShowNewChat] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(false);

  const filteredConversations = searchQuery
    ? conversations.filter((conversation) =>
        conversation.friendUsername
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : conversations;

  const filteredFriends = friendSearch
    ? friends.filter((friend) =>
        friend.profile.username
          .toLowerCase()
          .includes(friendSearch.toLowerCase())
      )
    : friends;

  return (
    <aside
      className={`${
        selectedFriendId ? "hidden md:flex" : "flex"
      } w-full flex-col border-r border-surface/70 bg-black/10 md:w-68 md:min-w-68`}
    >
      <div className="border-b border-surface/70 px-4 pb-4 pt-6 md:px-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-text-muted/55">
              Direct Messages
            </p>
            <h2 className="mt-1 text-[2.1rem] font-black leading-none text-text-main">
              Chats
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (showNewChat) {
                  setShowNewChat(false);
                  setFriendSearch("");
                  return;
                }
                setShowNewChat(true);
                setLoadingFriends(true);
                await loadFriends();
                setLoadingFriends(false);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                showNewChat
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-surface/80 bg-surface/40 text-text-main hover:border-primary/40 hover:text-primary"
              }`}
              title="Start new chat"
            >
              <ComposeIcon />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-surface/70 bg-surface/40 px-4 py-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Messenger-style inbox..."
            className="w-full bg-transparent text-sm text-text-main placeholder-text-muted/45 focus:outline-none"
          />
        </div>
      </div>

      {showNewChat && (
        <div className="border-b border-surface/70 bg-primary/5 px-4 py-4">
          <div className="mb-3">
            <p className="text-sm font-bold text-text-main">New chat</p>
            <p className="text-xs text-text-muted">
              Pick a friend to open a thread.
            </p>
          </div>

          <div className="mb-3 rounded-2xl border border-surface/70 bg-surface/40 px-4 py-3">
            <input
              type="text"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              placeholder="Search friends..."
              className="w-full bg-transparent text-sm text-text-main placeholder-text-muted/45 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="max-h-56 space-y-1 overflow-y-auto custom-scrollbar pr-1">
            {loadingFriends ? (
              <div className="py-8 text-center text-text-muted">
                Loading friends...
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted">
                No matching friends.
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <button
                  key={friend.profile.id}
                  onClick={() => {
                    onSelectConversation(friend.profile.id);
                    setShowNewChat(false);
                    setFriendSearch("");
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-colors hover:border-primary/20 hover:bg-surface/35"
                >
                  <img
                    src={getAvatarUrl({
                      id: friend.profile.id,
                      avatarUrl: friend.profile.avatar_url,
                      avatarSeed: friend.profile.avatar_seed,
                    })}
                    alt={friend.profile.username}
                    className="h-10 w-10 rounded-full border border-surface object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-main">
                      {friend.profile.username}
                    </p>
                    <p className="truncate text-[11px] uppercase tracking-[0.28em] text-primary/65">
                      {friend.profile.title || "Newbee"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        {loading ? (
          <div className="py-12 text-center text-text-muted">
            Loading inbox...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-5 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-surface/70 bg-surface/35 text-text-main">
              <ComposeIcon />
            </div>
            <p className="text-base font-semibold text-text-main">
              No conversations yet
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Start a new thread from your friends list.
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const isActive = selectedFriendId === conversation.friendId;
            return (
              <button
                key={conversation.friendId}
                onClick={() => onSelectConversation(conversation.friendId)}
                className={`mb-1 flex w-full items-center gap-3 rounded-[22px] border px-3 py-3 text-left transition-all ${
                  isActive
                    ? "border-primary/30 bg-primary/12 shadow-[0_10px_35px_rgba(0,0,0,0.18)]"
                    : "border-transparent hover:border-surface/80 hover:bg-surface/30"
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={getAvatarUrl({
                      id: conversation.friendId,
                      avatarUrl: conversation.friendAvatarUrl,
                      avatarSeed: conversation.friendAvatarSeed,
                    })}
                    alt={conversation.friendUsername}
                    className="h-12 w-12 rounded-full border border-surface object-cover"
                  />
                  {conversation.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-black">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-text-main">
                      {conversation.friendUsername}
                    </p>
                    <span className="text-[11px] text-text-muted/55">
                      {timeAgo(conversation.lastMessageTime)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-text-muted">
                    {conversation.lastSenderId === user.uid ? "You: " : ""}
                    {conversation.lastMessage}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
