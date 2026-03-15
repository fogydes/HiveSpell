import React from "react";

interface RoomChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  type: "user" | "server";
}

interface RoomChatPanelProps {
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  chatInput: string;
  className: string;
  messages: RoomChatMessage[];
  onChatInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const RoomChatPanel: React.FC<RoomChatPanelProps> = ({
  chatEndRef,
  chatInput,
  className,
  messages,
  onChatInputChange,
  onSubmit,
}) => {
  return (
    <div className={className}>
      <div className="p-3 border-b border-surface bg-panel/20 font-bold text-sm">
        Hive Chat
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-xs text-text-muted text-center mt-4">
            Welcome to the chat!
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="text-xs break-words">
            {msg.type === "server" ? (
              <span className="text-red-400 font-bold">[Server] {msg.text}</span>
            ) : (
              <>
                <span className="text-yellow-400 font-bold">
                  [{msg.sender}]:
                </span>{" "}
                <span className="text-white drop-shadow-md">{msg.text}</span>
              </>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form
        onSubmit={onSubmit}
        className="p-3 bg-black/30 border-t border-slate-700"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          placeholder="Message..."
          className="w-full bg-surface border border-surface/50 rounded-lg px-3 py-2 text-xs text-text-main placeholder-text-muted outline-none focus:border-primary"
        />
      </form>
    </div>
  );
};

export default RoomChatPanel;
