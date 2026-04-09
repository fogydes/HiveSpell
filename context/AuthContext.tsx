import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { ref, onValue, off, update } from "firebase/database";
import { auth, db } from "../firebase";

import { supabase } from "../services/supabase";
import type { ThemeId } from "../data/themePackages";

export interface UserData {
  nectar: number;
  lifetimeNectar: number;
  title: string;
  corrects: number;
  wins: number;
  inventory: string[];
  equippedTheme?: ThemeId;
  equippedCursor?: string | null;
  equippedBadge?: string | null;
  username: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
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

  const buildUserData = ({
    profile,
    firebaseData,
    fallbackUsername,
  }: {
    profile?: any;
    firebaseData?: any;
    fallbackUsername: string;
  }): UserData => {
    const hasEquippedTheme = Object.prototype.hasOwnProperty.call(
      profile ?? {},
      "equipped_theme",
    );
    const hasEquippedCursor = Object.prototype.hasOwnProperty.call(
      profile ?? {},
      "equipped_cursor",
    );
    const hasEquippedBadge = Object.prototype.hasOwnProperty.call(
      profile ?? {},
      "equipped_badge",
    );

    return {
      nectar: profile?.current_nectar ?? 0,
      lifetimeNectar: profile?.lifetime_nectar ?? 0,
      title: profile?.title ?? "Newbee",
      corrects: profile?.corrects ?? 0,
      wins: profile?.wins ?? 0,
      inventory: profile?.inventory ?? [],
      equippedTheme: hasEquippedTheme ? profile?.equipped_theme : undefined,
      equippedCursor: hasEquippedCursor ? profile?.equipped_cursor : undefined,
      equippedBadge: hasEquippedBadge ? profile?.equipped_badge : undefined,
      username: profile?.username ?? firebaseData?.username ?? fallbackUsername,
      avatarUrl: profile?.avatar_url,
    };
  };

  const refreshUser = async () => {
    if (user) {
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
                username: profile.username ?? prev.username,
                nectar: profile.current_nectar,
                lifetimeNectar: profile.lifetime_nectar,
                title: profile.title ?? prev.title,
                corrects: profile.corrects ?? prev.corrects,
                wins: profile.wins ?? prev.wins,
                inventory: profile.inventory ?? prev.inventory,
                equippedTheme: profile.equipped_theme ?? prev.equippedTheme,
                equippedCursor:
                  Object.prototype.hasOwnProperty.call(
                    profile,
                    "equipped_cursor",
                  )
                    ? profile.equipped_cursor
                    : prev.equippedCursor,
                equippedBadge: Object.prototype.hasOwnProperty.call(
                  profile,
                  "equipped_badge",
                )
                  ? profile.equipped_badge
                  : prev.equippedBadge,
                avatarUrl: profile.avatar_url,
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
                .then(async ({ data: profile }) => {
                  let effectiveProfile = profile;

                  if (profile) {
                    // Transitional backfill only: populate missing profile fields from Firebase legacy data.
                    const profileUpdates: Record<string, unknown> = {};

                    if (profile.corrects == null && data.corrects != null) {
                      profileUpdates.corrects = data.corrects;
                    }

                    if (profile.wins == null && data.wins != null) {
                      profileUpdates.wins = data.wins;
                    }

                    if (profile.current_nectar == null && data.stars != null) {
                      profileUpdates.current_nectar = data.stars;
                    }

                    if (
                      profile.lifetime_nectar == null &&
                      data.stars != null
                    ) {
                      profileUpdates.lifetime_nectar = data.stars;
                    }

                    if (!profile.title && data.title) {
                      profileUpdates.title = data.title;
                    }

                    if (!profile.username && finalUsername) {
                      profileUpdates.username = finalUsername;
                    }

                    if (Object.keys(profileUpdates).length > 0) {
                      const { error: syncError } = await supabase
                        .from("profiles")
                        .update(profileUpdates)
                        .eq("id", currentUser.uid);

                      if (syncError) {
                        console.error("Failed to sync profile stats", syncError);
                      } else {
                        effectiveProfile = {
                          ...profile,
                          ...profileUpdates,
                        };
                      }
                    }
                  } else {
                    // Start migration from Firebase legacy profile data.
                    console.log("Migrating user to Supabase...");
                    const oldStars = data.stars || 0;
                    const newProfile = {
                      id: currentUser.uid,
                      username: finalUsername,
                      current_nectar: oldStars,
                      lifetime_nectar: oldStars,
                      inventory: [],
                      equipped_theme: "hive",
                      equipped_cursor: null,
                      equipped_badge: null,
                      corrects: data.corrects || 0,
                      wins: data.wins || 0,
                      title: data.title || "Newbee",
                    };
                    const { error: insertError } = await supabase
                      .from("profiles")
                      .insert(newProfile);

                    if (!insertError) {
                      effectiveProfile = newProfile;
                      console.log("Migration successful!");
                    } else {
                      console.error("Migration failed:", insertError);
                    }
                  }

                  setUserData(
                    buildUserData({
                      profile: effectiveProfile,
                      firebaseData: data,
                      fallbackUsername: finalUsername,
                    }),
                  );
                });
            } else {
              // Initialize a new profile if Firebase has no legacy user document.
              const newName =
                currentUser.displayName ||
                (currentUser.email
                  ? currentUser.email.split("@")[0]
                  : "Player");

              const newProfile = {
                id: currentUser.uid,
                username: newName,
                current_nectar: 0,
                lifetime_nectar: 0,
                inventory: [],
                equipped_theme: "hive",
                equipped_cursor: null,
                equipped_badge: null,
                corrects: 0,
                wins: 0,
                title: "Newbee",
              };

              supabase
                .from("profiles")
                .insert(newProfile)
                .then(() => console.log("New user initialized in Supabase"));

              setUserData(
                buildUserData({
                  profile: newProfile,
                  fallbackUsername: newName,
                }),
              );
            }
          },
          (error: any) => {
            console.warn("Auth Data Fetch Error:", error);
            setUserData(
              buildUserData({
                fallbackUsername: currentUser.displayName || "Player",
              }),
            );
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
