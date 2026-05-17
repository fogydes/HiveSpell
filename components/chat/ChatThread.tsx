import React, { useState, useRef, useEffect } from "react";
import { Message, updateMessage, deleteMessage, sendMessage, uploadAttachment } from "../../services/messageService";
import { PlusIcon, MicIcon, SendIcon, BackIcon, SearchIcon } from "./ChatIcons";
import { getAvatarUrl, formatTime, formatDayLabel, MAX_FILE_SIZE } from "./ChatUtils";
import { useToast } from "../../context/ToastContext";

interface ChatThreadProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  user: any;
  selectedFriendId: string;
  selectedFriendInfo: any;
  loadConversations: (silent?: boolean) => Promise<void>;
  showInfoPanel: boolean;
  setShowInfoPanel: React.Dispatch<React.SetStateAction<boolean>>;
  onBack: () => void;
  threadSearch: string;
  setThreadSearch: React.Dispatch<React.SetStateAction<string>>;
  showThreadSearch: boolean;
  setShowThreadSearch: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  messages,
  setMessages,
  user,
  selectedFriendId,
  selectedFriendInfo,
  loadConversations,
  showInfoPanel,
  setShowInfoPanel,
  onBack,
  threadSearch,
  setThreadSearch,
  showThreadSearch,
  setShowThreadSearch,
}) => {
  const { showToast } = useToast();
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredMessages = threadSearch
    ? messages.filter((message) => {
        const haystack =
          `${message.content || ""} ${message.attachment_name || ""}`.toLowerCase();
        return haystack.includes(threadSearch.toLowerCase());
      })
    : messages;

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
        const result = await uploadAttachment(blob, user.uid, "voice_message.webm");
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
        prev.map((message) => (message.id === editingId ? updated : message))
      );
    }
    setEditingId(null);
    setEditText("");
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="border-b border-surface/70 pl-3 pr-16 pb-3 pt-5 sm:pl-6 sm:pr-20 sm:pb-4 sm:pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={onBack}
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
                              activeMenu === message.id ? null : message.id
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
  );
};
