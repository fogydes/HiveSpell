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

export const supabase = createClient(supabaseUrl || "", supabaseKey || "");
