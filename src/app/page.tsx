import { supabase } from "@/lib/supabase";
import { 
  Users, 
  Layers, 
  BookOpen, 
  Award, 
  PlusCircle, 
  GraduationCap,
  ArrowRight,
  ClipboardCheck
} from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function Home() {
  let studentCount = 0;
  let classCount = 0;
  let subjectCount = 0;
  let averageScore = "0.00";

  try {
    const { count } = await supabase
      .from("siswa")
      .select("*", { count: "exact", head: true });
    studentCount = count || 0;
  } catch (err) {
    console.error("Error fetching student count:", err);
  }

  try {
    const { count } = await supabase
      .from("kelas")
      .select("*", { count: "exact", head: true });
    classCount = count || 0;
  } catch (err) {
    console.error("Error fetching class count:", err);
  }

  try {
    const { count } = await supabase
      .from("mata_pelajaran")
      .select("*", { count: "exact", head: true });
    subjectCount = count || 0;
  } catch (err) {
    console.error("Error fetching subject count:", err);
  }

  try {
    const { data: nilaiData } = await supabase
      .from("nilai")
      .select("skor");
    if (nilaiData && nilaiData.length > 0) {
      averageScore = (nilaiData.reduce((acc, curr) => acc + Number(curr.skor), 0) / nilaiData.length).toFixed(2);
    }
  } catch (err) {
    console.error("Error fetching average score:", err);
  }


  const stats = [
    {
      name: "Total Siswa",
      value: studentCount || 0,
      icon: Users,
      color: "from-blue-600 to-indigo-600",
      textColor: "text-blue-400",
    },
    {
      name: "Total Kelas",
      value: classCount || 0,
      icon: Layers,
      color: "from-emerald-600 to-teal-600",
      textColor: "text-emerald-400",
    },
    {
      name: "Total Mata Pelajaran",
      value: subjectCount || 0,
      icon: BookOpen,
      color: "from-amber-600 to-orange-600",
      textColor: "text-amber-400",
    },
    {
      name: "Rata-Rata Nilai",
      value: averageScore,
      icon: Award,
      color: "from-fuchsia-600 to-pink-600",
      textColor: "text-fuchsia-400",
    },
  ];

  return (
    <div className="p-8 flex-1 flex flex-col space-y-8 bg-[#0B0F19]">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/50 via-slate-900 to-indigo-950/30 border border-indigo-500/20 p-8">
        <div className="absolute right-0 top-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="max-w-xl space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <GraduationCap size={14} /> Portal Guru & Wali Kelas
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Selamat Datang di Portal Raporku
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Kelola data kelas, siswa, mata pelajaran, serta pantau dan rekap perkembangan nilai siswa secara instan menggunakan dashboard berbasis analitik.
          </p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i} 
              className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-6 flex items-center justify-between hover:border-zinc-700 transition-all duration-300 group"
            >
              <div className="space-y-1">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{stat.name}</span>
                <p className="text-3xl font-black text-white">{stat.value}</p>
              </div>
              <div className={`p-3.5 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                <Icon size={24} className="group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white tracking-tight">Aksi Cepat</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link 
            href="/kelas" 
            className="p-5 bg-[#0F172A] border border-[#1E293B] rounded-xl hover:border-indigo-500/40 hover:bg-[#1E293B]/50 transition-all duration-300 group flex flex-col justify-between h-36"
          >
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg w-fit">
              <Layers size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">Kelola Kelas</h4>
              <p className="text-xs text-zinc-500 mt-1">Tambah, edit, dan atur daftar siswa per kelas.</p>
            </div>
          </Link>

          <Link 
            href="/siswa" 
            className="p-5 bg-[#0F172A] border border-[#1E293B] rounded-xl hover:border-emerald-500/40 hover:bg-[#1E293B]/50 transition-all duration-300 group flex flex-col justify-between h-36"
          >
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg w-fit">
              <Users size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">Kelola Siswa</h4>
              <p className="text-xs text-zinc-500 mt-1">Daftarkan siswa baru dan unggah foto profil.</p>
            </div>
          </Link>

          <Link 
            href="/mapel" 
            className="p-5 bg-[#0F172A] border border-[#1E293B] rounded-xl hover:border-amber-500/40 hover:bg-[#1E293B]/50 transition-all duration-300 group flex flex-col justify-between h-36"
          >
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg w-fit">
              <BookOpen size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">Kurikulum Mapel</h4>
              <p className="text-xs text-zinc-500 mt-1">Konfigurasi mata pelajaran wajib & peminatan.</p>
            </div>
          </Link>

          <Link 
            href="/input-nilai" 
            className="p-5 bg-[#0F172A] border border-[#1E293B] rounded-xl hover:border-fuchsia-500/40 hover:bg-[#1E293B]/50 transition-all duration-300 group flex flex-col justify-between h-36"
          >
            <div className="p-2.5 bg-fuchsia-500/10 text-fuchsia-400 rounded-lg w-fit">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm group-hover:text-fuchsia-400 transition-colors">Input Nilai & Absen</h4>
              <p className="text-xs text-zinc-500 mt-1">Masukkan nilai rapor dan kehadiran siswa.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
