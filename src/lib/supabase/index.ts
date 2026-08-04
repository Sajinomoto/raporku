import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials missing. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local"
  );
}

/**
 * Singleton Supabase client untuk komponen client.
 * Sesi disimpan di cookie (document.cookie) via @supabase/ssr,
 * sehingga proxy.ts di server bisa membaca & menyegarkan sesi yang sama.
 * Hanya impor dari komponen "use client" / kode browser.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
