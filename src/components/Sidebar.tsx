"use client";

import { useState } from "react";
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
  UserCheck,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSignOutClick = () => {
    setShowLogoutConfirm(true);
  };

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
    <aside className={`bg-strong-blue border-r border-strong-blue/30 flex flex-col min-h-screen shrink-0 text-white transition-all duration-300 ease-in-out ${isCollapsed ? "w-[76px]" : "w-64"}`}>
      {/* Brand Header */}
      <div className={`p-4 border-b border-white/10 flex ${isCollapsed ? "flex-col justify-center" : "flex-row justify-between"} items-center gap-3`}>
        <div className="flex items-center gap-3 min-w-0">
          <img src="/Logo.svg" alt="Raporku Logo" className="w-8 h-8 object-contain shrink-0" />
          {!isCollapsed && (
            <div className="truncate">
              <h1 className="font-extrabold text-lg text-white tracking-wide leading-none">Raporku</h1>
              <span className="text-[10px] text-mustard font-bold uppercase tracking-wider">E-Rapor Dashboard</span>
            </div>
          )}
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
          title={isCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {!isCollapsed && (
          <p className="px-3 text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-2">
            Menu Utama
          </p>
        )}
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center rounded-lg text-sm font-medium transition-all duration-200 group ${
                isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"
              } ${
                isActive
                  ? isCollapsed 
                    ? "bg-mustard/15 text-mustard"
                    : "bg-mustard/15 text-mustard border-l-4 border-mustard"
                  : "text-zinc-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon
                size={18}
                className={`transition-colors duration-200 shrink-0 ${
                  isActive ? "text-mustard" : "text-zinc-200 group-hover:text-white"
                }`}
              />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout Button */}
      {user && (
        <div className={`p-4 border-t border-white/10 bg-[#001D6E] flex flex-col ${isCollapsed ? "items-center" : ""} gap-3`}>
          <div className="flex items-center gap-3 w-full">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.full_name || "User Avatar"}
                className="w-8 h-8 rounded-full border border-mustard/30 object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-mustard/20 text-mustard border border-mustard/30 flex items-center justify-center shrink-0">
                <UserCheck size={14} />
              </div>
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate leading-none">
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </p>
                <p className="text-[10px] text-zinc-300 truncate mt-1">
                  {user.email}
                </p>
              </div>
            )}
          </div>
          {isCollapsed ? (
            <button
              onClick={handleSignOutClick}
              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white rounded-lg transition-all cursor-pointer border border-red-500/30 shrink-0"
              title="Keluar Sesi"
            >
              <LogOut size={16} />
            </button>
          ) : (
            <button
              onClick={handleSignOutClick}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-red-500/30"
            >
              <LogOut size={12} />
              <span>Keluar Sesi</span>
            </button>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="py-3 text-center border-t border-white/10 bg-[#001754] text-[10px] text-zinc-300 truncate">
        {isCollapsed ? "R • '26" : "Raporku System • © 2026"}
      </div>

      {/* Modern Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print text-zinc-900">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-5 animate-fade-in relative overflow-hidden border border-zinc-200">
            {/* Top gradient border matching color palette */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-mustard via-strong-blue to-mustard"></div>
            
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              <div className="p-4 bg-red-50 text-red-500 rounded-full">
                <LogOut size={28} />
              </div>
              <h3 className="font-black text-strong-blue text-lg tracking-tight">Konfirmasi Keluar</h3>
              <p className="text-xs text-zinc-500 leading-relaxed font-semibold max-w-[280px]">
                Apakah Anda yakin ingin mengakhiri sesi aktif Anda di Raporku? Anda harus masuk kembali untuk mengelola data akademik.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  signOut();
                }}
                className="flex-1 py-2.5 bg-strong-blue hover:bg-[#001D6E] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-strong-blue/10 cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
