"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Layers, 
  Plus, 
  Edit3, 
  Trash2, 
  Users, 
  BookOpen,
  ArrowLeft,
  X,
  UserPlus,
  UserMinus,
  TrendingUp,
  Award,
  CalendarDays,
  FileSpreadsheet
} from "lucide-react";

interface Kelas {
  id: string;
  nama_kelas: string;
  tahun_ajaran: string;
  deskripsi: string | null;
  created_at: string;
}

interface Siswa {
  id: string;
  nama_lengkap: string;
  nis: string;
  kelas_id: string | null;
  foto_url: string | null;
}

interface SiswaWithStats extends Siswa {
  averageScore?: number;
  attendanceRate?: number;
}

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = use(params);
  const router = useRouter();

  const [kelas, setKelas] = useState<Kelas | null>(null);
  const [students, setStudents] = useState<SiswaWithStats[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states (for editing this class)
  const [showForm, setShowForm] = useState(false);
  const [formNama, setFormNama] = useState("");
  const [formTahun, setFormTahun] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");

  // Statistics states
  const [classAverage, setClassAverage] = useState<number>(0);
  const [classAttendance, setClassAttendance] = useState<number>(0);

  useEffect(() => {
    if (classId) {
      fetchClassData();
      fetchClassDetails();
    }
  }, [classId]);

  const fetchClassData = async () => {
    try {
      const { data, error } = await supabase
        .from("kelas")
        .select("*")
        .eq("id", classId)
        .single();

      if (error) throw error;
      setKelas(data);
      setFormNama(data.nama_kelas);
      setFormTahun(data.tahun_ajaran);
      setFormDeskripsi(data.deskripsi || "");
    } catch (err) {
      console.error("Error fetching class data:", err);
      router.push("/kelas");
    }
  };

  const fetchClassDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch students in this class
      const { data: studentsData, error: studentsError } = await supabase
        .from("siswa")
        .select("*")
        .eq("kelas_id", classId);

      if (studentsError) throw studentsError;

      // 2. Fetch all grades for statistical calculations
      const studentIds = (studentsData || []).map((s) => s.id);
      
      let studentsWithStats: SiswaWithStats[] = [...(studentsData || [])];
      let avgScore = 0;
      let avgAttendance = 0;

      if (studentIds.length > 0) {
        // Fetch grades & attendance for these students in parallel
        const [gradesRes, attendanceRes] = await Promise.all([
          supabase
            .from("nilai")
            .select("siswa_id, skor")
            .in("siswa_id", studentIds),
          supabase
            .from("kehadiran")
            .select("siswa_id, hadir, sakit, izin, alpha, total_sesi")
            .in("siswa_id", studentIds)
        ]);

        const gradesData = gradesRes.data || [];
        const attendanceData = attendanceRes.data || [];

        // Map grades & attendance to students
        studentsWithStats = (studentsData || []).map((student) => {
          const studentGrades = (gradesData || []).filter((g) => g.siswa_id === student.id);
          const studentAttendance = (attendanceData || []).find((a) => a.siswa_id === student.id);

          const totalGrades = studentGrades.reduce((sum, item) => sum + Number(item.skor), 0);
          const averageScore = studentGrades.length > 0 ? totalGrades / studentGrades.length : 0;

          let attendanceRate = 100;
          if (studentAttendance && studentAttendance.total_sesi > 0) {
            attendanceRate = (studentAttendance.hadir / studentAttendance.total_sesi) * 100;
          }

          return {
            ...student,
            averageScore: Math.round(averageScore * 100) / 100,
            attendanceRate: Math.round(attendanceRate * 100) / 100,
          };
        });

        // Calculate class aggregations
        const activeAverages = studentsWithStats.map(s => s.averageScore || 0).filter(score => score > 0);
        avgScore = activeAverages.length > 0 ? activeAverages.reduce((sum, sc) => sum + sc, 0) / activeAverages.length : 0;

        const activeAttendances = studentsWithStats.map(s => s.attendanceRate || 0);
        avgAttendance = activeAttendances.length > 0 ? activeAttendances.reduce((sum, att) => sum + att, 0) / activeAttendances.length : 0;
      }

      setStudents(studentsWithStats);
      setClassAverage(Math.round(avgScore * 100) / 100);
      setClassAttendance(Math.round(avgAttendance * 100) / 100);

      // 3. Fetch students without a class to allow assigning
      const { data: freeStudents, error: freeError } = await supabase
        .from("siswa")
        .select("*")
        .is("kelas_id", null);

      if (freeError) throw freeError;
      setAvailableStudents(freeStudents || []);

    } catch (err) {
      console.error("Error fetching class details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) return;

    try {
      const { error } = await supabase
        .from("kelas")
        .update({
          nama_kelas: formNama,
          tahun_ajaran: formTahun,
          deskripsi: formDeskripsi || null,
        })
        .eq("id", classId);

      if (error) throw error;
      setShowForm(false);
      fetchClassData();
    } catch (err) {
      console.error("Error updating class:", err);
    }
  };

  const handleDeleteClass = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus kelas ini? Siswa di kelas ini tidak akan dihapus, melainkan dikeluarkan dari kelas.")) return;

    try {
      const { error } = await supabase
        .from("kelas")
        .delete()
        .eq("id", classId);

      if (error) throw error;
      router.push("/kelas");
    } catch (err) {
      console.error("Error deleting class:", err);
    }
  };

  const handleAssignStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from("siswa")
        .update({ kelas_id: classId })
        .eq("id", studentId);

      if (error) throw error;
      fetchClassDetails();
    } catch (err) {
      console.error("Error assigning student:", err);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm("Apakah Anda yakin ingin mengeluarkan siswa ini dari kelas?")) return;

    try {
      const { error } = await supabase
        .from("siswa")
        .update({ kelas_id: null })
        .eq("id", studentId);

      if (error) throw error;
      fetchClassDetails();
    } catch (err) {
      console.error("Error removing student:", err);
    }
  };

  if (!kelas) {
    return (
      <div className="p-8 flex-1 flex items-center justify-center text-zinc-500 bg-cool-gray">
        Memuat data kelas...
      </div>
    );
  }

  return (
    <div className="p-8 flex-1 flex flex-col space-y-6 bg-cool-gray text-zinc-900">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/kelas")}
            className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-strong-blue transition-colors mb-2 cursor-pointer animate-fade-in"
          >
            <ArrowLeft size={14} /> Kembali ke Manajemen Kelas
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-strong-blue tracking-tight">{kelas.nama_kelas}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-strong-blue/10 text-strong-blue border border-strong-blue/20">
              Tahun Ajaran: {kelas.tahun_ajaran}
            </span>
          </div>
          {kelas.deskripsi && (
            <p className="text-xs text-zinc-600 font-medium italic">"{kelas.deskripsi}"</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-strong-blue hover:bg-[#001D6E] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-strong-blue/10 cursor-pointer"
          >
            <Edit3 size={14} /> Edit Kelas
          </button>
          <button
            onClick={handleDeleteClass}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-red-500/10 cursor-pointer"
          >
            <Trash2 size={14} /> Hapus Kelas
          </button>
        </div>
      </div>

      {/* Main Details Area */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-zinc-200 rounded-xl text-zinc-500 shadow-xs">
          Memuat rincian kelas...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: Details & Statistics */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Statistics Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-5 flex items-center gap-4 shadow-xs">
                <div className="p-3.5 bg-strong-blue/10 text-strong-blue rounded-xl">
                  <Award size={24} />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Rata-Rata Kelas</span>
                  <p className="text-2xl font-black text-strong-blue mt-0.5">{classAverage > 0 ? `${classAverage}` : "Belum ada nilai"}</p>
                </div>
              </div>
              
              <div className="bg-white border border-zinc-200 rounded-xl p-5 flex items-center gap-4 shadow-xs">
                <div className="p-3.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Kehadiran Kelas</span>
                  <p className="text-2xl font-black text-emerald-600 mt-0.5">{students.length > 0 ? `${classAttendance}%` : "Belum ada absensi"}</p>
                </div>
              </div>
            </div>

            {/* Student list section */}
            <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4 shadow-xs">
              <h4 className="font-extrabold text-strong-blue text-sm flex items-center gap-2 border-b border-zinc-100 pb-3">
                <Users size={16} /> Anggota Kelas ({students.length} Siswa)
              </h4>

              {students.length === 0 ? (
                <div className="py-12 bg-cool-gray/10 border border-zinc-200 border-dashed rounded-xl text-center text-xs text-zinc-500 font-medium">
                  Tidak ada siswa terdaftar di kelas ini.
                </div>
              ) : (
                <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-600">
                      <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200">
                        <tr>
                          <th className="px-4 py-3">Nama Siswa</th>
                          <th className="px-4 py-3">NIS</th>
                          <th className="px-4 py-3">Rata-rata Nilai</th>
                          <th className="px-4 py-3">Kehadiran</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-zinc-50">
                            <td className="px-4 py-3 font-semibold text-zinc-900">{student.nama_lengkap}</td>
                            <td className="px-4 py-3 text-zinc-500 font-medium">{student.nis}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                (student.averageScore || 0) >= 80 ? "bg-emerald-500/10 text-emerald-600" :
                                (student.averageScore || 0) >= 70 ? "bg-strong-blue/10 text-strong-blue" :
                                (student.averageScore || 0) > 0 ? "bg-amber-500/10 text-[#A67800]" :
                                "bg-zinc-100 text-zinc-400"
                              }`}>
                                {student.averageScore && student.averageScore > 0 ? student.averageScore : "N/A"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-bold ${
                                (student.attendanceRate || 0) >= 90 ? "text-emerald-600" :
                                (student.attendanceRate || 0) >= 75 ? "text-amber-500" :
                                "text-red-500"
                              }`}>
                                {student.attendanceRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleRemoveStudent(student.id)}
                                className="p-1 text-zinc-400 hover:text-red-500 rounded hover:bg-red-500/10 cursor-pointer"
                                title="Keluarkan dari Kelas"
                              >
                                <UserMinus size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Assign Students */}
          <div className="lg:col-span-1 bg-white border border-zinc-200 rounded-xl p-5 space-y-4 shadow-xs">
            <h4 className="font-extrabold text-strong-blue text-sm flex items-center gap-2 border-b border-zinc-100 pb-3">
              <UserPlus size={16} /> Hubungkan Siswa Baru
            </h4>

            {availableStudents.length === 0 ? (
              <p className="text-xs text-zinc-500 italic font-medium p-2 text-center bg-cool-gray/20 rounded-lg">Semua siswa terdaftar sudah memiliki kelas.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto p-1">
                {availableStudents.map((student) => (
                  <div 
                    key={student.id}
                    className="flex items-center justify-between bg-white text-zinc-700 text-xs p-3 rounded-lg border border-zinc-200 hover:border-strong-blue/35 transition-all shadow-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-zinc-800 truncate">{student.nama_lengkap}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">NIS: {student.nis}</p>
                    </div>
                    <button
                      onClick={() => handleAssignStudent(student.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-strong-blue/10 hover:bg-strong-blue hover:text-white text-strong-blue text-[10px] font-bold rounded transition-all cursor-pointer"
                      title="Tambahkan"
                    >
                      <Plus size={12} /> Tambah
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Edit Class Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-zinc-200">
              <h3 className="font-bold text-zinc-900 text-base">Edit Informasi Kelas</h3>
              <button 
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateClass} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500">Nama Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: 10-IPA-1, XII-MIPA-3"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500">Tahun Ajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: 2026/2027"
                  value={formTahun}
                  onChange={(e) => setFormTahun(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500">Deskripsi (Opsional)</label>
                <textarea
                  placeholder="Deskripsi singkat mengenai kelas..."
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-transparent hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-strong-blue hover:bg-[#001D6E] text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-strong-blue/10 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
