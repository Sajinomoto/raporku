"use client";

import { useState, useEffect } from "react";
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

export default function KelasPage() {
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [students, setStudents] = useState<SiswaWithStats[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<Kelas | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formId, setFormId] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formTahun, setFormTahun] = useState("2026/2027");
  const [formDeskripsi, setFormDeskripsi] = useState("");

  // Statistics states
  const [classAverage, setClassAverage] = useState<number>(0);
  const [classAttendance, setClassAttendance] = useState<number>(0);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassDetails(selectedClass.id);
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("kelas")
        .select("*")
        .order("nama_kelas", { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (err) {
      console.error("Error fetching classes:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassDetails = async (classId: string) => {
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
        // Fetch grades for these students
        const { data: gradesData } = await supabase
          .from("nilai")
          .select("siswa_id, skor")
          .in("siswa_id", studentIds);

        // Fetch attendance for these students
        const { data: attendanceData } = await supabase
          .from("kehadiran")
          .select("siswa_id, hadir, sakit, izin, alpha, total_sesi")
          .in("siswa_id", studentIds);

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
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) return;

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("kelas")
          .update({
            nama_kelas: formNama,
            tahun_ajaran: formTahun,
            deskripsi: formDeskripsi || null,
          })
          .eq("id", formId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("kelas")
          .insert({
            nama_kelas: formNama,
            tahun_ajaran: formTahun,
            deskripsi: formDeskripsi || null,
          });

        if (error) throw error;
      }

      // Reset
      setShowForm(false);
      setIsEditing(false);
      setFormNama("");
      setFormDeskripsi("");
      fetchClasses();
    } catch (err) {
      console.error("Error saving class:", err);
    }
  };

  const handleEditClass = (kelas: Kelas) => {
    setFormId(kelas.id);
    setFormNama(kelas.nama_kelas);
    setFormTahun(kelas.tahun_ajaran);
    setFormDeskripsi(kelas.deskripsi || "");
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kelas ini? Siswa di kelas ini tidak akan dihapus, melainkan dikeluarkan dari kelas.")) return;

    try {
      const { error } = await supabase
        .from("kelas")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      if (selectedClass?.id === id) {
        setSelectedClass(null);
      }
      fetchClasses();
    } catch (err) {
      console.error("Error deleting class:", err);
    }
  };

  const handleAssignStudent = async (studentId: string) => {
    if (!selectedClass) return;

    try {
      const { error } = await supabase
        .from("siswa")
        .update({ kelas_id: selectedClass.id })
        .eq("id", studentId);

      if (error) throw error;
      fetchClassDetails(selectedClass.id);
    } catch (err) {
      console.error("Error assigning student:", err);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClass) return;
    if (!confirm("Apakah Anda yakin ingin mengeluarkan siswa ini dari kelas?")) return;

    try {
      const { error } = await supabase
        .from("siswa")
        .update({ kelas_id: null })
        .eq("id", studentId);

      if (error) throw error;
      fetchClassDetails(selectedClass.id);
    } catch (err) {
      console.error("Error removing student:", err);
    }
  };

  return (
    <div className="p-8 flex-1 flex flex-col space-y-6 bg-[#0B0F19]">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Manajemen Kelas</h2>
          <p className="text-xs text-zinc-500 mt-1">Buat, kelola, dan pantau data statistik kelas dan siswa.</p>
        </div>
        <button
          onClick={() => {
            setIsEditing(false);
            setFormNama("");
            setFormDeskripsi("");
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
        >
          <Plus size={16} /> Tambah Kelas
        </button>
      </div>

      {/* Main Panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left/Middle Column: Class List */}
        <div className={`space-y-6 ${selectedClass ? "lg:col-span-1" : "lg:col-span-3"}`}>
          {loading ? (
            <div className="flex items-center justify-center py-20 bg-[#0F172A] border border-[#1E293B] rounded-xl text-zinc-500">
              Memuat data kelas...
            </div>
          ) : classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[#0F172A] border border-[#1E293B] rounded-xl text-center p-6">
              <Layers className="text-zinc-600 mb-4" size={48} />
              <h3 className="font-bold text-white text-base">Belum ada kelas</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">Silakan tambahkan kelas baru untuk mulai mengelompokkan siswa.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {classes.map((kelas) => {
                const isSelected = selectedClass?.id === kelas.id;
                return (
                  <div
                    key={kelas.id}
                    className={`bg-[#0F172A] border rounded-xl p-5 hover:border-zinc-700 transition-all cursor-pointer relative group ${
                      isSelected ? "border-indigo-500 shadow-md shadow-indigo-500/5 bg-[#141C30]" : "border-[#1E293B]"
                    }`}
                    onClick={() => setSelectedClass(kelas)}
                  >
                    <div className="flex justify-between items-start pr-16">
                      <div className="space-y-1">
                        <h3 className="font-black text-white text-lg tracking-tight group-hover:text-indigo-400 transition-colors">
                          {kelas.nama_kelas}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <CalendarDays size={12} />
                          <span>Tahun Ajaran: {kelas.tahun_ajaran}</span>
                        </div>
                        {kelas.deskripsi && (
                          <p className="text-xs text-zinc-400 mt-2 line-clamp-2 italic leading-relaxed">
                            "{kelas.deskripsi}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions floating to avoid misclicks */}
                    <div className="absolute right-4 top-4 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClass(kelas);
                        }}
                        className="p-1.5 hover:bg-[#1E293B] text-zinc-400 hover:text-white rounded-md transition-colors cursor-pointer"
                        title="Edit Kelas"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClass(kelas.id);
                        }}
                        className="p-1.5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-md transition-colors cursor-pointer"
                        title="Hapus Kelas"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Class Details & Statistics */}
        {selectedClass && (
          <div className="lg:col-span-2 bg-[#0F172A] border border-[#1E293B] rounded-xl p-6 space-y-6">
            {/* Detail Header */}
            <div className="flex justify-between items-start pb-4 border-b border-[#1E293B]">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Detail Kelas</span>
                <h3 className="text-xl font-black text-white tracking-tight">{selectedClass.nama_kelas}</h3>
                <p className="text-xs text-zinc-500">Tahun Ajaran: {selectedClass.tahun_ajaran}</p>
              </div>
              <button 
                onClick={() => setSelectedClass(null)}
                className="p-1.5 hover:bg-[#1E293B] text-zinc-500 hover:text-white rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Statistics Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Award size={22} />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Rata-Rata Kelas</span>
                  <p className="text-xl font-bold text-white mt-0.5">{classAverage > 0 ? `${classAverage}` : "Belum ada nilai"}</p>
                </div>
              </div>
              
              <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Kehadiran Kelas</span>
                  <p className="text-xl font-bold text-white mt-0.5">{students.length > 0 ? `${classAttendance}%` : "Belum ada absensi"}</p>
                </div>
              </div>
            </div>

            {/* Student list section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Users size={16} /> Anggota Kelas ({students.length} Siswa)
                </h4>
              </div>

              {students.length === 0 ? (
                <div className="py-8 bg-[#0B0F19] border border-[#1E293B] border-dashed rounded-xl text-center text-xs text-zinc-500">
                  Tidak ada siswa terdaftar di kelas ini.
                </div>
              ) : (
                <div className="border border-[#1E293B] rounded-xl overflow-hidden bg-[#0B0F19]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-400">
                      <thead className="bg-[#1E293B]/40 text-zinc-300 font-bold border-b border-[#1E293B]">
                        <tr>
                          <th className="px-4 py-3">Nama Siswa</th>
                          <th className="px-4 py-3">NIS</th>
                          <th className="px-4 py-3">Rata-rata Nilai</th>
                          <th className="px-4 py-3">Kehadiran</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E293B]">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-[#1E293B]/20">
                            <td className="px-4 py-3 font-semibold text-white">{student.nama_lengkap}</td>
                            <td className="px-4 py-3 text-zinc-500">{student.nis}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                (student.averageScore || 0) >= 80 ? "bg-emerald-500/10 text-emerald-400" :
                                (student.averageScore || 0) >= 70 ? "bg-indigo-500/10 text-indigo-400" :
                                (student.averageScore || 0) > 0 ? "bg-amber-500/10 text-amber-400" :
                                "bg-zinc-800 text-zinc-500"
                              }`}>
                                {student.averageScore && student.averageScore > 0 ? student.averageScore : "N/A"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-semibold ${
                                (student.attendanceRate || 0) >= 90 ? "text-emerald-400" :
                                (student.attendanceRate || 0) >= 75 ? "text-amber-400" :
                                "text-red-400"
                              }`}>
                                {student.attendanceRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleRemoveStudent(student.id)}
                                className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-red-500/10 cursor-pointer"
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

            {/* Add students to class */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <UserPlus size={16} /> Tambah Siswa Baru Ke Kelas
              </h4>

              {availableStudents.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Semua siswa terdaftar sudah memiliki kelas.</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 border border-[#1E293B] rounded-lg bg-[#0B0F19]">
                  {availableStudents.map((student) => (
                    <div 
                      key={student.id}
                      className="flex items-center gap-2 bg-[#1E293B] text-zinc-300 text-xs px-2.5 py-1.5 rounded-lg border border-[#334155]/50"
                    >
                      <span className="font-semibold text-white">{student.nama_lengkap}</span>
                      <button
                        onClick={() => handleAssignStudent(student.id)}
                        className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        title="Tambahkan"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Class Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-[#1E293B]">
              <h3 className="font-bold text-white text-base">
                {isEditing ? "Edit Kelas" : "Tambah Kelas Baru"}
              </h3>
              <button 
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-[#1E293B] text-zinc-500 hover:text-white rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveClass} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Nama Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: 10-IPA-1, XII-MIPA-3"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Tahun Ajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: 2026/2027"
                  value={formTahun}
                  onChange={(e) => setFormTahun(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Deskripsi (Opsional)</label>
                <textarea
                  placeholder="Deskripsi singkat mengenai kelas..."
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-transparent hover:bg-[#1E293B] text-zinc-400 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
