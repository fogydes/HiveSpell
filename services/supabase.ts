/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";

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

export const supabase = createClient(url, key);
