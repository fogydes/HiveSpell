import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useFriendInvites, FriendInvite, InviteResult } from "@/hooks/useFriendInvites";
import { X, Copy, Link2, Share2, AlertCircle, CheckCircle } from "lucide-react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteCreated?: (invite: InviteResult) => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  onInviteCreated,
}) => {
  const {
    createFriendInvite,
    createDirectInvite,
    pendingInvites,
    loading,
    error,
  } = useFriendInvites();
  const { t } = useTranslation("friends");

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [directInviteUserId, setDirectInviteUserId] = useState("");
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"share" | "direct">("share");

  // Handle deep link invite code from URL
  useEffect(() => {
    if (isOpen) {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("invite");
      if (code) {
        // Auto-fill if coming from invite link
        console.log("Invite code from URL:", code);
      }
    }
  }, [isOpen]);

  const handleCreateShareableInvite = async () => {
    setCreating(true);
    try {
      const result = await createFriendInvite();
      setInviteCode(result.invite_code);
      setInviteUrl(result.invite_url);
      setExpiresAt(result.expires_at);
      setCopied(false);
      onInviteCreated?.(result);
    } catch (err) {
      console.error("Failed to create invite:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateDirectInvite = async () => {
    if (!directInviteUserId.trim()) return;
    setCreating(true);
    try {
      const result = await createDirectInvite(directInviteUserId.trim());
      setInviteCode(result.invite_code);
      setInviteUrl(result.invite_url);
      setExpiresAt(result.expires_at);
      setDirectInviteUserId("");
      setCopied(false);
      onInviteCreated?.(result);
    } catch (err) {
      console.error("Failed to create direct invite:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (inviteUrl) {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (inviteUrl && navigator.share) {
      try {
        await navigator.share({
          title: t("friends.shareInviteTitle"),
          text: t("friends.shareInviteText"),
          url: inviteUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const formatExpiry = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("friends.inviteFriends")}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-4 border-b border-slate-200 dark:border-slate-700">
          <button
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
              tab === "share"
                ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            onClick={() => setTab("share")}
          >
            {t("friends.shareLink")}
          </button>
          <button
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
              tab === "direct"
                ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            onClick={() => setTab("direct")}
          >
            {t("friends.directInvite")}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Share Tab */}
          {tab === "share" && (
            <div className="space-y-4">
              {!inviteCode ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Link2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                    {t("friends.createInviteLink")}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {t("friends.createInviteLinkDesc")}
                  </p>
                  <button
                    onClick={handleCreateShareableInvite}
                    disabled={creating || loading}
                    className="w-full py-3 px-6 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creating ? t("friends.creating") : t("friends.generateInviteLink")}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{t("friends.inviteCodeLabel")}</span>
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 rounded-lg font-mono text-sm text-slate-900 dark:text-white break-all">
                      {inviteCode}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(inviteCode!)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors"
                      title={t("friends.copyCode")}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 dark:text-slate-400 w-20">{t("friends.linkLabel")}</span>
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 rounded-lg font-mono text-sm text-slate-900 dark:text-white break-all">
                      {inviteUrl}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors"
                      title={copied ? t("common.copied") : t("friends.copyLink")}
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{t("friends.expiresIn", { time: expiresAt ? formatExpiry(expiresAt) : "" })}</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleShare}
                      className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      {t("common.share")}
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex-1 py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {t("friends.copyLink")}
                    </button>
                  </div>

                  <button
                    onClick={() => setInviteCode(null)}
                    className="w-full text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {t("friends.createNewLink")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Direct Tab */}
          {tab === "direct" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("friends.friendIdLabel")}
                </label>
                <input
                  type="text"
                  value={directInviteUserId}
                  onChange={(e) => setDirectInviteUserId(e.target.value)}
                  placeholder={t("friends.friendIdPlaceholder")}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("friends.directInviteDesc")}
                </p>
              </div>

              <button
                onClick={handleCreateDirectInvite}
                disabled={creating || loading || !directInviteUserId.trim()}
                className="w-full py-3 px-6 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? t("friends.sending") : t("friends.sendDirectInvite")}
              </button>

              {inviteCode && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-800 dark:text-green-300 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{t("friends.inviteSent")}</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {t("friends.inviteSentDesc")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pending Invites Section */}
          {pendingInvites.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                {t("friends.pendingInvitesCount", { count: pendingInvites.length })}
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <Link2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {invite.inviter_username}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t("friends.expiresRelative", { time: formatExpiry(invite.expires_at) })}
                        </p>
                      </div>
                    </div>
                    <code className="px-2 py-1 bg-white dark:bg-slate-700 rounded text-xs font-mono text-slate-900 dark:text-white">
                      {invite.invite_code}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook to manage invite modal state
export function useInviteModal() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}