/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";
import { auth } from "../firebase";

// These should be set in .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Supabase URL or Key missing. Database features will be limited.",
  );
}

const url = supabaseUrl || "https://placeholder.supabase.co";
const key = supabaseKey || "placeholder-key";

export const isSupabaseConfigured = url !== "https://placeholder.supabase.co";

export const supabase = createClient(url, key, {
  accessToken: async () => {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    return null;
  },
});

