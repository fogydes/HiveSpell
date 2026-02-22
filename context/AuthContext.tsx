import React, { createContext, useContext, useEffect, useState } from "react";
// Firebase Imports
import * as firebaseAuth from "firebase/auth";
import * as firebaseDatabase from "firebase/database";
import { auth, db } from "../firebase";

import { supabase } from "../services/supabase";

// Auth Listener
const { onAuthStateChanged } = firebaseAuth as any;
type User = any;

// Database References
const { ref, onValue, off, update } = firebaseDatabase as any;

// User Profile Data Interface
export interface UserData {
  stars: number; // Deprecated: mapped to nectar
  nectar?: number; // New field
  lifetimeNectar?: number; // New field
  title: string;
  corrects: number;
  wins: number;
  username: string; // Added username
  avatarUrl?: string; // Added avatarUrl
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSupabaseProfile = async (uid: string, firebaseData: any) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();

    let currentNectar = 0;
    let lifetimeNectar = 0;
    let finalUsername = firebaseData.username || "Player"; // Fallback

    if (profile) {
      currentNectar = profile.current_nectar;
      lifetimeNectar = profile.lifetime_nectar;
      setUserData((prev) => ({
        ...prev!,
        stars: currentNectar,
        nectar: currentNectar,
        username: profile.username || finalUsername,
        title: profile.title || "Newbee",
        corrects: profile.corrects || 0,
        wins: profile.wins || 0,
        lifetimeNectar: lifetimeNectar,
        avatarUrl: profile.avatar_url,
      }));
    }
  };

  const refreshUser = async () => {
    if (user) {
      // We need latest supabase data, we can keep firebase parts as is from state
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.uid)
        .single();

      if (profile) {
        setUserData((prev) =>
          prev
            ? {
                ...prev,
                stars: profile.current_nectar,
                nectar: profile.current_nectar,
                lifetimeNectar: profile.lifetime_nectar,
                avatarUrl: profile.avatar_url,
                // We might want to sync inventory here too if we verify it in UI later
              }
            : null,
        );
      }
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = ref(db, `users/${currentUser.uid}`);

        const unsubscribeData = onValue(
          userRef,
          (snapshot: any) => {
            const data = snapshot.val();
            if (data) {
              // Legacy Account Auto-Repair
              let finalUsername = data.username;
              if (!finalUsername) {
                finalUsername =
                  currentUser.displayName ||
                  (currentUser.email
                    ? currentUser.email.split("@")[0]
                    : "Player");
                // Async update to fix DB
                update(userRef, { username: finalUsername }).catch((err: any) =>
                  console.warn("Auto-fix username failed", err),
                );
              }

              // SUPABASE MIGRATION & SYNC
              // We check if this user exists in Supabase. If not, we migrate their stars.
              supabase
                .from("profiles")
                .select("*")
                .eq("id", currentUser.uid)
                .single()
                .then(async ({ data: profile, error }) => {
                  let currentNectar = 0;
                  let lifetimeNectar = 0;

                  if (profile) {
                    // User exists in Supabase - use that data
                    currentNectar = profile.current_nectar;
                    lifetimeNectar = profile.lifetime_nectar;

                    // Force sync latest stats from Firebase to Supabase (if they differ significantly)
                    // This ensures the leaderboard stays up to date with gameplay
                    if (
                      profile.corrects !== data.corrects ||
                      profile.wins !== data.wins
                    ) {
                      supabase
                        .from("profiles")
                        .update({
                          corrects: data.corrects || 0,
                          wins: data.wins || 0,
                        })
                        .eq("id", currentUser.uid)
                        .then(({ error }) => {
                          if (error)
                            console.error("Failed to sync stats", error);
                          else console.log("Synced stats to Supabase");
                        });
                    }
                  } else {
                    // Start Migration
                    console.log("Migrating user to Supabase...");
                    const oldStars = data.stars || 0;
                    const { error: insertError } = await supabase
                      .from("profiles")
                      .insert({
                        id: currentUser.uid,
                        username: finalUsername,
                        current_nectar: oldStars,
                        lifetime_nectar: oldStars,
                        inventory: [],
                        corrects: data.corrects || 0,
                        wins: data.wins || 0,
                      });

                    if (!insertError) {
                      currentNectar = oldStars;
                      lifetimeNectar = oldStars;
                      console.log("Migration successful!");
                    } else {
                      console.error("Migration failed:", insertError);
                      // Fallback to local stars
                      currentNectar = oldStars;
                      lifetimeNectar = oldStars;
                    }
                  }

                  setUserData({
                    stars: currentNectar, // Map Nectar to Stars for backward compatibility
                    nectar: currentNectar,
                    lifetimeNectar: lifetimeNectar,
                    title: data.title || profile?.title || "Newbee",
                    corrects: data.corrects || 0,
                    wins: data.wins || 0,
                    username: profile?.username || finalUsername,
                    avatarUrl: profile?.avatar_url,
                  });
                });
            } else {
              // Initialize New User Data
              const newName =
                currentUser.displayName ||
                (currentUser.email
                  ? currentUser.email.split("@")[0]
                  : "Player");

              // Create Supabase Profile for new user
              supabase
                .from("profiles")
                .insert({
                  id: currentUser.uid,
                  username: newName,
                  current_nectar: 0,
                  lifetime_nectar: 0,
                  inventory: [],
                })
                .then(() => console.log("New user initialized in Supabase"));

              setUserData({
                stars: 0,
                nectar: 0,
                lifetimeNectar: 0,
                title: "Newbee",
                corrects: 0,
                wins: 0,
                username: newName,
              });
            }
          },
          (error: any) => {
            console.warn("Auth Data Fetch Error:", error);
            // Fallback
            setUserData({
              stars: 0,
              nectar: 0,
              lifetimeNectar: 0,
              title: "Newbee",
              corrects: 0,
              wins: 0,
              username: currentUser.displayName || "Player",
            });
          },
        );

        setLoading(false);
        return () => {
          off(userRef);
        };
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
