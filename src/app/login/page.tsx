"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { TrendingUp, ShieldAlert, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("OAuth error:", err);
      setErrorMsg(err.message || "Gagal masuk menggunakan Google.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-cool-gray flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-strong-blue/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-mustard/15 rounded-full blur-3xl -z-10"></div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-8 shadow-2xl space-y-8 relative">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-mustard to-transparent"></div>

        {/* Branding header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <img src="/Logo.svg" alt="Raporku Logo" className="w-16 h-16 object-contain" />
          <h1 className="text-2xl font-black text-strong-blue tracking-wide mt-3">Raporku</h1>
          <p className="text-xs text-zinc-500 max-w-[280px] font-bold">
            Sistem e-rapor dashboard interaktif
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-xs flex items-start gap-2.5">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sign In Action Button */}
        <div className="space-y-4 pt-2">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <Loader2 className="animate-spin text-zinc-900" size={18} />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.822-6.3-6.3s2.822-6.3 6.3-6.3c1.554 0 2.978.568 4.093 1.508l3.12-3.12C19.14 2.378 15.932 1 12.24 1 6.059 1 1.07 5.99 1.07 12.18s4.99 11.18 11.17 11.18c6.438 0 11.395-4.52 11.395-11.18 0-.687-.06-1.354-.172-1.9H12.24z"
                />
              </svg>
            )}
            <span>{loading ? "Menyambungkan..." : "Masuk dengan Google"}</span>
          </button>

          <p className="text-[10px] text-zinc-400 text-center font-medium">
            Gunakan akun email Google terdaftar Anda untuk mengakses portal administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
