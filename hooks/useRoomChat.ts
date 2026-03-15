import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  limitToLast as dbLimitToLast,
  onValue as dbOnValue,
  push as dbPush,
  query as dbQuery,
  ref as dbRef,
  serverTimestamp as dbServerTimestamp,
} from "firebase/database";
import { db } from "../firebase";

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  type: "user" | "server";
}

interface UseRoomChatArgs {
  roomId?: string | null;
  senderName?: string | null;
  scrollSignal?: unknown;
}

export const useRoomChat = ({
  roomId,
  senderName,
  scrollSignal,
}: UseRoomChatArgs) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const joinTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!roomId) return;

    const chatRef = dbQuery(dbRef(db, `rooms/${roomId}/chat`), dbLimitToLast(50));
    const unsubscribeChat = dbOnValue(chatRef, (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const msgList = Object.entries(data)
          .map(([key, val]: [string, any]) => ({
            id: key,
            sender: val.sender,
            text: val.text,
            timestamp: val.timestamp,
            type: val.type || "user",
          }))
          .filter((msg) => msg.timestamp && msg.timestamp >= joinTimeRef.current);

        setMessages(msgList);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribeChat();
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, scrollSignal]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !roomId || !senderName) return;

    try {
      await dbPush(dbRef(db, `rooms/${roomId}/chat`), {
        sender: senderName,
        text: chatInput,
        timestamp: dbServerTimestamp(),
        type: "user",
      });
      setChatInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return {
    chatEndRef,
    chatInput,
    messages,
    sendMessage,
    setChatInput,
  };
};
