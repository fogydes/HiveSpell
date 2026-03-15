import { supabase } from "./supabase";
import { getTitle } from "./gameService";
import type { ThemeId } from "../context/SettingsContext";

interface ProfileRow {
  id: string;
  username?: string | null;
  current_nectar?: number | null;
  lifetime_nectar?: number | null;
  inventory?: string[] | null;
  corrects?: number | null;
  wins?: number | null;
  title?: string | null;
  equipped_theme?: ThemeId | null;
  equipped_cursor?: string | null;
  equipped_badge?: string | null;
}

const loadProfile = async (userId: string): Promise<ProfileRow | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const saveProfile = async (
  userId: string,
  fallbackUsername: string,
  updates: Partial<ProfileRow>,
): Promise<void> => {
  const profile = await loadProfile(userId);

  const payload = {
    id: userId,
    username: profile?.username ?? fallbackUsername,
    current_nectar: profile?.current_nectar ?? 0,
    lifetime_nectar: profile?.lifetime_nectar ?? 0,
    inventory: profile?.inventory ?? [],
    corrects: profile?.corrects ?? 0,
    wins: profile?.wins ?? 0,
    title: profile?.title ?? "Newbee",
    equipped_theme: profile?.equipped_theme ?? "hive",
    equipped_cursor: profile?.equipped_cursor ?? null,
    equipped_badge: profile?.equipped_badge ?? null,
    ...updates,
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw error;
  }
};

const isMissingRpcError = (error: any) =>
  error?.code === "PGRST202" || error?.code === "42883";

export const awardProfileWin = async (
  userId: string,
  fallbackUsername: string,
) => {
  const { error } = await supabase.rpc("award_profile_win", {
    p_user_id: userId,
    p_username: fallbackUsername,
  });

  if (!error) {
    return;
  }

  if (!isMissingRpcError(error)) {
    throw error;
  }

  const profile = await loadProfile(userId);
  const nextWins = (profile?.wins ?? 0) + 1;
  const nextCorrects = profile?.corrects ?? 0;

  await saveProfile(userId, fallbackUsername, {
    wins: nextWins,
    title: getTitle(nextCorrects, nextWins),
  });
};

export const applyCorrectAnswerReward = async (
  userId: string,
  fallbackUsername: string,
  nectarToAdd: number,
) => {
  const safeNectarToAdd = Math.max(0, nectarToAdd);
  const { error } = await supabase.rpc("apply_correct_answer_reward", {
    p_user_id: userId,
    p_username: fallbackUsername,
    p_nectar_to_add: safeNectarToAdd,
  });

  if (!error) {
    return;
  }

  if (!isMissingRpcError(error)) {
    throw error;
  }

  const profile = await loadProfile(userId);
  const nextCorrects = (profile?.corrects ?? 0) + 1;
  const nextWins = profile?.wins ?? 0;
  const nextCurrentNectar = (profile?.current_nectar ?? 0) + safeNectarToAdd;
  const nextLifetimeNectar = (profile?.lifetime_nectar ?? 0) + safeNectarToAdd;

  await saveProfile(userId, fallbackUsername, {
    corrects: nextCorrects,
    current_nectar: nextCurrentNectar,
    lifetime_nectar: nextLifetimeNectar,
    title: getTitle(nextCorrects, nextWins),
  });
};

export const setProfileTheme = async (
  userId: string,
  fallbackUsername: string,
  theme: ThemeId,
) => {
  try {
    await saveProfile(userId, fallbackUsername, {
      equipped_theme: theme,
    });
    return true;
  } catch (error: any) {
    if (error?.code === "42703") {
      console.warn("profiles.equipped_theme is missing; using local theme only");
      return false;
    }

    throw error;
  }
};

export const setProfileCustomizationSlot = async (
  userId: string,
  fallbackUsername: string,
  slot: "equipped_cursor" | "equipped_badge",
  value: string | null,
) => {
  try {
    await saveProfile(userId, fallbackUsername, {
      [slot]: value,
    });
    return true;
  } catch (error: any) {
    if (error?.code === "42703") {
      console.warn(`${slot} is missing on profiles; using local fallback only`);
      return false;
    }

    throw error;
  }
};
