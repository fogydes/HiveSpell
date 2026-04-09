import { supabase } from "./supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface Notification {
  id: string;
  user_id: string;
  type: "friend_request" | "friend_accepted" | "system";
  title: string;
  message: string | null;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

/**
 * Get all notifications for a user, newest first
 */
export async function getNotifications(
  userId: string,
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }
  return data || [];
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("Failed to get unread count:", error);
    return 0;
  }
  return count || 0;
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) console.error("Failed to mark notification as read:", error);
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) console.error("Failed to mark all as read:", error);
}

/**
 * Create a notification
 */
export async function createNotification(
  userId: string,
  type: Notification["type"],
  title: string,
  message: string | null,
  data: Record<string, any> = {},
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    data,
  });

  if (error) console.error("Failed to create notification:", error);
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) console.error("Failed to delete notification:", error);
}

/**
 * Delete pending friend request notifications for a specific requester/addressee pair.
 */
export async function deleteFriendRequestNotifications(
  addresseeId: string,
  requesterId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", addresseeId)
    .eq("type", "friend_request")
    .contains("data", { from_user_id: requesterId });

  if (error) {
    console.error("Failed to delete friend request notifications:", error);
  }
}

/**
 * Subscribe to realtime notification changes for a user.
 * Returns the channel so it can be unsubscribed later.
 */
export function subscribeToNotifications(
  userId: string,
  onInsert: (notification: Notification) => void,
  onUpdate?: (notification: Notification) => void,
): RealtimeChannel {
  const channel = supabase.channel(`notifications:${userId}`).on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      onInsert(payload.new as Notification);
    },
  );

  if (onUpdate) {
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onUpdate(payload.new as Notification);
      },
    );
  }

  channel.subscribe();
  return channel;
}
