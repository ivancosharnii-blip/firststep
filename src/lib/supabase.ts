import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) {
  throw new Error(
    "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local at the project root, then restart `npm run dev`."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);