"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === "/login" || pathname.startsWith("/auth/");
    
    if (!user && !isAuthPage) {
      // Not logged in -> redirect to login
      router.push("/login");
    } else if (user && pathname === "/login") {
      // Logged in trying to access login -> redirect to home
      router.push("/");
    }
  }, [user, loading, pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth/");

  // Loading state with a premium animated splash screen
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0F19] flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"></div>
          <Loader2 className="animate-spin text-indigo-500 relative" size={40} />
        </div>
        <p className="text-xs text-zinc-500 tracking-wider uppercase font-semibold">Mengamankan Sesi...</p>
      </div>
    );
  }

  // If not logged in and not on login page, prevent flash of content during redirect
  if (!user && !isAuthPage) {
    return (
      <div className="min-h-screen w-full bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={24} />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
