import { supabase } from "./supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: "image" | "file" | "voice" | null;
  attachment_name?: string | null;
}

export interface Conversation {
  friendId: string;
  friendUsername: string;
  friendAvatarUrl?: string;
  friendAvatarSeed?: string;
  friendTitle?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  lastSenderId: string;
}

/**
 * Get all conversations for a user with last message preview
 */
export async function getConversations(
  userId: string,
): Promise<Conversation[]> {
  // Get all messages involving this user
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error || !messages) {
    console.error("Failed to get conversations:", error);
    return [];
  }

  // Group by conversation partner
  const convMap = new Map<string, { lastMsg: Message; unread: number }>();

  for (const msg of messages) {
    const friendId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;

    if (!convMap.has(friendId)) {
      convMap.set(friendId, { lastMsg: msg, unread: 0 });
    }

    // Count unread messages from this friend
    if (msg.receiver_id === userId && !msg.read) {
      const entry = convMap.get(friendId)!;
      entry.unread++;
    }
  }

  if (convMap.size === 0) return [];

  // Fetch friend profiles
  const friendIds = Array.from(convMap.keys());
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, avatar_seed, title")
    .in("id", friendIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  // Build conversations
  const conversations: Conversation[] = [];
  for (const [friendId, { lastMsg, unread }] of convMap) {
    const profile = profileMap.get(friendId);
    let preview = lastMsg.content || "";
    if (!preview && lastMsg.attachment_type) {
      preview =
        lastMsg.attachment_type === "image"
          ? "📷 Image"
          : lastMsg.attachment_type === "voice"
            ? "🎤 Voice message"
            : `📎 ${lastMsg.attachment_name || "File"}`;
    }

    conversations.push({
      friendId,
      friendUsername: profile?.username || "Unknown",
      friendAvatarUrl: profile?.avatar_url,
      friendAvatarSeed: profile?.avatar_seed,
      friendTitle: profile?.title,
      lastMessage: preview,
      lastMessageTime: lastMsg.created_at,
      unreadCount: unread,
      lastSenderId: lastMsg.sender_id,
    });
  }

  // Sort by last message time
  conversations.sort(
    (a, b) =>
      new Date(b.lastMessageTime).getTime() -
      new Date(a.lastMessageTime).getTime(),
  );

  return conversations;
}

/**
 * Get message history between two users
 */
export async function getMessages(
  userId: string,
  friendId: string,
  limit = 50,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`,
    )
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Failed to get messages:", error);
    return [];
  }

  return data || [];
}

/**
 * Send a text message, optionally with an attachment
 */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
  attachment?: {
    url: string;
    type: "image" | "file" | "voice";
    name: string;
  },
): Promise<Message | null> {
  const payload: any = {
    sender_id: senderId,
    receiver_id: receiverId,
    content: content || "",
  };

  if (attachment) {
    payload.attachment_url = attachment.url;
    payload.attachment_type = attachment.type;
    payload.attachment_name = attachment.name;
  }

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Failed to send message:", error);
    return null;
  }

  return data;
}

/**
 * Upload an attachment to storage (images, files, voice)
 * Returns { url, name } on success
 */
export async function uploadAttachment(
  file: File | Blob,
  senderId: string,
  fileName?: string,
): Promise<{ url: string; name: string } | null> {
  const name =
    fileName || (file instanceof File ? file.name : "recording.webm");
  const ext = name.split(".").pop()?.toLowerCase() || "bin";
  const uniqueName = `${senderId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("chat-attachments")
    .upload(uniqueName, file, { upsert: false });

  if (error) {
    console.error("Failed to upload attachment:", error);
    return null;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("chat-attachments").getPublicUrl(uniqueName);

  return { url: publicUrl, name };
}

/**
 * Delete a message (sender only)
 */
export async function deleteMessage(
  messageId: string,
  senderId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_id", senderId);

  if (error) {
    console.error("Failed to delete message:", error);
    return false;
  }
  return true;
}

/**
 * Edit a message's content (sender only)
 */
export async function updateMessage(
  messageId: string,
  senderId: string,
  newContent: string,
): Promise<Message | null> {
  const { data, error } = await supabase
    .from("messages")
    .update({ content: newContent })
    .eq("id", messageId)
    .eq("sender_id", senderId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update message:", error);
    return null;
  }
  return data;
}

/**
 * Mark all messages from a friend as read
 */
export async function markConversationAsRead(
  userId: string,
  friendId: string,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("sender_id", friendId)
    .eq("receiver_id", userId)
    .eq("read", false);

  if (error) console.error("Failed to mark messages as read:", error);
}

/**
 * Subscribe to new messages for a user (Realtime)
 */
export function subscribeToMessages(
  userId: string,
  onNewMessage: (msg: Message) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`messages:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        onNewMessage(payload.new as Message);
      },
    )
    .subscribe();

  return channel;
}
