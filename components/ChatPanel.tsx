import React, { useState, useEffect, useRef } from "react";
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
} from "../services/messageService";

interface ChatPanelProps {
  onClose: () => void;
}

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
  if (isToday)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ChatPanel: React.FC<ChatPanelProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    loadConversations();

    const channel = subscribeToMessages(user.uid, (newMsg) => {
      // If we're in the conversation, add to messages
      if (
        selectedFriendId &&
        (newMsg.sender_id === selectedFriendId ||
          newMsg.receiver_id === selectedFriendId)
      ) {
        setMessages((prev) => [...prev, newMsg]);
      }
      // Refresh conversations
      loadConversations();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user, selectedFriendId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);
    const convs = await getConversations(user.uid);
    setConversations(convs);
    setLoading(false);
  };

  const selectConversation = async (friendId: string) => {
    if (!user) return;
    setSelectedFriendId(friendId);
    const msgs = await getMessages(user.uid, friendId);
    setMessages(msgs);
    await markConversationAsRead(user.uid, friendId);
    // Update unread count in conversations
    setConversations((prev) =>
      prev.map((c) => (c.friendId === friendId ? { ...c, unreadCount: 0 } : c)),
    );
  };

  const handleSend = async () => {
    if (!user || !selectedFriendId || (!messageText.trim() && !uploading))
      return;
    setSending(true);
    const msg = await sendMessage(user.uid, selectedFriendId, messageText);
    if (msg) {
      setMessages((prev) => [...prev, msg]);
      setMessageText("");
      loadConversations();
    }
    setSending(false);
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
        loadConversations();
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
        stream.getTracks().forEach((t) => t.stop());
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
            loadConversations();
          }
        }
        setUploading(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
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

  const getAvatarUrl = (conv: Conversation) =>
    conv.friendAvatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.friendAvatarSeed || conv.friendId}`;

  const selectedConv = conversations.find(
    (c) => c.friendId === selectedFriendId,
  );

  // For new conversations (friend picked but no messages yet), fall back to friends data
  const selectedFriendInfo = selectedConv
    ? {
        username: selectedConv.friendUsername,
        avatarUrl: selectedConv.friendAvatarUrl,
        avatarSeed: selectedConv.friendAvatarSeed,
      }
    : (() => {
        const f = friends.find((fr) => fr.profile.id === selectedFriendId);
        return f
          ? {
              username: f.profile.username,
              avatarUrl: f.profile.avatar_url,
              avatarSeed: f.profile.avatar_seed,
            }
          : { username: "User", avatarUrl: undefined, avatarSeed: selectedFriendId || undefined };
      })();

  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
        c.friendUsername.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : conversations;

  if (!user) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-panel border border-surface rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex"
        style={{ width: "75vw", height: "75vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT SIDEBAR — Conversations */}
        <div className="w-[300px] min-w-[280px] border-r border-surface flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-surface flex items-center justify-between">
            <h2 className="text-base font-bold text-text-main">Messages</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (showNewChat) {
                    setShowNewChat(false);
                    return;
                  }
                  setShowNewChat(true);
                  setLoadingFriends(true);
                  const f = await getFriends(user!.uid);
                  setFriends(f);
                  setLoadingFriends(false);
                }}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-sm ${
                  showNewChat
                    ? "bg-primary/20 border border-primary/40 text-primary"
                    : "bg-surface/50 border border-surface hover:border-primary/30 text-text-muted hover:text-text-main"
                }`}
                title="New conversation"
              >
                ✏️
              </button>
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-main text-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-surface/50">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-surface/40 border border-surface/60 rounded-lg px-3 py-2 text-sm text-text-main placeholder-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Friend Picker (New Chat) */}
          {showNewChat && (
            <div className="border-b border-surface/50">
              <div className="px-3 py-2">
                <input
                  type="text"
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder="Search friends..."
                  className="w-full bg-surface/40 border border-surface/60 rounded-lg px-3 py-2 text-sm text-text-main placeholder-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                  autoFocus
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                {loadingFriends ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin text-xl">🐝</div>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-text-muted text-xs">No friends yet. Add friends first!</p>
                  </div>
                ) : (
                  friends
                    .filter((f) =>
                      friendSearch
                        ? f.profile.username.toLowerCase().includes(friendSearch.toLowerCase())
                        : true
                    )
                    .map((f) => (
                      <button
                        key={f.profile.id}
                        onClick={() => {
                          selectConversation(f.profile.id);
                          setShowNewChat(false);
                          setFriendSearch("");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface/30 transition-colors border-b border-surface/20"
                      >
                        <img
                          src={
                            f.profile.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.profile.avatar_seed || f.profile.id}`
                          }
                          alt={f.profile.username}
                          className="w-8 h-8 rounded-full object-cover border border-surface"
                        />
                        <div>
                          <p className="text-sm font-semibold text-text-main">{f.profile.username}</p>
                          {f.profile.title && (
                            <p className="text-[10px] text-primary/60">{f.profile.title}</p>
                          )}
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>
          )}

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin text-2xl">🐝</div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-text-muted text-sm">
                  {searchQuery
                    ? "No conversations found"
                    : "No conversations yet."}
                </p>
                {!searchQuery && (
                  <button
                    onClick={async () => {
                      setShowNewChat(true);
                      setLoadingFriends(true);
                      const f = await getFriends(user!.uid);
                      setFriends(f);
                      setLoadingFriends(false);
                    }}
                    className="mt-3 px-4 py-2 bg-primary/20 border border-primary/30 rounded-lg text-sm text-primary hover:bg-primary/30 transition-colors"
                  >
                    ✏️ Start a conversation
                  </button>
                )}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.friendId}
                  onClick={() => selectConversation(conv.friendId)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface/30 transition-colors border-b border-surface/30 ${
                    selectedFriendId === conv.friendId
                      ? "bg-primary/10 border-l-2 border-l-primary"
                      : ""
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={getAvatarUrl(conv)}
                      alt={conv.friendUsername}
                      className="w-10 h-10 rounded-full object-cover border border-surface"
                    />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-text-main truncate">
                        {conv.friendUsername}
                      </p>
                      <span className="text-[10px] text-text-muted/60 flex-shrink-0 ml-2">
                        {timeAgo(conv.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted truncate mt-0.5">
                      {conv.lastSenderId === user.uid ? "You: " : ""}
                      {conv.lastMessage}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT AREA — Chat */}
        <div className="flex-1 flex flex-col">
          {!selectedFriendId ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <span className="text-5xl mb-4 opacity-40">💬</span>
              <h3 className="text-lg font-bold text-text-main mb-2">
                Start a conversation
              </h3>
              <p className="text-sm text-text-muted max-w-xs mb-4">
                Pick a friend from the ✏️ button to start chatting.
              </p>
              <button
                onClick={async () => {
                  setShowNewChat(true);
                  setLoadingFriends(true);
                  const f = await getFriends(user!.uid);
                  setFriends(f);
                  setLoadingFriends(false);
                }}
                className="px-5 py-2.5 bg-primary/20 border border-primary/30 rounded-xl text-sm text-primary hover:bg-primary/30 transition-colors font-medium"
              >
                ✏️ New Conversation
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-5 py-3 border-b border-surface flex items-center gap-3">
                <img
                  src={
                    selectedFriendInfo.avatarUrl ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedFriendInfo.avatarSeed || selectedFriendId}`
                  }
                  alt={selectedFriendInfo.username}
                  className="w-9 h-9 rounded-full object-cover border-2 border-primary/30"
                />
                <div>
                  <p className="text-sm font-bold text-text-main">
                    {selectedFriendInfo.username}
                  </p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <p className="text-text-muted text-sm">
                      No messages yet. Say hello! 👋
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === user.uid;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            isOwn
                              ? "bg-primary/20 border border-primary/30 rounded-br-md"
                              : "bg-surface/60 border border-surface rounded-bl-md"
                          }`}
                        >
                          {/* Attachment */}
                          {msg.attachment_url && (
                            <div className="mb-2">
                              {msg.attachment_type === "image" ? (
                                <img
                                  src={msg.attachment_url}
                                  alt="attachment"
                                  className="max-w-full max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() =>
                                    window.open(msg.attachment_url!, "_blank")
                                  }
                                />
                              ) : msg.attachment_type === "voice" ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">🎤</span>
                                  <audio
                                    controls
                                    src={msg.attachment_url}
                                    className="h-8 max-w-[200px]"
                                    style={{ filter: "invert(1)" }}
                                  />
                                </div>
                              ) : (
                                <a
                                  href={msg.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-primary hover:underline text-sm"
                                >
                                  <span>📎</span>
                                  <span className="truncate">
                                    {msg.attachment_name || "File"}
                                  </span>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Text content */}
                          {msg.content && (
                            <p className="text-sm text-text-main whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          )}

                          <p
                            className={`text-[9px] mt-1 ${
                              isOwn
                                ? "text-primary/50 text-right"
                                : "text-text-muted/50"
                            }`}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="px-4 py-3 border-t border-surface flex items-center gap-2">
                {/* Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface/50 border border-surface hover:border-primary/30 hover:bg-surface transition-colors text-lg disabled:opacity-50"
                  title="Upload file (5MB max)"
                >
                  {uploading ? (
                    <span className="animate-spin text-sm">⏳</span>
                  ) : (
                    "📎"
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,.txt,.md,.json,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* Text Input */}
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  disabled={sending || isRecording}
                  className="flex-1 bg-surface/40 border border-surface/60 rounded-xl px-4 py-2.5 text-sm text-text-main placeholder-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                />

                {/* Send / Voice */}
                {messageText.trim() ? (
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/20 border border-primary/30 hover:bg-primary/30 transition-colors text-lg disabled:opacity-50"
                    title="Send"
                  >
                    {sending ? "⏳" : "➤"}
                  </button>
                ) : (
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={() => isRecording && stopRecording()}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all text-lg ${
                      isRecording
                        ? "bg-red-500/30 border border-red-500/50 animate-pulse scale-110"
                        : "bg-surface/50 border border-surface hover:border-accent/30 hover:bg-surface"
                    }`}
                    title="Hold to record voice message"
                  >
                    🎤
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
