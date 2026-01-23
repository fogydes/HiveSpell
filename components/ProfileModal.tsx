import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

interface ProfileData {
  id: string;
  username: string;
  title: string;
  corrects: number;
  wins: number;
  current_nectar: number;
  lifetime_nectar: number;
  inventory: string[];
}

interface ProfileModalProps {
  userId: string;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  userId,
  onClose,
}) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (fetchError) throw fetchError;
        setProfile(data);
      } catch (err: any) {
        console.error("Failed to fetch profile:", err);
        setError("Could not load profile.");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-hidden animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-panel border border-surface rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-main transition-colors text-xl z-10"
        >
          ✕
        </button>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin text-4xl mb-4">🐝</div>
            <p className="text-text-muted">Loading profile...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4 opacity-50">❌</div>
            <p className="text-red-400">{error}</p>
          </div>
        ) : profile ? (
          <>
            {/* Header / Banner */}
            <div className="h-20 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30"></div>

            {/* Avatar */}
            <div className="flex flex-col items-center -mt-12 px-6 pb-6">
              <div className="w-24 h-24 rounded-full bg-panel border-4 border-primary shadow-xl overflow-hidden mb-4">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              </div>

              <h2 className="text-2xl font-bold text-text-main">
                {profile.username}
              </h2>
              <p className="text-primary font-bold uppercase tracking-widest text-sm mb-4">
                {profile.title || "Novice Bee"}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 w-full mb-6">
                <div className="bg-surface/50 p-3 rounded-xl border border-surface text-center">
                  <div className="text-xl font-mono text-primary font-bold">
                    {profile.wins ?? 0}
                  </div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1">
                    Wins
                  </div>
                </div>
                <div className="bg-surface/50 p-3 rounded-xl border border-surface text-center">
                  <div className="text-xl font-mono text-text-main font-bold">
                    {profile.corrects ?? 0}
                  </div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1">
                    Corrects
                  </div>
                </div>
                <div className="bg-surface/50 p-3 rounded-xl border border-surface text-center">
                  <div className="text-xl font-mono text-accent font-bold">
                    {profile.lifetime_nectar ?? 0}
                  </div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1">
                    Lifetime 🍯
                  </div>
                </div>
              </div>

              {/* Items Owned (Optional Display) */}
              {profile.inventory && profile.inventory.length > 0 && (
                <div className="w-full border-t border-surface pt-4">
                  <p className="text-xs text-text-muted uppercase tracking-widest mb-2 text-center">
                    Items Collected
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {profile.inventory.slice(0, 6).map((itemId) => (
                      <span
                        key={itemId}
                        className="bg-panel px-2 py-1 rounded-md text-xs text-text-muted border border-surface"
                      >
                        {itemId}
                      </span>
                    ))}
                    {profile.inventory.length > 6 && (
                      <span className="text-xs text-text-muted">
                        +{profile.inventory.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <p className="text-text-muted">No profile data found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
