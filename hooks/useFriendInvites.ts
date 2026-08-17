import { useCallback, useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/services/supabase";
import type { Tables } from "@/types/database.types";

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

// Row shapes for the direct-table queries below, derived from the Supabase
// generated schema. The shared client is intentionally untyped
// (see services/supabase.ts), so these annotate the mapper inputs to keep
// field access type-checked without pulling the app under a <Database> client.
type PendingInviteRow = Pick<
  Tables<"friend_invites">,
  "id" | "invite_code" | "inviter_id" | "created_at" | "expires_at"
> & { profiles: Pick<Tables<"profiles">, "username" | "avatar_url"> | null };

type SentInviteRow = Pick<
  Tables<"friend_invites">,
  "id" | "invite_code" | "invitee_id" | "status" | "created_at" | "expires_at"
> & { profiles: Pick<Tables<"profiles">, "username"> | null };

type FriendProfileRow = Pick<
  Tables<"profiles">,
  | "id"
  | "username"
  | "avatar_url"
  | "tier"
  | "presence_status"
  | "current_room_id"
  | "current_activity"
  | "last_seen"
  | "updated_at"
  | "created_at"
>;

type OnlineFriendProfileRow = Pick<
  Tables<"profiles">,
  | "id"
  | "username"
  | "avatar_url"
  | "presence_status"
  | "current_room_id"
  | "current_activity"
  | "last_seen"
  | "updated_at"
  | "created_at"
>;

/**
 * Hook for managing friend invites and presence
 * Uses direct table queries with RLS (not RPC) to work with Firebase Auth via accessToken
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

  // Fetch pending invites (incoming) - direct query with RLS
  const fetchPendingInvites = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("friend_invites")
        .select(`
          id,
          invite_code,
          inviter_id,
          created_at,
          expires_at,
          profiles:inviter_id ( username, avatar_url )
        `)
        .eq("invitee_id", userId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Supabase infers the to-one `profiles` embed as an array on the untyped
      // client; at runtime it is a single object|null, so cast to the object shape.
      const mapped = ((data || []) as unknown as PendingInviteRow[]).map((row) => ({
        id: row.id,
        invite_code: row.invite_code,
        inviter_id: row.inviter_id,
        inviter_username: row.profiles?.username || "Unknown",
        inviter_avatar_url: row.profiles?.avatar_url || null,
        created_at: row.created_at,
        expires_at: row.expires_at,
      }));
      setPendingInvites(mapped);
    } catch (err) {
      console.error("Failed to fetch pending invites:", err);
      setError("Failed to load invites");
    }
  }, [userId]);

  // Fetch sent invites (outgoing) - direct query with RLS
  const fetchSentInvites = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("friend_invites")
        .select(`
          id,
          invite_code,
          invitee_id,
          status,
          created_at,
          expires_at,
          profiles:invitee_id ( username )
        `)
        .eq("inviter_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // See fetchPendingInvites: the to-one `profiles` embed is object|null at runtime.
      const mapped = ((data || []) as unknown as SentInviteRow[]).map((row) => ({
        id: row.id,
        invite_code: row.invite_code,
        invitee_id: row.invitee_id,
        invitee_username: row.profiles?.username || null,
        status: row.status as SentInvite["status"],
        created_at: row.created_at,
        expires_at: row.expires_at,
      }));
      setSentInvites(mapped);
    } catch (err) {
      console.error("Failed to fetch sent invites:", err);
    }
  }, [userId]);

  // Fetch friends with presence - direct query with RLS
  const fetchFriends = useCallback(async () => {
    if (!userId) return;
    try {
      // Get friendships where user is requester or addressee with status = accepted
      const { data: friendships, error: friendshipsError } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (friendshipsError || !friendships) {
        console.error("Failed to get friendships:", friendshipsError);
        setFriends([]);
        return;
      }

      if (friendships.length === 0) {
        setFriends([]);
        return;
      }

      // Get friend IDs (the other user in each friendship)
      const friendIds = friendships.map((f) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id,
      );

      // Fetch friend profiles with presence info
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(
          "id, username, avatar_url, tier, presence_status, current_room_id, current_activity, last_seen, updated_at, created_at"
        )
        .in("id", friendIds);

      if (profilesError || !profiles) {
        console.error("Failed to get friend profiles:", profilesError);
        setFriends([]);
        return;
      }

      const mapped = profiles.map((p: FriendProfileRow) => ({
        id: p.id,
        username: p.username as string,
        avatar_url: p.avatar_url,
        tier: p.tier || "Bronze",
        presence_status: (p.presence_status || "offline") as FriendWithPresence["presence_status"],
        current_room_id: p.current_room_id,
        current_activity: p.current_activity,
        last_seen: p.last_seen || p.updated_at || p.created_at,
        is_online: (p.presence_status || "offline") !== "offline",
      }));

      // Sort: online first (by presence priority), then by username
      mapped.sort((a, b) => {
        const priority = (status: string) => {
          switch (status) {
            case "in_game": return 1;
            case "spectating": return 2;
            case "in_lobby": return 3;
            case "online": return 4;
            default: return 5;
          }
        };
        const aPriority = priority(a.presence_status);
        const bPriority = priority(b.presence_status);
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.username.localeCompare(b.username);
      });

      setFriends(mapped);
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    }
  }, [userId]);

  // Fetch online friends - direct query with RLS
  const fetchOnlineFriends = useCallback(async () => {
    if (!userId) return;
    try {
      // Get friendships where user is requester or addressee with status = accepted
      const { data: friendships, error: friendshipsError } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (friendshipsError || !friendships) {
        console.error("Failed to get friendships:", friendshipsError);
        setOnlineFriends([]);
        return;
      }

      if (friendships.length === 0) {
        setOnlineFriends([]);
        return;
      }

      const friendIds = friendships.map((f) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id,
      );

      // Fetch only online friend profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(
          "id, username, avatar_url, presence_status, current_room_id, current_activity, last_seen, updated_at, created_at"
        )
        .in("id", friendIds)
        .neq("presence_status", "offline");

      if (profilesError || !profiles) {
        console.error("Failed to get online friend profiles:", profilesError);
        setOnlineFriends([]);
        return;
      }

      const mapped = profiles.map((p: OnlineFriendProfileRow) => ({
        id: p.id,
        username: p.username as string,
        avatar_url: p.avatar_url,
        presence_status: p.presence_status as OnlineFriend["presence_status"],
        current_room_id: p.current_room_id,
        current_activity: p.current_activity,
        last_seen: p.last_seen || p.updated_at || p.created_at,
      }));

      // Sort by presence priority, then username
      mapped.sort((a, b) => {
        const priority = (status: string) => {
          switch (status) {
            case "in_game": return 1;
            case "spectating": return 2;
            case "in_lobby": return 3;
            case "online": return 4;
            default: return 5;
          }
        };
        const aPriority = priority(a.presence_status);
        const bPriority = priority(b.presence_status);
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.username.localeCompare(b.username);
      });

      setOnlineFriends(mapped);
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

  // Create a shareable invite link - direct insert with RLS
  const createFriendInvite = useCallback(async (): Promise<InviteResult> => {
    if (!userId) throw new Error("Not authenticated");
    try {
      // Generate invite code (same logic as generate_invite_code RPC)
      const generateCode = () => {
        return Array.from(crypto.getRandomValues(new Uint8Array(8)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .substring(0, 8)
          .toUpperCase();
      };

      let inviteCode = generateCode();
      // Ensure uniqueness (retry up to 5 times)
      for (let i = 0; i < 5; i++) {
        const { data: existing } = await supabase
          .from("friend_invites")
          .select("id")
          .eq("invite_code", inviteCode)
          .maybeSingle();
        if (!existing) break;
        inviteCode = generateCode();
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from("friend_invites").insert({
        invite_code: inviteCode,
        inviter_id: userId,
        invitee_id: null,
        status: "pending",
        expires_at: expiresAt,
      });

      if (error) throw error;

      await fetchSentInvites();

      return {
        invite_code: inviteCode,
        invite_url: `https://hivespell.com/invite/${inviteCode}`,
        expires_at: expiresAt,
      };
    } catch (err) {
      console.error("Failed to create invite:", err);
      throw err;
    }
  }, [userId, fetchSentInvites]);

  // Create a direct invite to a specific user - direct insert with RLS
  const createDirectInvite = useCallback(async (inviteeId: string): Promise<InviteResult> => {
    if (!userId) throw new Error("Not authenticated");
    try {
      if (userId === inviteeId) {
        throw new Error("Cannot invite yourself");
      }

      // Check if already friends
      const { data: existingFriendship } = await supabase
        .from("friendships")
        .select("id")
        .eq("status", "accepted")
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${inviteeId}),and(requester_id.eq.${inviteeId},addressee_id.eq.${userId})`
        )
        .maybeSingle();

      if (existingFriendship) {
        throw new Error("Already friends");
      }

      // Check for existing pending invite (either direction)
      const { data: existingInvite } = await supabase
        .from("friend_invites")
        .select("id")
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .or(
          `and(inviter_id.eq.${userId},invitee_id.eq.${inviteeId}),and(inviter_id.eq.${inviteeId},invitee_id.eq.${userId})`
        )
        .maybeSingle();

      if (existingInvite) {
        throw new Error("Invite already pending");
      }

      // Generate invite code
      const generateCode = () => {
        return Array.from(crypto.getRandomValues(new Uint8Array(8)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .substring(0, 8)
          .toUpperCase();
      };

      let inviteCode = generateCode();
      for (let i = 0; i < 5; i++) {
        const { data: existing } = await supabase
          .from("friend_invites")
          .select("id")
          .eq("invite_code", inviteCode)
          .maybeSingle();
        if (!existing) break;
        inviteCode = generateCode();
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from("friend_invites").insert({
        invite_code: inviteCode,
        inviter_id: userId,
        invitee_id: inviteeId,
        status: "pending",
        expires_at: expiresAt,
      });

      if (error) throw error;

      await fetchSentInvites();

      return {
        invite_code: inviteCode,
        invite_url: `https://hivespell.com/invite/${inviteCode}`,
        expires_at: expiresAt,
      };
    } catch (err) {
      console.error("Failed to create direct invite:", err);
      throw err;
    }
  }, [userId, fetchSentInvites]);

  // Accept an invite - direct updates with RLS
  const acceptInvite = useCallback(async (inviteCode: string): Promise<{ friend_id: string; friend_username: string }> => {
    if (!userId) throw new Error("Not authenticated");
    try {
      // Get the invite
      const { data: invite, error: inviteError } = await supabase
        .from("friend_invites")
        .select("*")
        .eq("invite_code", inviteCode)
        .eq("invitee_id", userId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (inviteError || !invite) {
        throw new Error("Invalid or expired invite");
      }

      // Check if already friends (shouldn't happen but safety check)
      const { data: existingFriendship } = await supabase
        .from("friendships")
        .select("id")
        .eq("status", "accepted")
        .or(
          `and(requester_id.eq.${invite.inviter_id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${invite.inviter_id})`
        )
        .maybeSingle();

      if (existingFriendship) {
        // Already friends - just update invite status
        await supabase
          .from("friend_invites")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("id", invite.id);

        // Get inviter username
        const { data: inviterProfile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", invite.inviter_id)
          .single();

        return {
          friend_id: invite.inviter_id,
          friend_username: inviterProfile?.username || "Unknown",
        };
      }

      // Create friendship
      const { data: friendship, error: friendshipError } = await supabase
        .from("friendships")
        .insert({
          requester_id: invite.inviter_id,
          addressee_id: userId,
          status: "accepted",
        })
        .select("id")
        .single();

      if (friendshipError) throw friendshipError;

      // Update invite status
      await supabase
        .from("friend_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      // Get inviter username
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", invite.inviter_id)
        .single();

      await Promise.all([fetchPendingInvites(), fetchFriends(), fetchSentInvites()]);

      return {
        friend_id: invite.inviter_id,
        friend_username: inviterProfile?.username || "Unknown",
      };
    } catch (err) {
      console.error("Failed to accept invite:", err);
      throw err;
    }
  }, [userId, fetchPendingInvites, fetchFriends, fetchSentInvites]);

  // Decline an invite - direct update with RLS
  const declineInvite = useCallback(async (inviteCode: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from("friend_invites")
        .update({ status: "declined" })
        .eq("invite_code", inviteCode)
        .eq("invitee_id", userId)
        .eq("status", "pending");

      if (error) throw error;

      await fetchPendingInvites();
    } catch (err) {
      console.error("Failed to decline invite:", err);
      throw err;
    }
  }, [fetchPendingInvites]);

  // Update presence - direct update with RLS
  const updatePresence = useCallback(async (
    status: "offline" | "online" | "in_lobby" | "in_game" | "spectating",
    roomId?: string,
    activity?: string
  ): Promise<void> => {
    if (!userId) return;
    try {
      const validStatuses = ["offline", "online", "in_lobby", "in_game", "spectating"];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid presence status: ${status}`);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          presence_status: status,
          current_room_id: roomId || null,
          current_activity: activity || null,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to update presence:", err);
    }
  }, [userId]);

  // Subscribe to realtime presence updates
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
    fetchPendingInvites,
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
      const validStatuses = ["offline", "online", "in_lobby", "in_game", "spectating"];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid presence status: ${status}`);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          presence_status: status,
          current_room_id: roomId || null,
          current_activity: activity || null,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

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