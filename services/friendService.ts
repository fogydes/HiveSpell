import { supabase } from "./supabase";
import { createNotification } from "./notificationService";

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface FriendWithProfile {
  friendship: Friendship;
  profile: {
    id: string;
    username: string;
    avatar_url?: string;
    avatar_seed?: string;
    title?: string;
  };
}

/**
 * Send a friend request. Creates a friendship row + notification for the recipient.
 */
export async function sendFriendRequest(
  fromId: string,
  toId: string,
  fromUsername: string,
): Promise<{ success: boolean; error?: string }> {
  // Check if a friendship already exists in either direction
  const existing = await getFriendshipStatus(fromId, toId);
  if (existing) {
    if (existing.status === "pending")
      return { success: false, error: "Request already pending." };
    if (existing.status === "accepted")
      return { success: false, error: "Already friends!" };
    // If declined, delete old one and allow re-request
    if (existing.status === "declined") {
      await supabase.from("friendships").delete().eq("id", existing.id);
    }
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: fromId,
    addressee_id: toId,
    status: "pending",
  });

  if (error) {
    console.error("Failed to send friend request:", error);
    return { success: false, error: error.message };
  }

  // Create notification for recipient
  await createNotification(
    toId,
    "friend_request",
    "Friend Request",
    `${fromUsername} wants to be your friend!`,
    { from_user_id: fromId, from_username: fromUsername },
  );

  return { success: true };
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(
  friendshipId: string,
  acceptingUsername: string,
): Promise<{ success: boolean; error?: string }> {
  // Get the friendship to find the requester
  const { data: friendship, error: fetchError } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .single();

  if (fetchError || !friendship) {
    return { success: false, error: "Friend request not found." };
  }

  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId);

  if (error) {
    console.error("Failed to accept friend request:", error);
    return { success: false, error: error.message };
  }

  // Notify the requester that their request was accepted
  await createNotification(
    friendship.requester_id,
    "friend_accepted",
    "Friend Request Accepted",
    `${acceptingUsername} accepted your friend request!`,
    { from_user_id: friendship.addressee_id, from_username: acceptingUsername },
  );

  return { success: true };
}

/**
 * Decline a friend request
 */
export async function declineFriendRequest(
  friendshipId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "declined" })
    .eq("id", friendshipId);

  if (error) {
    console.error("Failed to decline friend request:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Cancel an outgoing pending friend request
 */
export async function cancelFriendRequest(
  friendshipId: string,
  requesterId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .eq("requester_id", requesterId)
    .eq("status", "pending");

  if (error) {
    console.error("Failed to cancel friend request:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove a friend
 */
export async function removeFriend(
  friendshipId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);

  if (error) {
    console.error("Failed to remove friend:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all accepted friends for a user, joined with profile data
 */
export async function getFriends(userId: string): Promise<FriendWithProfile[]> {
  // Get friendships where user is requester or addressee with status = accepted
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error || !data) {
    console.error("Failed to get friends:", error);
    return [];
  }

  // Get the other user's profile for each friendship
  const friendIds = data.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id,
  );

  if (friendIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, avatar_seed, title")
    .in("id", friendIds);

  if (profileError || !profiles) {
    console.error("Failed to get friend profiles:", profileError);
    return [];
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return data.map((friendship) => {
    const friendId =
      friendship.requester_id === userId
        ? friendship.addressee_id
        : friendship.requester_id;
    return {
      friendship,
      profile: profileMap.get(friendId) || {
        id: friendId,
        username: "Unknown",
      },
    };
  });
}

/**
 * Get pending friend requests TO this user (incoming)
 */
export async function getIncomingRequests(
  userId: string,
): Promise<FriendWithProfile[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to get incoming requests:", error);
    return [];
  }

  if (data.length === 0) return [];

  const requesterIds = data.map((f) => f.requester_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, avatar_seed, title")
    .in("id", requesterIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  return data.map((friendship) => ({
    friendship,
    profile: profileMap.get(friendship.requester_id) || {
      id: friendship.requester_id,
      username: "Unknown",
    },
  }));
}

/**
 * Get outgoing pending requests FROM this user
 */
export async function getOutgoingRequests(
  userId: string,
): Promise<FriendWithProfile[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .eq("requester_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to get outgoing requests:", error);
    return [];
  }

  if (data.length === 0) return [];

  const addresseeIds = data.map((f) => f.addressee_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, avatar_seed, title")
    .in("id", addresseeIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  return data.map((friendship) => ({
    friendship,
    profile: profileMap.get(friendship.addressee_id) || {
      id: friendship.addressee_id,
      username: "Unknown",
    },
  }));
}

/**
 * Get the friendship status between two users (in either direction)
 */
export async function getFriendshipStatus(
  userId1: string,
  userId2: string,
): Promise<Friendship | null> {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(
      `and(requester_id.eq.${userId1},addressee_id.eq.${userId2}),and(requester_id.eq.${userId2},addressee_id.eq.${userId1})`,
    )
    .neq("status", "declined")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to get friendship status:", error);
    return null;
  }

  return data;
}

/**
 * Search profiles by username (for friend search)
 */
export async function searchUsers(
  query: string,
  currentUserId: string,
): Promise<
  Array<{
    id: string;
    username: string;
    avatar_url?: string;
    avatar_seed?: string;
    title?: string;
  }>
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, avatar_seed, title")
    .ilike("username", `%${query}%`)
    .neq("id", currentUserId)
    .limit(10);

  if (error) {
    console.error("Failed to search users:", error);
    return [];
  }

  return data || [];
}
