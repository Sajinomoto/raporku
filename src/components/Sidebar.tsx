"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Layers, 
  Users, 
  BookOpen, 
  ClipboardCheck, 
  TrendingUp 
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

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

      {/* Footer Info */}
      <div className="p-4 border-t border-[#1E293B] bg-[#0A0F1D]/50 text-center">
        <p className="text-[11px] text-zinc-500">Raporku Capstone Project</p>
        <p className="text-[9px] text-zinc-600 mt-0.5">© 2026 Eduscore System</p>
      </div>
    </aside>
  );
}
