"use client";

import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth/");

  if (isAuthPage) {
    return <div className="w-full min-h-screen flex flex-col">{children}</div>;
  }

  return (
    <div className="min-h-screen w-full flex bg-[#0B0F19] text-zinc-100 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
