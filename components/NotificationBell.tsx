import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import { useTranslation } from "react-i18next";
import {
  Notification,
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  deleteNotification,
  subscribeToNotifications,
} from "../services/notificationService";
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendshipStatus,
} from "../services/friendService";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const NotificationBell: React.FC = () => {
  const { user, userData } = useAuth();
  const { performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const { t } = useTranslation();
  const disableAnimations = performanceTier === "static" || reduceMotion;
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications + unread count
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [notifs, count] = await Promise.all([
        getNotifications(user.uid),
        getUnreadCount(user.uid),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    };

    load();

    // Subscribe to realtime
    const channel = subscribeToNotifications(
      user.uid,
      (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      },
      (updatedNotif) => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n)),
        );
      },
    );

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleOpen = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0 && user) {
      await markAllAsRead(user.uid);
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleAcceptFriend = async (notif: Notification) => {
    if (!userData) return;
    setRespondingTo(notif.id);

    // Find the friendship by checking the requester
    const fromUserId = notif.data?.from_user_id;
    if (!fromUserId || !user) {
      setRespondingTo(null);
      return;
    }

    const friendship = await getFriendshipStatus(user.uid, fromUserId);
    if (!friendship) {
      setRespondingTo(null);
      return;
    }

    const result = await acceptFriendRequest(
      friendship.id,
      userData.username || "Someone",
    );
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    }
    setRespondingTo(null);
  };

  const handleDeclineFriend = async (notif: Notification) => {
    setRespondingTo(notif.id);
    const fromUserId = notif.data?.from_user_id;
    if (!fromUserId || !user) {
      setRespondingTo(null);
      return;
    }

    const friendship = await getFriendshipStatus(user.uid, fromUserId);
    if (!friendship) {
      setRespondingTo(null);
      return;
    }

    const result = await declineFriendRequest(friendship.id);
    if (result.success) {
      await deleteNotification(notif.id);
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    }
    setRespondingTo(null);
  };

  // Collapse notifications that represent the same logical event (B9). The backend
  // can emit several rows for one event (e.g. three "X accepted your friend
  // request!" entries), so friend events are keyed by type + sender and only the
  // most recent is kept. Notifications without a sender (e.g. system messages) are
  // keyed by id so distinct ones are never merged. `notifications` is newest-first,
  // so the first occurrence of each key is the one we keep.
  const dedupedNotifications = useMemo(() => {
    const seen = new Set<string>();
    return notifications.filter((n) => {
      const key = n.data?.from_user_id
        ? `${n.type}:${n.data.from_user_id}`
        : n.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [notifications]);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "friend_request":
        return "👋";
      case "friend_accepted":
        return "🤝";
      case "system":
        return "🐝";
      default:
        return "🔔";
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative w-10 h-10 flex items-center justify-center rounded-full bg-panel/60 border border-surface hover:border-primary/50 transition-all hover:scale-105"
        title={t("common.settings")}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={unreadCount > 0 ? `${unreadCount} ${t("nav.notifications")}` : t("nav.notifications")}
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1"
            style={{ animation: disableAnimations ? "none" : "popIn 0.2s ease-out" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 max-h-96 bg-panel border border-surface rounded-xl shadow-2xl overflow-hidden z-[9999]"
          role="menu"
          style={{ animation: disableAnimations ? "none" : "fadeIn 0.15s ease-out" }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-surface flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">
              {t("nav.notifications")}
            </h3>
            {dedupedNotifications.length > 0 && (
              <span className="text-[10px] text-text-muted">
                {dedupedNotifications.length} {t("common.total")}
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-80 custom-scrollbar">
            {dedupedNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <span className="text-3xl opacity-50 block mb-2">🐝</span>
                <p className="text-text-muted text-sm">{t("notifications.noNotifications")}</p>
              </div>
            ) : (
              dedupedNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 border-b border-surface/50 hover:bg-surface/30 transition-colors ${
                    !notif.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">
                      {getNotifIcon(notif.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-main">
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          {notif.message}
                        </p>
                      )}
                      <p className="text-[10px] text-text-muted/60 mt-1">
                        {timeAgo(notif.created_at)}
                      </p>

                      {/* Friend request actions */}
                      {notif.type === "friend_request" && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleAcceptFriend(notif)}
                            disabled={respondingTo === notif.id}
                            className="px-3 py-1 text-xs font-bold bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50"
                          >
                            {respondingTo === notif.id ? "..." : "Accept"}
                          </button>
                          <button
                            onClick={() => handleDeclineFriend(notif)}
                            disabled={respondingTo === notif.id}
                            className="px-3 py-1 text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
