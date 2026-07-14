"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Layers, 
  Users, 
  BookOpen, 
  ClipboardCheck, 
  TrendingUp,
  LogOut,
  UserCheck
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const menuItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Kelas",
      href: "/kelas",
      icon: Layers,
    },
    {
      name: "Siswa",
      href: "/siswa",
      icon: Users,
    },
    {
      name: "Mata Pelajaran",
      href: "/mapel",
      icon: BookOpen,
    },
    {
      name: "Input Nilai & Absen",
      href: "/input-nilai",
      icon: ClipboardCheck,
    },
  ];

  return (
    <aside className="w-64 bg-[#0F172A] border-r border-[#1E293B] flex flex-col min-h-screen shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#1E293B] flex items-center gap-3">
        <div className="p-2 bg-indigo-600 rounded-lg text-white">
          <TrendingUp size={20} />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-wide leading-none">Raporku</h1>
          <span className="text-xs text-indigo-400 font-medium">Eduscore Dashboard</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p className="px-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Menu Utama
        </p>
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500"
                  : "text-zinc-400 hover:bg-[#1E293B] hover:text-zinc-100"
              }`}
            >
              <Icon
                size={18}
                className={`transition-colors duration-200 ${
                  isActive ? "text-indigo-400" : "text-zinc-400 group-hover:text-zinc-100"
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout Button */}
      {user && (
        <div className="p-4 border-t border-[#1E293B] bg-[#0A0F1D]/50 space-y-3">
          <div className="flex items-center gap-3">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.full_name || "User Avatar"}
                className="w-8 h-8 rounded-full border border-indigo-500/20 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <UserCheck size={14} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate leading-none">
                {user.user_metadata?.full_name || user.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-zinc-500 truncate mt-1">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut size={12} />
            <span>Keluar Sesi</span>
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="py-3 text-center border-t border-[#1E293B]/60 bg-[#090D18]/80 text-[10px] text-zinc-600">
        Raporku System • © 2026
      </div>
    </aside>
  );
}
