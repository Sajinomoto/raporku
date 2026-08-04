"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Factory Supabase client untuk komponen client yang butuh instance terpisah.
 * Sebagian besar kode cukup memakai singleton `supabase` dari "@/lib/supabase".
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
