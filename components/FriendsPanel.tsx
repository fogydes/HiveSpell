import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  getFriendshipStatus,
  FriendWithProfile,
} from "../services/friendService";

type Tab = "friends" | "pending" | "search";

interface FriendsPanelProps {
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
}

const FriendsPanel: React.FC<FriendsPanelProps> = ({
  onClose,
  onViewProfile,
}) => {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [incoming, setIncoming] = useState<FriendWithProfile[]>([]);
  const [outgoing, setOutgoing] = useState<FriendWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string;
      username: string;
      avatar_url?: string;
      avatar_seed?: string;
      title?: string;
      friendshipStatus?: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [f, inc, out] = await Promise.all([
      getFriends(user.uid),
      getIncomingRequests(user.uid),
      getOutgoingRequests(user.uid),
    ]);
    setFriends(f);
    setIncoming(inc);
    setOutgoing(out);
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearchLoading(true);
    const results = await searchUsers(searchQuery.trim(), user.uid);

    // Get friendship status for each result
    const resultsWithStatus = await Promise.all(
      results.map(async (r) => {
        const friendship = await getFriendshipStatus(user.uid, r.id);
        return { ...r, friendshipStatus: friendship?.status || null };
      }),
    );

    setSearchResults(resultsWithStatus);
    setSearchLoading(false);
  };

  const handleSendRequest = async (toId: string) => {
    if (!user || !userData) return;
    setActionLoading(toId);
    const result = await sendFriendRequest(
      user.uid,
      toId,
      userData.username || "Someone",
    );
    if (result.success) {
      // Update the search result to show "pending"
      setSearchResults((prev) =>
        prev.map((r) =>
          r.id === toId ? { ...r, friendshipStatus: "pending" } : r,
        ),
      );
      // Refresh pending lists
      const out = await getOutgoingRequests(user.uid);
      setOutgoing(out);
    } else {
      alert(result.error || "Failed to send request");
    }
    setActionLoading(null);
  };

  const handleAccept = async (friendshipId: string) => {
    if (!userData) return;
    setActionLoading(friendshipId);
    const result = await acceptFriendRequest(
      friendshipId,
      userData.username || "Someone",
    );
    if (result.success) {
      await loadData();
    }
    setActionLoading(null);
  };

  const handleDecline = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    const result = await declineFriendRequest(friendshipId);
    if (result.success) {
      await loadData();
    }
    setActionLoading(null);
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm("Remove this friend?")) return;
    setActionLoading(friendshipId);
    const result = await removeFriend(friendshipId);
    if (result.success) {
      await loadData();
    }
    setActionLoading(null);
  };

  const getAvatarUrl = (profile: {
    id: string;
    avatar_url?: string;
    avatar_seed?: string;
  }) =>
    profile.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatar_seed || profile.id}`;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "friends", label: "Friends", count: friends.length },
    {
      key: "pending",
      label: "Pending",
      count: incoming.length + outgoing.length,
    },
    { key: "search", label: "Search" },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-panel border border-surface rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface">
          <h2 className="text-lg font-bold text-text-main">Friends</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-main transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? "text-primary"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96 custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin text-3xl mb-3">🐝</div>
              <p className="text-text-muted text-sm">Loading...</p>
            </div>
          ) : (
            <>
              {/* Friends Tab */}
              {activeTab === "friends" && (
                <>
                  {friends.length === 0 ? (
                    <div className="p-12 text-center">
                      <span className="text-4xl block mb-3 opacity-50">🐝</span>
                      <p className="text-text-muted text-sm">
                        No friends yet. Search for players to add!
                      </p>
                    </div>
                  ) : (
                    friends.map((f) => (
                      <div
                        key={f.friendship.id}
                        className="flex items-center gap-3 px-4 py-3 border-b border-surface/50 hover:bg-surface/20 transition-colors"
                      >
                        <img
                          src={getAvatarUrl(f.profile)}
                          alt={f.profile.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary/30"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-main truncate">
                            {f.profile.username}
                          </p>
                          <p className="text-[10px] text-text-muted uppercase tracking-wider">
                            {f.profile.title || "Newbee"}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {onViewProfile && (
                            <button
                              onClick={() => onViewProfile(f.profile.id)}
                              className="px-2 py-1 text-[10px] font-bold text-text-muted border border-surface rounded-lg hover:bg-surface/50 transition-colors"
                            >
                              Profile
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveFriend(f.friendship.id)}
                            disabled={actionLoading === f.friendship.id}
                            className="px-2 py-1 text-[10px] font-bold text-red-400/60 border border-red-500/20 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Pending Tab */}
              {activeTab === "pending" && (
                <>
                  {incoming.length === 0 && outgoing.length === 0 ? (
                    <div className="p-12 text-center">
                      <span className="text-4xl block mb-3 opacity-50">📭</span>
                      <p className="text-text-muted text-sm">
                        No pending requests
                      </p>
                    </div>
                  ) : (
                    <>
                      {incoming.length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-surface/20">
                            <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
                              Incoming Requests
                            </p>
                          </div>
                          {incoming.map((f) => (
                            <div
                              key={f.friendship.id}
                              className="flex items-center gap-3 px-4 py-3 border-b border-surface/50"
                            >
                              <img
                                src={getAvatarUrl(f.profile)}
                                alt={f.profile.username}
                                className="w-10 h-10 rounded-full object-cover border-2 border-accent/30"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text-main truncate">
                                  {f.profile.username}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleAccept(f.friendship.id)}
                                  disabled={actionLoading === f.friendship.id}
                                  className="px-3 py-1 text-xs font-bold bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleDecline(f.friendship.id)}
                                  disabled={actionLoading === f.friendship.id}
                                  className="px-3 py-1 text-xs font-bold text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      {outgoing.length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-surface/20">
                            <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
                              Sent Requests
                            </p>
                          </div>
                          {outgoing.map((f) => (
                            <div
                              key={f.friendship.id}
                              className="flex items-center gap-3 px-4 py-3 border-b border-surface/50"
                            >
                              <img
                                src={getAvatarUrl(f.profile)}
                                alt={f.profile.username}
                                className="w-10 h-10 rounded-full object-cover border-2 border-surface"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text-main truncate">
                                  {f.profile.username}
                                </p>
                              </div>
                              <span className="text-[10px] text-accent font-medium px-2 py-1 border border-accent/20 rounded-lg">
                                Pending...
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Search Tab */}
              {activeTab === "search" && (
                <>
                  <div className="p-4 border-b border-surface/50">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Search by username..."
                        className="flex-1 bg-surface/50 border border-surface rounded-lg px-3 py-2 text-sm text-text-main placeholder-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                      />
                      <button
                        onClick={handleSearch}
                        disabled={searchLoading || !searchQuery.trim()}
                        className="px-4 py-2 text-sm font-bold bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50"
                      >
                        {searchLoading ? "..." : "🔍"}
                      </button>
                    </div>
                  </div>

                  {searchResults.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-text-muted text-sm">
                        {searchQuery
                          ? "No players found"
                          : "Type a username and search"}
                      </p>
                    </div>
                  ) : (
                    searchResults.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-4 py-3 border-b border-surface/50 hover:bg-surface/20 transition-colors"
                      >
                        <img
                          src={getAvatarUrl(r)}
                          alt={r.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-surface"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-main truncate">
                            {r.username}
                          </p>
                          <p className="text-[10px] text-text-muted uppercase tracking-wider">
                            {r.title || "Newbee"}
                          </p>
                        </div>
                        {r.friendshipStatus === "accepted" ? (
                          <span className="text-xs text-primary font-medium px-2 py-1 border border-primary/20 rounded-lg">
                            Friends ✓
                          </span>
                        ) : r.friendshipStatus === "pending" ? (
                          <span className="text-xs text-accent font-medium px-2 py-1 border border-accent/20 rounded-lg">
                            Pending...
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(r.id)}
                            disabled={actionLoading === r.id}
                            className="px-3 py-1 text-xs font-bold bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === r.id ? "..." : "Add Friend"}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsPanel;
