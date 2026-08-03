import { useCallback, useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/services/supabase";

export interface FriendInvite {
  id: string;
  invite_code: string;
  inviter_id: string;
  inviter_username: string;
  inviter_avatar_url: string | null;
  created_at: string;
  expires_at: string;
}

export interface SentInvite {
  id: string;
  invite_code: string;
  invitee_id: string | null;
  invitee_username: string | null;
  status: "pending" | "accepted" | "declined" | "expired";
  created_at: string;
  expires_at: string;
}

export interface FriendWithPresence {
  id: string;
  username: string;
  avatar_url: string | null;
  tier: string;
  presence_status: "offline" | "online" | "in_lobby" | "in_game" | "spectating";
  current_room_id: string | null;
  current_activity: string | null;
  last_seen: string;
  is_online: boolean;
}

export interface OnlineFriend {
  id: string;
  username: string;
  avatar_url: string | null;
  presence_status: "online" | "in_lobby" | "in_game" | "spectating";
  current_room_id: string | null;
  current_activity: string | null;
  last_seen: string;
}

export interface InviteResult {
  invite_code: string;
  invite_url: string;
  expires_at: string;
}

/**
 * Hook for managing friend invites and presence
 */
export function useFriendInvites() {
  const { user } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<FriendInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);
  const [friends, setFriends] = useState<FriendWithPresence[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<OnlineFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.uid;

  // Fetch pending invites
  const fetchPendingInvites = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.rpc("get_pending_invites", { p_user_id: userId });
      if (error) throw error;
      setPendingInvites(data || []);
    } catch (err) {
      console.error("Failed to fetch pending invites:", err);
      setError("Failed to load invites");
    }
  }, [userId]);

  // Fetch sent invites
  const fetchSentInvites = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.rpc("get_sent_invites", { p_user_id: userId });
      if (error) throw error;
      setSentInvites(data || []);
    } catch (err) {
      console.error("Failed to fetch sent invites:", err);
    }
  }, [userId]);

  // Fetch friends with presence
  const fetchFriends = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.rpc("get_friends_with_presence", { p_user_id: userId });
      if (error) throw error;
      setFriends(data || []);
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    }
  }, [userId]);

  // Fetch online friends
  const fetchOnlineFriends = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.rpc("get_online_friends", { p_user_id: userId });
      if (error) throw error;
      setOnlineFriends(data || []);
    } catch (err) {
      console.error("Failed to fetch online friends:", err);
    }
  }, [userId]);

  // Load all data
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([
      fetchPendingInvites(),
      fetchSentInvites(),
      fetchFriends(),
      fetchOnlineFriends(),
    ]);
    setLoading(false);
  }, [fetchPendingInvites, fetchSentInvites, fetchFriends, fetchOnlineFriends]);

  // Create a shareable invite link
  const createFriendInvite = useCallback(async (): Promise<InviteResult> => {
    if (!userId) throw new Error("Not authenticated");
    try {
      const { data, error } = await supabase.rpc("create_friend_invite");
      if (error) throw error;
      await fetchSentInvites();
      return data[0];
    } catch (err) {
      console.error("Failed to create invite:", err);
      throw err;
    }
  }, [userId, fetchSentInvites]);

  // Create a direct invite to a specific user
  const createDirectInvite = useCallback(async (inviteeId: string): Promise<InviteResult> => {
    if (!userId) throw new Error("Not authenticated");
    try {
      const { data, error } = await supabase.rpc("create_direct_friend_invite", { p_invitee_id: inviteeId });
      if (error) throw error;
      await fetchSentInvites();
      return data[0];
    } catch (err) {
      console.error("Failed to create direct invite:", err);
      throw err;
    }
  }, [userId, fetchSentInvites]);

  // Accept an invite
  const acceptInvite = useCallback(async (inviteCode: string): Promise<{ friend_id: string; friend_username: string }> => {
    if (!userId) throw new Error("Not authenticated");
    try {
      const { data, error } = await supabase.rpc("accept_friend_invite", { p_invite_code: inviteCode });
      if (error) throw error;
      await Promise.all([fetchPendingInvites(), fetchFriends(), fetchSentInvites()]);
      return { friend_id: data[0].friend_id, friend_username: data[0].friend_username };
    } catch (err) {
      console.error("Failed to accept invite:", err);
      throw err;
    }
  }, [userId, fetchPendingInvites, fetchFriends, fetchSentInvites]);

  // Decline an invite
  const declineInvite = useCallback(async (inviteCode: string): Promise<void> => {
    try {
      const { error } = await supabase.rpc("decline_friend_invite", { p_invite_code: inviteCode });
      if (error) throw error;
      await fetchPendingInvites();
    } catch (err) {
      console.error("Failed to decline invite:", err);
      throw err;
    }
  }, [fetchPendingInvites]);

  // Update presence
  const updatePresence = useCallback(async (
    status: "offline" | "online" | "in_lobby" | "in_game" | "spectating",
    roomId?: string,
    activity?: string
  ): Promise<void> => {
    if (!userId) return;
    try {
      const { error } = await supabase.rpc("update_presence", {
        p_status: status,
        p_room_id: roomId || null,
        p_activity: activity || null,
      });
      if (error) throw error;
    } catch (err) {
      console.error("Failed to update presence:", err);
    }
  }, [userId]);

  // Subscribe to realtime presence updates
  // Use a unique suffix for channel names to avoid conflicts when multiple components use this hook
  const channelSuffix = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    if (!userId) return;

    loadAll();

    // ---- Invites channel ----
    const invitesChannel = supabase.channel(`friend_invites_changes_${channelSuffix.current}`);
    invitesChannel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "friend_invites",
        filter: `inviter_id=eq.${userId}`,
      },
      () => {
        fetchSentInvites();
        fetchPendingInvites();
      }
    );
    invitesChannel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "friend_invites",
        filter: `invitee_id=eq.${userId}`,
      },
      () => {
        fetchPendingInvites();
      }
    );
    invitesChannel.subscribe();

    // ---- Presence channel ----
    const presenceChannel = supabase.channel(`friends_presence_${channelSuffix.current}`);
    presenceChannel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `presence_status!=offline`,
      },
      (payload) => {
        // Update local state if this is a friend
        setFriends((prev) =>
          prev.map((f) =>
            f.id === payload.new.id
              ? { ...f, ...payload.new, is_online: payload.new.presence_status !== "offline" }
              : f
          )
        );
        setOnlineFriends((prev) =>
          prev.map((f) =>
            f.id === payload.new.id ? { ...f, ...payload.new } : f
          )
        );
      }
    );
    presenceChannel.subscribe();

    // ---- Friendships channel ----
    const friendshipsChannel = supabase.channel(`friendships_changes_${channelSuffix.current}`);
    friendshipsChannel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "friendships",
        filter: `requester_id=eq.${userId}`,
      },
      () => {
        fetchFriends();
        fetchOnlineFriends();
      }
    );
    friendshipsChannel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "friendships",
        filter: `addressee_id=eq.${userId}`,
      },
      () => {
        fetchFriends();
        fetchOnlineFriends();
      }
    );
    friendshipsChannel.subscribe();

    return () => {
      supabase.removeChannel(invitesChannel);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(friendshipsChannel);
    };
  }, [userId, loadAll, fetchSentInvites, fetchPendingInvites, fetchFriends, fetchOnlineFriends]);

  return {
    // State
    pendingInvites,
    sentInvites,
    friends,
    onlineFriends,
    loading,
    error,

    // Actions
    createFriendInvite,
    createDirectInvite,
    acceptInvite,
    declineInvite,
    updatePresence,
    refresh: loadAll,
  };
}

/**
 * Hook for presence only - lighter weight for components that just need presence
 */
export function usePresence() {
  const { user } = useAuth();
  const userId = user?.uid;

  const updatePresence = useCallback(async (
    status: "offline" | "online" | "in_lobby" | "in_game" | "spectating",
    roomId?: string,
    activity?: string
  ): Promise<void> => {
    if (!userId) return;
    try {
      const { error } = await supabase.rpc("update_presence", {
        p_status: status,
        p_room_id: roomId || null,
        p_activity: activity || null,
      });
      if (error) throw error;
    } catch (err) {
      console.error("Failed to update presence:", err);
    }
  }, [userId]);

  return { updatePresence };
}

/**
 * Helper to get status display info
 */
export function getPresenceDisplay(status: string) {
  switch (status) {
    case "in_game":
      return { label: "In Game", color: "text-emerald-500", icon: "🎮", priority: 1 };
    case "spectating":
      return { label: "Spectating", color: "text-blue-500", icon: "👁️", priority: 2 };
    case "in_lobby":
      return { label: "In Lobby", color: "text-amber-500", icon: "🏠", priority: 3 };
    case "online":
      return { label: "Online", color: "text-green-500", icon: "🟢", priority: 4 };
    default:
      return { label: "Offline", color: "text-slate-500", icon: "⚫", priority: 5 };
  }
}

/**
 * Format time since last seen
 */
export function formatLastSeen(lastSeen: string): string {
  const diff = Date.now() - new Date(lastSeen).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(lastSeen).toLocaleDateString();
}