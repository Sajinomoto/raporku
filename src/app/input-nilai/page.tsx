"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InputNilaiPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#E5E8EF] text-zinc-900">
      <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-lg max-w-sm text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">!</div>
        <h3 className="font-bold text-zinc-800 text-base">Halaman Tidak Tersedia</h3>
        <p className="text-xs text-zinc-500 font-medium">Halaman ini telah dinonaktifkan sementara. Anda akan dialihkan ke halaman dasbor...</p>
      </div>
    </div>
  );
}
