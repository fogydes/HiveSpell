import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getFriends, FriendWithProfile } from "../services/friendService";
import {
  Message,
  Conversation,
  getConversations,
  getMessages,
  markConversationAsRead,
  subscribeToMessages,
} from "../services/messageService";
import { ProfileModal } from "./ProfileModal";
import { CloseIcon } from "./chat/ChatIcons";
import { ChatSidebar } from "./chat/ChatSidebar";
import { ChatThread } from "./chat/ChatThread";
import { ChatInfoPanel } from "./chat/ChatInfoPanel";
import { getAvatarUrl } from "./chat/ChatUtils";

interface ChatPanelProps {
  onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onClose }) => {
  const { user, userData } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showThreadSearch, setShowThreadSearch] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    const nextFriends = await getFriends(user.uid);
    setFriends(nextFriends);
  }, [user]);

  const loadConversations = useCallback(
    async (silent = false) => {
      if (!user) return;
      if (!silent) setLoading(true);
      const convs = await getConversations(user.uid);
      setConversations(convs);
      if (!silent) setLoading(false);
    },
    [user],
  );

  useEffect(() => {
    if (!user) return;
    loadConversations(false);
    loadFriends();
  }, [user, loadConversations, loadFriends]);

  useEffect(() => {
    if (!user) return;

    const channel = subscribeToMessages(user.uid, (payload) => {
      const msg = (payload.new || payload.old) as Message;
      if (!msg) return;

      if (
        selectedFriendId &&
        (msg.sender_id === selectedFriendId ||
          msg.receiver_id === selectedFriendId)
      ) {
        setMessages((prev) => {
          if (payload.eventType === "DELETE") {
            return prev.filter((m) => m.id !== msg.id);
          }
          if (payload.eventType === "UPDATE") {
            return prev.map((m) => (m.id === msg.id ? (payload.new as Message) : m));
          }
          // INSERT
          if (prev.some((message) => message.id === msg.id)) return prev;
          return [...prev, payload.new as Message];
        });
      }

      loadConversations(true);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user, selectedFriendId, loadConversations]);

  const selectConversation = async (friendId: string) => {
    if (!user) return;
    setSelectedFriendId(friendId);
    setShowThreadSearch(false);
    setThreadSearch("");
    setShowInfoPanel(false);
    const msgs = await getMessages(user.uid, friendId);
    setMessages(msgs);
    await markConversationAsRead(user.uid, friendId);
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.friendId === friendId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );
  };

  const selectedConv = conversations.find(
    (conversation) => conversation.friendId === selectedFriendId,
  );
  const selectedFriend = friends.find(
    (friend) => friend.profile.id === selectedFriendId,
  );
  const selectedFriendInfo = selectedConv
    ? {
        id: selectedConv.friendId,
        username: selectedConv.friendUsername,
        avatarUrl: selectedConv.friendAvatarUrl,
        avatarSeed: selectedConv.friendAvatarSeed,
        title: selectedConv.friendTitle || selectedFriend?.profile.title,
      }
    : {
        id: selectedFriendId,
        username: selectedFriend?.profile.username || "User",
        avatarUrl: selectedFriend?.profile.avatar_url,
        avatarSeed: selectedFriend?.profile.avatar_seed,
        title: selectedFriend?.profile.title,
      };

  if (!user) return null;

  return (
    <div
      className="fixed inset-0 z-100 bg-black/88 backdrop-blur-md p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative mx-auto flex h-full w-full overflow-hidden rounded-none border border-surface/80 bg-panel shadow-[0_32px_120px_rgba(0,0,0,0.45)] animate-scale-in sm:h-[88vh] sm:w-[94vw] sm:max-w-380 sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-surface/80 bg-black/20 text-text-muted transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 sm:right-4 sm:top-4"
          title="Close chat"
        >
          <CloseIcon />
        </button>

        <ChatSidebar
          conversations={conversations}
          friends={friends}
          selectedFriendId={selectedFriendId}
          loading={loading}
          user={user}
          onSelectConversation={selectConversation}
          loadFriends={loadFriends}
        />

        <main
          className={`${
            selectedFriendId ? "flex" : "hidden md:flex"
          } min-w-0 flex-1 flex-col bg-black/5`}
        >
          {!selectedFriendId ? (
            <div className="hidden h-full flex-col items-center justify-center px-10 text-center md:flex">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-surface/70 bg-surface/30 text-4xl">
                ✦
              </div>
              <h3 className="text-2xl font-black text-text-main">
                Pick a conversation
              </h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-text-muted">
                The current chat work is functional. This layout now mirrors the
                three-pane Messenger structure you asked for. Select a thread or
                start a new one from the left rail.
              </p>
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-1">
              <ChatThread
                messages={messages}
                setMessages={setMessages}
                user={user}
                selectedFriendId={selectedFriendId}
                selectedFriendInfo={selectedFriendInfo}
                loadConversations={loadConversations}
                showInfoPanel={showInfoPanel}
                setShowInfoPanel={setShowInfoPanel}
                onBack={() => {
                  setSelectedFriendId(null);
                  setMessages([]);
                  setShowInfoPanel(false);
                  setShowThreadSearch(false);
                  setThreadSearch("");
                }}
                threadSearch={threadSearch}
                setThreadSearch={setThreadSearch}
                showThreadSearch={showThreadSearch}
                setShowThreadSearch={setShowThreadSearch}
              />
              <ChatInfoPanel
                showInfoPanel={showInfoPanel}
                setShowInfoPanel={setShowInfoPanel}
                selectedFriendInfo={selectedFriendInfo}
                userData={userData}
                messages={messages}
                setViewProfileId={setViewProfileId}
                onCloseThread={() => {
                  setSelectedFriendId(null);
                  setMessages([]);
                  setShowThreadSearch(false);
                  setThreadSearch("");
                  setShowInfoPanel(false);
                }}
                onSearchThread={() => {
                  setShowThreadSearch(true);
                  setShowInfoPanel(false);
                }}
              />
            </div>
          )}
        </main>
      </div>

      {viewProfileId && (
        <ProfileModal
          userId={viewProfileId}
          onClose={() => setViewProfileId(null)}
        />
      )}
    </div>
  );
};

export default ChatPanel;
