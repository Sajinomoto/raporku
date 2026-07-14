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
    const [studentsRes, classesRes, subjectsRes, gradesRes] = await Promise.all([
      supabase.from("siswa").select("*", { count: "exact", head: true }),
      supabase.from("kelas").select("*", { count: "exact", head: true }),
      supabase.from("mata_pelajaran").select("*", { count: "exact", head: true }),
      supabase.from("nilai").select("skor")
    ]);

    studentCount = studentsRes.count || 0;
    classCount = classesRes.count || 0;
    subjectCount = subjectsRes.count || 0;

    const nilaiData = gradesRes.data;
    if (nilaiData && nilaiData.length > 0) {
      averageScore = (nilaiData.reduce((acc, curr) => acc + Number(curr.skor), 0) / nilaiData.length).toFixed(2);
    }
  } catch (err) {
    console.error("Error fetching dashboard statistics:", err);
  }


  const stats = [
    {
      name: "Total Siswa",
      value: studentCount || 0,
      icon: Users,
      iconClass: "bg-gradient-to-br from-strong-blue to-[#001D6E] text-white shadow-md shadow-strong-blue/15",
    },
    {
      name: "Total Kelas",
      value: classCount || 0,
      icon: Layers,
      iconClass: "bg-gradient-to-br from-mustard to-[#E6A600] text-strong-blue shadow-md shadow-mustard/25",
    },
    {
      name: "Total Mata Pelajaran",
      value: subjectCount || 0,
      icon: BookOpen,
      iconClass: "bg-gradient-to-br from-strong-blue to-[#001D6E] text-white shadow-md shadow-strong-blue/15",
    },
    {
      name: "Rata-Rata Nilai",
      value: averageScore,
      icon: Award,
      iconClass: "bg-gradient-to-br from-mustard to-[#E6A600] text-strong-blue shadow-md shadow-mustard/25",
    },
  ];

  return (
    <div className="p-8 flex-1 flex flex-col space-y-8 bg-cool-gray text-zinc-900">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i} 
              className="bg-white border border-zinc-200 rounded-xl p-6 flex items-center justify-between hover:border-strong-blue/35 transition-all duration-300 group shadow-xs hover:shadow-md"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{stat.name}</span>
                <p className="text-3xl font-black text-strong-blue">{stat.value}</p>
              </div>
              <div className={`p-3.5 rounded-xl ${stat.iconClass}`}>
                <Icon size={24} className="group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-strong-blue tracking-tight">Shortcut</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link 
            href="/kelas" 
            className="p-5 bg-white border border-zinc-200 rounded-xl hover:border-strong-blue/60 hover:bg-zinc-50/80 hover:-translate-y-1 active:scale-95 active:translate-y-0.5 transition-all duration-150 group flex flex-col justify-between h-36 shadow-sm hover:shadow-lg cursor-pointer"
          >
            <div className="p-2.5 bg-strong-blue/10 text-strong-blue rounded-lg w-fit">
              <Layers size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-zinc-900 text-sm group-hover:text-strong-blue transition-colors">Kelola Kelas</h4>
              <p className="text-xs text-zinc-500 mt-1 font-medium">Tambah, edit, dan atur daftar siswa per kelas.</p>
            </div>
          </Link>

          <Link 
            href="/siswa" 
            className="p-5 bg-white border border-zinc-200 rounded-xl hover:border-mustard/60 hover:bg-zinc-50/80 hover:-translate-y-1 active:scale-95 active:translate-y-0.5 transition-all duration-150 group flex flex-col justify-between h-36 shadow-sm hover:shadow-lg cursor-pointer"
          >
            <div className="p-2.5 bg-mustard/20 text-[#A67800] rounded-lg w-fit">
              <Users size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-zinc-900 text-sm group-hover:text-[#A67800] transition-colors">Kelola Siswa</h4>
              <p className="text-xs text-zinc-500 mt-1 font-medium">Daftarkan siswa baru dan unggah foto profil.</p>
            </div>
          </Link>

          <Link 
            href="/mapel" 
            className="p-5 bg-white border border-zinc-200 rounded-xl hover:border-strong-blue/60 hover:bg-zinc-50/80 hover:-translate-y-1 active:scale-95 active:translate-y-0.5 transition-all duration-150 group flex flex-col justify-between h-36 shadow-sm hover:shadow-lg cursor-pointer"
          >
            <div className="p-2.5 bg-strong-blue/10 text-strong-blue rounded-lg w-fit">
              <BookOpen size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-zinc-900 text-sm group-hover:text-strong-blue transition-colors">Kurikulum Mapel</h4>
              <p className="text-xs text-zinc-500 mt-1 font-medium">Konfigurasi mata pelajaran wajib & peminatan.</p>
            </div>
          </Link>

          <Link 
            href="/input-nilai" 
            className="p-5 bg-white border border-zinc-200 rounded-xl hover:border-mustard/60 hover:bg-zinc-50/80 hover:-translate-y-1 active:scale-95 active:translate-y-0.5 transition-all duration-150 group flex flex-col justify-between h-36 shadow-sm hover:shadow-lg cursor-pointer"
          >
            <div className="p-2.5 bg-mustard/20 text-[#A67800] rounded-lg w-fit">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-zinc-900 text-sm group-hover:text-[#A67800] transition-colors">Input Nilai & Absen</h4>
              <p className="text-xs text-zinc-500 mt-1 font-medium">Masukkan nilai rapor dan kehadiran siswa.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
