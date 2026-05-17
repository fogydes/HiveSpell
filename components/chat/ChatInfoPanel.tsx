import React, { useState } from "react";
import { Message } from "../../services/messageService";
import { ProfileIcon, SearchIcon, BellIcon, FileIcon } from "./ChatIcons";
import { getAvatarUrl, formatTime, InfoSection, MediaTab } from "./ChatUtils";
import { useToast } from "../../context/ToastContext";

interface ChatInfoPanelProps {
  showInfoPanel: boolean;
  setShowInfoPanel: React.Dispatch<React.SetStateAction<boolean>>;
  selectedFriendInfo: any;
  userData: any;
  messages: Message[];
  setViewProfileId: React.Dispatch<React.SetStateAction<string | null>>;
  onCloseThread: () => void;
  onSearchThread: () => void;
}

export const ChatInfoPanel: React.FC<ChatInfoPanelProps> = ({
  showInfoPanel,
  setShowInfoPanel,
  selectedFriendInfo,
  userData,
  messages,
  setViewProfileId,
  onCloseThread,
  onSearchThread,
}) => {
  const { showToast } = useToast();
  const [openSections, setOpenSections] = useState<Record<InfoSection, boolean>>({
    customise: false,
    media: false,
    privacy: false,
  });
  const [mediaTab, setMediaTab] = useState<MediaTab>("media");

  const toggleSection = (section: InfoSection) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const attachmentMessages = messages.filter((message) => message.attachment_url);
  const imageMessages = attachmentMessages.filter(
    (message) => message.attachment_type === "image"
  );
  const fileMessages = attachmentMessages.filter(
    (message) => message.attachment_type === "file"
  );

  return (
    <aside
      className={`${
        showInfoPanel ? "flex" : "hidden"
      } absolute inset-y-0 right-0 z-20 min-h-0 w-full max-w-[320px] flex-col border-l border-surface/70 bg-panel/95 backdrop-blur-xl md:relative md:w-70 md:min-w-70`}
    >
      <div className="shrink-0 border-b border-surface/70 px-4 py-4 text-center md:px-5 md:py-4">
        <div className="mb-3 flex items-center justify-between pr-10 sm:pr-12">
          <p className="text-[11px] uppercase tracking-[0.28em] text-text-muted/55">
            Chat Details
          </p>
          <button
            onClick={() => setShowInfoPanel(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-surface/70 bg-surface/30 text-text-muted transition-colors hover:border-primary/30 hover:text-text-main"
            title="Hide details"
          >
            <span className="text-xl">›</span>
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
            onClick={() => selectedFriendInfo.id && setViewProfileId(selectedFriendInfo.id)}
            className="rounded-2xl border border-surface/80 bg-surface/30 px-2 py-3 text-center transition-colors hover:border-primary/30"
          >
            <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-black/15 text-text-main">
              <ProfileIcon />
            </div>
            <p className="text-[11px] font-medium text-text-main">Profile</p>
          </button>
          <button
            onClick={onSearchThread}
            className="rounded-2xl border border-surface/80 bg-surface/30 px-2 py-3 text-center transition-colors hover:border-primary/30"
          >
            <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-black/15 text-text-main">
              <SearchIcon />
            </div>
            <p className="text-[11px] font-medium text-text-main">Search</p>
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
            <p className="text-[11px] font-medium text-text-main">Mute</p>
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
                {(mediaTab === "media" ? imageMessages : fileMessages).length ===
                0 ? (
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
                              {message.attachment_name || "File"}
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
                  onClick={onCloseThread}
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
  );
};
