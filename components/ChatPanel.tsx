import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getFriends, FriendWithProfile } from "../services/friendService";
import {
  Message,
  Conversation,
  getConversations,
  getMessages,
  sendMessage,
  uploadAttachment,
  markConversationAsRead,
  subscribeToMessages,
  deleteMessage,
  updateMessage,
} from "../services/messageService";
import { ProfileModal } from "./ProfileModal";

interface ChatPanelProps {
  onClose: () => void;
}

type InfoSection = "customise" | "media" | "privacy";
type MediaTab = "media" | "files";

const iconClassName = "h-[18px] w-[18px]";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M20 20L16.65 16.65"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M12 5V19M5 12H19"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
);

const ComposeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M4 20H8L18.5 9.5C19.33 8.67 19.33 7.33 18.5 6.5C17.67 5.67 16.33 5.67 15.5 6.5L5 17V20Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M15 6L9 12L15 18"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M6 6L18 18M18 6L6 18"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M6 19C6.9 15.95 9.05 14.5 12 14.5C14.95 14.5 17.1 15.95 18 19"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M7 10.5C7 7.74 9.24 5.5 12 5.5C14.76 5.5 17 7.74 17 10.5V14L18.5 16.5H5.5L7 14V10.5Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M10 18.2C10.55 19.07 11.2 19.5 12 19.5C12.8 19.5 13.45 19.07 14 18.2"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M8 4.5H13.5L18 9V19.5H8C6.9 19.5 6 18.6 6 17.5V6.5C6 5.4 6.9 4.5 8 4.5Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M13 4.5V9H17.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <rect
      x="9"
      y="4.2"
      width="6"
      height="10"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="M6.5 11.5C6.5 14.54 8.96 17 12 17C15.04 17 17.5 14.54 17.5 11.5M12 17V20M9.5 20H14.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M20 12L5 5L8 12L5 19L20 12Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function getAvatarUrl(profile: {
  id?: string | null;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
}): string {
  if (profile.avatarUrl) return profile.avatarUrl;
  const seed = profile.avatarSeed || profile.id || "player";
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ChatPanel: React.FC<ChatPanelProps> = ({ onClose }) => {
  const { user, userData } = useAuth();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showThreadSearch, setShowThreadSearch] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [mediaTab, setMediaTab] = useState<MediaTab>("media");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<InfoSection, boolean>>(
    {
      customise: false,
      media: false,
      privacy: false,
    },
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    setLoadingFriends(true);
    const nextFriends = await getFriends(user.uid);
    setFriends(nextFriends);
    setLoadingFriends(false);
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

    const channel = subscribeToMessages(user.uid, (newMsg) => {
      if (
        selectedFriendId &&
        (newMsg.sender_id === selectedFriendId ||
          newMsg.receiver_id === selectedFriendId)
      ) {
        setMessages((prev) => {
          if (prev.some((message) => message.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }

      loadConversations(true);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user, selectedFriendId, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async () => {
    if (!user || !selectedFriendId || (!messageText.trim() && !uploading)) {
      return;
    }

    setSending(true);
    const msg = await sendMessage(user.uid, selectedFriendId, messageText.trim());
    if (msg) {
      setMessages((prev) => [...prev, msg]);
      setMessageText("");
      loadConversations(true);
    }
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !selectedFriendId || !e.target.files?.[0]) return;
    const file = e.target.files[0];

    if (file.size > MAX_FILE_SIZE) {
      showToast({
        title: "Upload too large",
        message: "Maximum file size is 5MB.",
        variant: "error",
      });
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isAllowed =
      isImage ||
      file.type === "text/plain" ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".csv");

    if (!isAllowed) {
      showToast({
        title: "Unsupported file",
        message: "Only images and text files are allowed.",
        variant: "error",
      });
      return;
    }

    setUploading(true);
    const result = await uploadAttachment(file, user.uid);
    if (result) {
      const msg = await sendMessage(user.uid, selectedFriendId, "", {
        url: result.url,
        type: isImage ? "image" : "file",
        name: result.name,
      });
      if (msg) {
        setMessages((prev) => [...prev, msg]);
        loadConversations(true);
      }
    } else {
      showToast({
        title: "Upload failed",
        message: "Failed to upload file.",
        variant: "error",
      });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        if (blob.size > MAX_FILE_SIZE) {
          showToast({
            title: "Recording too large",
            message: "Maximum file size is 5MB.",
            variant: "error",
          });
          return;
        }

        if (!user || !selectedFriendId) return;
        setUploading(true);
        const result = await uploadAttachment(
          blob,
          user.uid,
          "voice_message.webm",
        );
        if (result) {
          const msg = await sendMessage(user.uid, selectedFriendId, "", {
            url: result.url,
            type: "voice",
            name: "Voice message",
          });
          if (msg) {
            setMessages((prev) => [...prev, msg]);
            loadConversations(true);
          }
        }
        setUploading(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      showToast({
        title: "Microphone access denied",
        message: "Allow microphone access to record a voice message.",
        variant: "error",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleDelete = async (messageId: string) => {
    if (!user) return;
    const ok = await deleteMessage(messageId, user.uid);
    if (ok) {
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
      loadConversations(true);
    }
    setActiveMenu(null);
  };

  const startEdit = (message: Message) => {
    setEditingId(message.id);
    setEditText(message.content);
    setActiveMenu(null);
  };

  const handleSaveEdit = async () => {
    if (!user || !editingId || !editText.trim()) return;
    const updated = await updateMessage(editingId, user.uid, editText.trim());
    if (updated) {
      setMessages((prev) =>
        prev.map((message) => (message.id === editingId ? updated : message)),
      );
    }
    setEditingId(null);
    setEditText("");
  };

  const toggleSection = (section: InfoSection) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
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

  const filteredConversations = searchQuery
    ? conversations.filter((conversation) =>
        conversation.friendUsername
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      )
    : conversations;

  const filteredFriends = friendSearch
    ? friends.filter((friend) =>
        friend.profile.username
          .toLowerCase()
          .includes(friendSearch.toLowerCase()),
      )
    : friends;

  const filteredMessages = threadSearch
    ? messages.filter((message) => {
        const haystack =
          `${message.content || ""} ${message.attachment_name || ""}`.toLowerCase();
        return haystack.includes(threadSearch.toLowerCase());
      })
    : messages;

  const attachmentMessages = messages.filter((message) => message.attachment_url);
  const imageMessages = attachmentMessages.filter(
    (message) => message.attachment_type === "image",
  );
  const fileMessages = attachmentMessages.filter(
    (message) => message.attachment_type === "file",
  );

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

        <aside
          className={`${selectedFriendId ? "hidden md:flex" : "flex"} w-full flex-col border-r border-surface/70 bg-black/10 md:w-68 md:min-w-68`}
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
                    await loadFriends();
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
                        selectConversation(friend.profile.id);
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
                    onClick={() => selectConversation(conversation.friendId)}
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

        <main
          className={`${selectedFriendId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-black/5`}
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
            <>
              <div className="border-b border-surface/70 pl-3 pr-16 pb-3 pt-5 sm:pl-6 sm:pr-20 sm:pb-4 sm:pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedFriendId(null);
                        setMessages([]);
                        setShowInfoPanel(false);
                        setShowThreadSearch(false);
                        setThreadSearch("");
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-surface/70 bg-surface/30 text-text-main transition-colors hover:border-primary/30 hover:text-primary md:hidden"
                      title="Back to chats"
                    >
                      <BackIcon />
                    </button>
                    <button
                      onClick={() => setShowInfoPanel(true)}
                      className="flex min-w-0 items-center gap-3 text-left transition-opacity hover:opacity-85"
                      title="Open chat details"
                    >
                      <img
                        src={getAvatarUrl({
                          id: selectedFriendInfo.id,
                          avatarUrl: selectedFriendInfo.avatarUrl,
                          avatarSeed: selectedFriendInfo.avatarSeed,
                        })}
                        alt={selectedFriendInfo.username}
                        className="h-12 w-12 rounded-full border-2 border-primary/30 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-base font-black text-text-main sm:text-lg">
                          {selectedFriendInfo.username}
                        </p>
                        <p className="truncate text-[11px] uppercase tracking-[0.28em] text-primary/70">
                          {selectedFriendInfo.title || "Hive contact"}
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowThreadSearch((prev) => !prev)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                        showThreadSearch
                          ? "border-primary/40 bg-primary/12 text-primary"
                          : "border-surface/80 bg-surface/35 text-text-main hover:border-primary/30 hover:text-primary"
                      }`}
                      title="Search conversation"
                    >
                      <SearchIcon />
                    </button>
                  </div>
                </div>

                {showThreadSearch && (
                  <div className="mt-4 rounded-2xl border border-surface/70 bg-surface/35 px-4 py-3">
                    <input
                      type="text"
                      value={threadSearch}
                      onChange={(e) => setThreadSearch(e.target.value)}
                      placeholder="Search within this conversation..."
                      className="w-full bg-transparent text-sm text-text-main placeholder-text-muted/45 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="relative flex min-h-0 flex-1">
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar sm:px-6 sm:py-5">
                    {filteredMessages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-center">
                        <div>
                          <p className="text-base font-semibold text-text-main">
                            {threadSearch ? "No messages matched" : "No messages yet"}
                          </p>
                          <p className="mt-2 text-sm text-text-muted">
                            {threadSearch
                              ? "Try a different keyword."
                              : "Send the first message to start this thread."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      filteredMessages.map((message, index) => {
                        const isOwn = message.sender_id === user.uid;
                        const previousMessage = filteredMessages[index - 1];
                        const showDayLabel =
                          !previousMessage ||
                          new Date(previousMessage.created_at).toDateString() !==
                            new Date(message.created_at).toDateString();

                        return (
                          <React.Fragment key={message.id}>
                            {showDayLabel && (
                              <div className="my-6 flex items-center gap-4">
                                <div className="h-px flex-1 bg-surface/60" />
                                <span className="text-[11px] uppercase tracking-[0.28em] text-text-muted/55">
                                  {formatDayLabel(message.created_at)}
                                </span>
                                <div className="h-px flex-1 bg-surface/60" />
                              </div>
                            )}

                            <div
                              className={`group mb-3 flex items-end gap-3 ${
                                isOwn ? "justify-end" : "justify-start"
                              }`}
                            >
                              {!isOwn && (
                                <img
                                  src={getAvatarUrl({
                                    id: selectedFriendInfo.id,
                                    avatarUrl: selectedFriendInfo.avatarUrl,
                                    avatarSeed: selectedFriendInfo.avatarSeed,
                                  })}
                                  alt={selectedFriendInfo.username}
                                  className="h-8 w-8 rounded-full border border-surface object-cover"
                                />
                              )}

                              <div
                                className={`relative max-w-[86%] sm:max-w-[72%] ${
                                  isOwn ? "order-1" : ""
                                }`}
                              >
                                {isOwn && editingId !== message.id && (
                                  <div className="absolute -left-8 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button
                                      onClick={() =>
                                        setActiveMenu(
                                          activeMenu === message.id
                                            ? null
                                            : message.id,
                                        )
                                      }
                                      className="flex h-7 w-7 items-center justify-center rounded-full border border-surface/80 bg-panel text-xs text-text-muted transition-colors hover:border-primary/30 hover:text-primary"
                                    >
                                      ⋮
                                    </button>
                                      {activeMenu === message.id && (
                                      <div className="absolute right-full top-0 z-20 mr-2 min-w-27.5 overflow-hidden rounded-xl border border-surface/70 bg-panel shadow-2xl">
                                        {message.content && (
                                          <button
                                            onClick={() => startEdit(message)}
                                            className="block w-full px-3 py-2 text-left text-xs text-text-muted transition-colors hover:bg-surface/40 hover:text-text-main"
                                          >
                                            Edit
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDelete(message.id)}
                                          className="block w-full px-3 py-2 text-left text-xs text-red-300 transition-colors hover:bg-red-500/10"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div
                                  className={`rounded-[22px] border px-4 py-3 shadow-[0_10px_35px_rgba(0,0,0,0.12)] ${
                                    isOwn
                                      ? "border-primary/30 bg-primary/80 text-black rounded-br-md"
                                      : "border-surface/75 bg-surface/55 text-text-main rounded-bl-md"
                                  }`}
                                >
                                  {message.attachment_url && (
                                    <div className={message.content ? "mb-3" : ""}>
                                      {message.attachment_type === "image" ? (
                                        <img
                                          src={message.attachment_url}
                                          alt="attachment"
                                          className="max-h-56 w-full cursor-pointer rounded-2xl object-cover"
                                          onClick={() =>
                                            window.open(message.attachment_url!, "_blank")
                                          }
                                        />
                                      ) : message.attachment_type === "voice" ? (
                                        <div className="rounded-2xl border border-black/10 bg-black/10 p-2">
                                            <audio
                                            controls
                                            src={message.attachment_url}
                                            className="h-9 max-w-55"
                                            style={{ filter: isOwn ? "none" : "invert(1)" }}
                                          />
                                        </div>
                                      ) : (
                                        <a
                                          href={message.attachment_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                                            isOwn
                                              ? "border-black/10 bg-black/10 text-black"
                                              : "border-surface/80 bg-black/10 text-primary"
                                          }`}
                                        >
                                          <span>📎</span>
                                          <span className="truncate">
                                            {message.attachment_name || "File"}
                                          </span>
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  {editingId === message.id ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleSaveEdit();
                                          if (e.key === "Escape") {
                                            setEditingId(null);
                                            setEditText("");
                                          }
                                        }}
                                        autoFocus
                                        className="flex-1 rounded-xl border border-surface/70 bg-panel px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary/50"
                                      />
                                      <button
                                        onClick={handleSaveEdit}
                                        className="text-xs font-bold text-primary"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingId(null);
                                          setEditText("");
                                        }}
                                        className="text-xs text-text-muted"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    message.content && (
                                      <p
                                        className={`whitespace-pre-wrap wrap-break-word text-sm leading-6 ${
                                          isOwn ? "text-black" : "text-text-main"
                                        }`}
                                      >
                                        {message.content}
                                      </p>
                                    )
                                  )}
                                </div>

                                <div
                                  className={`mt-1 flex items-center gap-1 px-1 text-[10px] ${
                                    isOwn
                                      ? "justify-end text-primary/85"
                                      : "text-text-muted/55"
                                  }`}
                                >
                                  <span>{formatTime(message.created_at)}</span>
                                  {isOwn && <span>{message.read ? "✓✓" : "✓"}</span>}
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="border-t border-surface/70 px-3 py-3 sm:px-5 sm:py-4">
                    <div className="flex items-end gap-2 rounded-3xl border border-surface/70 bg-surface/25 px-3 py-3 sm:gap-3 sm:px-4">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-surface/80 bg-black/10 text-lg text-text-main transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
                        title="Upload image or file"
                      >
                        {uploading ? "⏳" : <PlusIcon />}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,.txt,.md,.json,.csv"
                        className="hidden"
                        onChange={handleFileUpload}
                      />

                      <button
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onMouseLeave={() => isRecording && stopRecording()}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg transition-all ${
                          isRecording
                            ? "scale-105 border-red-500/60 bg-red-500/20 text-red-200"
                            : "border-surface/80 bg-black/10 text-text-main hover:border-primary/30 hover:text-primary"
                        }`}
                        title="Hold to record"
                      >
                        <MicIcon />
                      </button>

                      <input
                        ref={inputRef}
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Aa"
                        disabled={sending || isRecording}
                        className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-text-main placeholder-text-muted/45 focus:outline-none disabled:opacity-50 sm:px-2"
                      />

                      <button
                        onClick={handleSend}
                        disabled={sending || !messageText.trim()}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-lg text-primary transition-colors hover:bg-primary/25 disabled:opacity-45"
                        title="Send message"
                      >
                        {sending ? "⏳" : <SendIcon />}
                      </button>
                    </div>
                  </div>
                </div>

                <aside
                  className={`${showInfoPanel ? "flex" : "hidden"} absolute inset-y-0 right-0 z-20 min-h-0 w-full max-w-[320px] flex-col border-l border-surface/70 bg-panel/95 backdrop-blur-xl md:relative md:w-70 md:min-w-70`}
                >
                  <div className="shrink-0 border-b border-surface/70 px-4 py-4 text-center md:px-5 md:py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-text-muted/55">
                        Chat Details
                      </p>
                      <button
                        onClick={() => setShowInfoPanel(false)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-surface/70 bg-surface/30 text-text-muted transition-colors hover:border-primary/30 hover:text-text-main"
                        title="Close details"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                    <img
                      src={getAvatarUrl({
                        id: selectedFriendInfo.id,
                        avatarUrl: selectedFriendInfo.avatarUrl,
                        avatarSeed: selectedFriendInfo.avatarSeed,
                      })}
                      alt={selectedFriendInfo.username}
                      className="mx-auto h-16 w-16 rounded-full border-4 border-primary/20 object-cover shadow-xl"
                    />
                    <h3 className="mt-3 text-[1.55rem] font-black leading-none text-text-main">
                      {selectedFriendInfo.username}
                    </h3>
                    <p className="mt-2 text-sm text-primary/70">
                      {selectedFriendInfo.title || "Hive contact"}
                    </p>
                    <div className="mt-3 inline-flex rounded-full border border-surface/80 bg-surface/35 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                      Direct chat
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        onClick={() =>
                          selectedFriendId && setViewProfileId(selectedFriendId)
                        }
                        className="rounded-2xl border border-surface/80 bg-surface/30 px-2 py-3 text-center transition-colors hover:border-primary/30"
                      >
                        <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-black/15 text-text-main">
                          <ProfileIcon />
                        </div>
                        <p className="text-[11px] font-medium text-text-main">
                          Profile
                        </p>
                      </button>
                      <button
                        onClick={() => {
                          setShowThreadSearch(true);
                          setShowInfoPanel(false);
                        }}
                        className="rounded-2xl border border-surface/80 bg-surface/30 px-2 py-3 text-center transition-colors hover:border-primary/30"
                      >
                        <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-black/15 text-text-main">
                          <SearchIcon />
                        </div>
                        <p className="text-[11px] font-medium text-text-main">
                          Search
                        </p>
                      </button>
                      <button
                        onClick={() =>
                          showToast({
                            title: "Mute not wired",
                            message:
                              "Mute controls are not implemented yet. This is still a placeholder action.",
                            variant: "info",
                          })
                        }
                        className="rounded-2xl border border-surface/80 bg-surface/30 px-2 py-3 text-center transition-colors hover:border-primary/30"
                      >
                        <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-black/15 text-text-main">
                          <BellIcon />
                        </div>
                        <p className="text-[11px] font-medium text-text-main">
                          Mute
                        </p>
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 custom-scrollbar sm:px-4">
                    <div className="space-y-2.5">
                      <div className="overflow-hidden rounded-2xl border border-surface/70 bg-surface/18">
                        <button
                          onClick={() => toggleSection("customise")}
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                          <span className="text-sm font-semibold text-text-main">
                            Customise chat
                          </span>
                          <span className="text-text-muted">
                            {openSections.customise ? "−" : "+"}
                          </span>
                        </button>
                        {openSections.customise && (
                          <div className="space-y-3 border-t border-surface/60 px-4 py-4 text-sm text-text-muted">
                            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
                              <p className="text-[11px] uppercase tracking-[0.28em] text-primary/65">
                                Active Theme
                              </p>
                              <p className="mt-2 text-sm font-semibold text-text-main">
                                {userData?.equippedTheme || "hive"}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-surface/60 bg-black/10 p-3">
                              <p className="text-[11px] uppercase tracking-[0.28em] text-text-muted/60">
                                Chat Behaviors
                              </p>
                              <ul className="mt-2 space-y-2 text-xs leading-5">
                                <li>Read receipts are enabled.</li>
                                <li>Image uploads and files are enabled.</li>
                                <li>Edit and delete are available on your messages.</li>
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-surface/70 bg-surface/18">
                        <button
                          onClick={() => toggleSection("media")}
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                          <span className="text-sm font-semibold text-text-main">
                            Media and files
                          </span>
                          <span className="text-text-muted">
                            {openSections.media ? "−" : "+"}
                          </span>
                        </button>
                        {openSections.media && (
                          <div className="space-y-3 border-t border-surface/60 px-4 py-4">
                            <div className="grid grid-cols-2 rounded-full border border-surface/70 bg-black/10 p-1">
                              <button
                                onClick={() => setMediaTab("media")}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                  mediaTab === "media"
                                    ? "bg-surface text-text-main"
                                    : "text-text-muted"
                                }`}
                              >
                                Media
                              </button>
                              <button
                                onClick={() => setMediaTab("files")}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                  mediaTab === "files"
                                    ? "bg-surface text-text-main"
                                    : "text-text-muted"
                                }`}
                              >
                                Files
                              </button>
                            </div>
                            {(mediaTab === "media" ? imageMessages : fileMessages)
                              .length === 0 ? (
                              <p className="text-sm text-text-muted">
                                No shared {mediaTab} yet.
                              </p>
                            ) : mediaTab === "media" ? (
                              <div className="grid grid-cols-2 gap-2">
                                {imageMessages
                                  .slice(-6)
                                  .reverse()
                                  .map((message) => (
                                    <button
                                      key={message.id}
                                      onClick={() =>
                                        message.attachment_url &&
                                        window.open(message.attachment_url, "_blank")
                                      }
                                      className="overflow-hidden rounded-2xl border border-surface/60 bg-black/10 text-left transition-colors hover:border-primary/30"
                                    >
                                      <img
                                        src={message.attachment_url || ""}
                                        alt="attachment preview"
                                        className="h-24 w-full object-cover"
                                      />
                                      <div className="px-2 py-2">
                                        <p className="truncate text-xs font-medium text-text-main">
                                          {message.attachment_name || "Image"}
                                        </p>
                                        <p className="text-[11px] text-text-muted">
                                          {formatTime(message.created_at)}
                                        </p>
                                      </div>
                                    </button>
                                  ))}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {fileMessages
                                  .slice(-6)
                                  .reverse()
                                  .map((message) => (
                                    <button
                                      key={message.id}
                                      onClick={() =>
                                        message.attachment_url &&
                                        window.open(message.attachment_url, "_blank")
                                      }
                                      className="flex w-full items-center gap-3 rounded-2xl border border-surface/60 bg-black/10 px-3 py-3 text-left transition-colors hover:border-primary/30"
                                    >
                                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface/45 text-lg text-text-main">
                                        <FileIcon />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-text-main">
                                          {message.attachment_name ||
                                            "File"}
                                        </p>
                                        <p className="text-xs text-text-muted">
                                          {formatTime(message.created_at)}
                                        </p>
                                      </div>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-surface/70 bg-surface/18">
                        <button
                          onClick={() => toggleSection("privacy")}
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                          <span className="text-sm font-semibold text-text-main">
                            Privacy &amp; support
                          </span>
                          <span className="text-text-muted">
                            {openSections.privacy ? "−" : "+"}
                          </span>
                        </button>
                        {openSections.privacy && (
                          <div className="space-y-3 border-t border-surface/60 px-4 py-4">
                            <button
                              onClick={() => {
                                setSelectedFriendId(null);
                                setMessages([]);
                                setShowThreadSearch(false);
                                setThreadSearch("");
                                setShowInfoPanel(false);
                              }}
                              className="flex w-full items-center justify-between rounded-2xl border border-surface/60 bg-black/10 px-3 py-3 text-sm text-text-main transition-colors hover:border-primary/30"
                            >
                              <span>Close current thread</span>
                              <span>›</span>
                            </button>
                            <button
                              onClick={() =>
                                showToast({
                                  title: "Report flow not wired",
                                  message:
                                    "Report and block actions need backend support before they can be added safely.",
                                  variant: "info",
                                })
                              }
                              className="flex w-full items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/5 px-3 py-3 text-sm text-red-300 transition-colors hover:bg-red-500/10"
                            >
                              <span>Report or block</span>
                              <span>›</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </>
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
