"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // check session directly
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/");
      } else {
        // Listen for session completion
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            subscription.unsubscribe();
            router.push("/");
          }
        });

        // Set a 5-second fallback timeout
        const timeout = setTimeout(() => {
          subscription.unsubscribe();
          router.push("/login");
        }, 5000);

        return () => {
          clearTimeout(timeout);
          subscription.unsubscribe();
        };
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-cool-gray flex flex-col items-center justify-center space-y-4 text-zinc-800">
      <div className="relative">
        <div className="absolute inset-0 bg-strong-blue/10 blur-xl rounded-full"></div>
        <Loader2 className="animate-spin text-strong-blue relative" size={36} />
      </div>
      <p className="text-xs text-zinc-600 font-bold">Sedang memverifikasi login Anda...</p>
    </div>
  );
}
