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
  FileSpreadsheet,
  ClipboardCheck,
  Clock,
  Save,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface Kelas {
  id: string;
  nama_kelas: string;
  tahun_ajaran: string;
  deskripsi: string | null;
  created_at: string;
}

interface MataPelajaran {
  id: string;
  nama_mapel: string;
  kategori: string;
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

  // Grade/Attendance Input Modal states
  const [showInputModal, setShowInputModal] = useState(false);
  const [modalStudent, setModalStudent] = useState<Siswa | null>(null);
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [skor, setSkor] = useState<number | "">("");
  const [hadir, setHadir] = useState<number>(0);
  const [sakit, setSakit] = useState<number>(0);
  const [izin, setIzen] = useState<number>(0);
  const [alpha, setAlpha] = useState<number>(0);
  const [catatan, setCatatan] = useState("");
  const [namaGuru, setNamaGuru] = useState("");
  const [modalSaving, setModalSaving] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarDays, setCalendarDays] = useState<Record<number, "H" | "S" | "I" | "A" | "N">>({});
  const [activeCategory, setActiveCategory] = useState<"H" | "S" | "I" | "A" | "N">("H");

  // Statistics states
  const [classAverage, setClassAverage] = useState<number>(0);
  const [classAttendance, setClassAttendance] = useState<number>(0);

  useEffect(() => {
    if (classId) {
      fetchClassData();
      fetchClassDetails();
      fetchSubjects();
    }
  }, [classId]);

  const fetchSubjects = async () => {
    try {
      const { data } = await supabase
        .from("mata_pelajaran")
        .select("id, nama_mapel, kategori")
        .order("nama_mapel");
      setSubjects(data || []);
    } catch (err) {
      console.error("Error fetching subjects:", err);
    }
  };

  const openInputModal = async (student: Siswa) => {
    setModalStudent(student);
    setSelectedSubjectId("");
    setSkor("");
    setHadir(0);
    setSakit(0);
    setIzen(0);
    setAlpha(0);
    setCatatan("");
    setNamaGuru("");
    setModalFeedback(null);
    setShowInputModal(true);

    try {
      // 1. Fetch attendance
      const { data: attData } = await supabase
        .from("kehadiran")
        .select("hadir, sakit, izin, alpha")
        .eq("siswa_id", student.id)
        .maybeSingle();

      if (attData) {
        setHadir(attData.hadir);
        setSakit(attData.sakit);
        setIzen(attData.izin);
        setAlpha(attData.alpha);
      }

      // 2. Fetch notes
      const { data: noteData } = await supabase
        .from("catatan_guru")
        .select("catatan, nama_guru")
        .eq("siswa_id", student.id)
        .maybeSingle();

      if (noteData) {
        setCatatan(noteData.catatan);
        setNamaGuru(noteData.nama_guru);
      }
    } catch (err) {
      console.error("Error loading modal data:", err);
    }
  };

  const handleSubjectChange = async (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    if (!modalStudent || !subjectId) {
      setSkor("");
      return;
    }
    try {
      const { data: gradeData } = await supabase
        .from("nilai")
        .select("skor")
        .eq("siswa_id", modalStudent.id)
        .eq("mapel_id", subjectId)
        .maybeSingle();

      if (gradeData) {
        setSkor(gradeData.skor !== null ? Number(gradeData.skor) : "");
      } else {
        setSkor("");
      }
    } catch (err) {
      console.error("Error loading student score:", err);
    }
  };

  const handleSaveModalData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalStudent) return;
    setModalSaving(true);
    setModalFeedback(null);

    try {
      // 1. Save grade if specified
      if (selectedSubjectId && skor !== "") {
        if (Number(skor) < 0 || Number(skor) > 100) {
          throw new Error("Skor nilai harus berada dalam rentang 0 sampai 100.");
        }

        const { data: existingGrade } = await supabase
          .from("nilai")
          .select("id")
          .eq("siswa_id", modalStudent.id)
          .eq("mapel_id", selectedSubjectId)
          .maybeSingle();

        if (existingGrade) {
          const { error } = await supabase
            .from("nilai")
            .update({ skor: Number(skor) })
            .eq("id", existingGrade.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("nilai")
            .insert({
              siswa_id: modalStudent.id,
              mapel_id: selectedSubjectId,
              skor: Number(skor)
            });
          if (error) throw error;
        }
      }

      // 2. Save Attendance
      const totalSesi = hadir + sakit + izin + alpha;
      const { data: existingAtt } = await supabase
        .from("kehadiran")
        .select("id")
        .eq("siswa_id", modalStudent.id)
        .maybeSingle();

      if (existingAtt) {
        const { error } = await supabase
          .from("kehadiran")
          .update({
            hadir,
            sakit,
            izin,
            alpha,
            total_sesi: totalSesi
          })
          .eq("id", existingAtt.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("kehadiran")
          .insert({
            siswa_id: modalStudent.id,
            hadir,
            sakit,
            izin,
            alpha,
            total_sesi: totalSesi
          });
        if (error) throw error;
      }

      // 3. Save Notes
      const { data: existingNote } = await supabase
        .from("catatan_guru")
        .select("id")
        .eq("siswa_id", modalStudent.id)
        .maybeSingle();

      if (existingNote) {
        const { error } = await supabase
          .from("catatan_guru")
          .update({
            catatan,
            nama_guru: namaGuru || "-"
          })
          .eq("id", existingNote.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("catatan_guru")
          .insert({
            siswa_id: modalStudent.id,
            catatan,
            nama_guru: namaGuru || "-"
          });
        if (error) throw error;
      }

      setModalFeedback({ text: "Data berhasil disimpan!", type: "success" });
      setTimeout(() => {
        setShowInputModal(false);
        fetchClassDetails(); // Reload page stats!
      }, 1000);
    } catch (err: any) {
      setModalFeedback({ text: err.message || "Gagal menyimpan data.", type: "error" });
    } finally {
      setModalSaving(false);
    }
  };

  const openCalendarModal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const initialDays: Record<number, "H" | "S" | "I" | "A" | "N"> = {};
    
    let hLeft = hadir;
    let sLeft = sakit;
    let iLeft = izin;
    let aLeft = alpha;

    for (let d = 1; d <= daysInMonth; d++) {
      if (hLeft > 0) {
        initialDays[d] = "H";
        hLeft--;
      } else if (sLeft > 0) {
        initialDays[d] = "S";
        sLeft--;
      } else if (iLeft > 0) {
        initialDays[d] = "I";
        iLeft--;
      } else if (aLeft > 0) {
        initialDays[d] = "A";
        aLeft--;
      } else {
        initialDays[d] = "N";
      }
    }

    setCalendarDays(initialDays);
    setActiveCategory("H");
    setShowCalendarModal(true);
  };

  const clickDay = (dayNum: number) => {
    setCalendarDays((prev) => ({
      ...prev,
      [dayNum]: activeCategory
    }));
  };

  const getCalendarAggregates = () => {
    const vals = Object.values(calendarDays);
    const hCount = vals.filter((v) => v === "H").length;
    const sCount = vals.filter((v) => v === "S").length;
    const iCount = vals.filter((v) => v === "I").length;
    const aCount = vals.filter((v) => v === "A").length;
    return {
      hadir: hCount,
      sakit: sCount,
      izin: iCount,
      alpha: aCount,
      total: hCount + sCount + iCount + aCount,
    };
  };

  const saveCalendarAttendance = () => {
    const aggs = getCalendarAggregates();
    setHadir(aggs.hadir);
    setSakit(aggs.sakit);
    setIzen(aggs.izin);
    setAlpha(aggs.alpha);
    setShowCalendarModal(false);
  };

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
        <div className="space-y-6">
          
          {/* Top Row: Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Rata-Rata Kelas */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 flex items-center gap-4 shadow-xs min-h-[110px]">
              <div className="p-3.5 bg-strong-blue/10 text-strong-blue rounded-xl shrink-0">
                <Award size={24} />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Rata-Rata Kelas</span>
                <p className="text-2xl font-black text-strong-blue mt-0.5">{classAverage > 0 ? `${classAverage}` : "Belum ada nilai"}</p>
              </div>
            </div>
            
            {/* Card 2: Kehadiran Kelas */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 flex items-center gap-4 shadow-xs min-h-[110px]">
              <div className="p-3.5 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0">
                <TrendingUp size={24} />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Kehadiran Kelas</span>
                <p className="text-2xl font-black text-emerald-600 mt-0.5">{students.length > 0 ? `${classAttendance}%` : "Belum ada absensi"}</p>
              </div>
            </div>
          </div>

          {/* Bottom Row: Student List (Full Width) */}
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
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => openInputModal(student)}
                                className="p-1 text-zinc-400 hover:text-mustard rounded hover:bg-mustard/15 cursor-pointer"
                                title="Input Nilai & Absen"
                              >
                                <ClipboardCheck size={14} />
                              </button>
                              <button
                                onClick={() => handleRemoveStudent(student.id)}
                                className="p-1 text-zinc-400 hover:text-red-500 rounded hover:bg-red-500/10 cursor-pointer"
                                title="Keluarkan dari Kelas"
                              >
                                <UserMinus size={14} />
                              </button>
                            </div>
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

      {/* Input Nilai & Kehadiran Modal */}
      {showInputModal && modalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex justify-between items-center p-5 border-b border-zinc-200">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">Input Nilai & Kehadiran</h3>
                <p className="text-xs text-zinc-500 font-medium">Siswa: {modalStudent.nama_lengkap} (NIS: {modalStudent.nis})</p>
              </div>
              <button 
                onClick={() => setShowInputModal(false)}
                className="p-1 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveModalData} className="p-5 space-y-4">
              {modalFeedback && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all duration-300 ${
                  modalFeedback.type === "success" 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" 
                    : "bg-red-500/10 border-red-500/20 text-red-600"
                }`}>
                  {modalFeedback.type === "success" ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
                  <p className="text-xs font-bold">{modalFeedback.text}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Academic Section */}
                <div className="space-y-4 bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
                  <h4 className="font-bold text-strong-blue text-xs border-b border-zinc-200 pb-2 flex items-center gap-2">
                    <FileSpreadsheet size={14} /> Nilai Akademik
                  </h4>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-1.5">Mata Pelajaran</label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                    >
                      <option value="">-- Pilih Mata Pelajaran --</option>
                      {subjects.map((subj) => (
                        <option key={subj.id} value={subj.id}>
                          {subj.nama_mapel} ({subj.kategori})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedSubjectId && (
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-xs font-bold text-zinc-500 block">Skor Nilai</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        placeholder="Rentang 0 - 100"
                        value={skor}
                        onChange={(e) => setSkor(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                      />
                    </div>
                  )}
                </div>

                {/* Attendance Section */}
                <div className="space-y-4 bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
                  <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                    <h4 className="font-bold text-strong-blue text-xs flex items-center gap-2">
                      <Clock size={14} /> Rekap Kehadiran
                    </h4>
                    <button
                      type="button"
                      onClick={openCalendarModal}
                      className="px-3 py-1.5 bg-mustard hover:bg-[#E6A600] text-strong-blue font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-xs border border-mustard/35 hover:scale-105 active:scale-95"
                    >
                      Atur Kehadiran
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div className="bg-white border border-zinc-200 rounded-lg p-2 flex flex-col justify-center shadow-2xs">
                      <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Hadir</span>
                      <span className="text-xs font-extrabold text-emerald-600 mt-1 block">{hadir} Hari</span>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg p-2 flex flex-col justify-center shadow-2xs">
                      <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Sakit</span>
                      <span className="text-xs font-extrabold text-amber-500 mt-1 block">{sakit} Hari</span>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg p-2 flex flex-col justify-center shadow-2xs">
                      <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Izin</span>
                      <span className="text-xs font-extrabold text-strong-blue mt-1 block">{izin} Hari</span>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg p-2 flex flex-col justify-center shadow-2xs">
                      <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Alpa</span>
                      <span className="text-xs font-extrabold text-red-500 mt-1 block">{alpha} Hari</span>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg p-2 flex flex-col justify-center shadow-2xs col-span-2 sm:col-span-1 bg-zinc-50 border-dashed">
                      <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Total</span>
                      <span className="text-xs font-extrabold text-zinc-800 mt-1 block">{hadir + sakit + izin + alpha} Hari</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Note Section */}
              <div className="space-y-3 bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
                <h4 className="font-bold text-strong-blue text-xs border-b border-zinc-200 pb-2">Catatan & Wali Kelas</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500">Catatan Perkembangan Siswa</label>
                    <textarea
                      placeholder="Masukkan catatan mengenai kepribadian/prestasi siswa..."
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      rows={2}
                      className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                    />
                  </div>
                  <div className="md:col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500">Nama Wali Kelas</label>
                    <input
                      type="text"
                      placeholder="Nama Lengkap & Gelar"
                      value={namaGuru}
                      onChange={(e) => setNamaGuru(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowInputModal(false)}
                  className="px-4 py-2 bg-transparent hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-strong-blue hover:bg-[#001D6E] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-strong-blue/10 cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} /> {modalSaving ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex justify-between items-center p-4 border-b border-zinc-200 bg-zinc-50">
              <div>
                <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                  <Clock size={16} className="text-strong-blue" /> Atur Kehadiran
                </h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">
                  {new Date().toLocaleString("id-ID", { month: "long", year: "numeric" })}
                </p>
              </div>
              <button 
                onClick={() => setShowCalendarModal(false)}
                className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-800 rounded-lg cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-[10px] text-zinc-400 font-medium text-center bg-zinc-50 border border-zinc-200/60 p-2 rounded-lg leading-relaxed">
                💡 Pilih kategori kehadiran di sebelah kanan, lalu klik tanggal pada kalender di bawah untuk menerapkannya.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Left/Center Area: Calendar Grid */}
                <div className="md:col-span-2 space-y-3">
                  {/* Day Headings */}
                  <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-zinc-400 border-b border-zinc-100 pb-1.5">
                    <div>Min</div>
                    <div>Sen</div>
                    <div>Sel</div>
                    <div>Rab</div>
                    <div>Kam</div>
                    <div>Jum</div>
                    <div>Sab</div>
                  </div>

                  {/* Calendar Grid cells */}
                  <div className="grid grid-cols-7 gap-1.5 justify-items-center">
                    {/* Blank days index offset */}
                    {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }).map((_, idx) => (
                      <div key={`offset-${idx}`} className="w-9 h-9"></div>
                    ))}

                    {/* Active calendar days */}
                    {Object.keys(calendarDays).map((dayStr) => {
                      const dayNum = Number(dayStr);
                      const status = calendarDays[dayNum];
                      const statusColors = {
                        H: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-xs border border-emerald-500",
                        S: "bg-amber-500 text-white hover:bg-amber-600 shadow-xs border border-amber-500",
                        I: "bg-strong-blue text-white hover:bg-[#001D6E] shadow-xs border border-strong-blue",
                        A: "bg-red-500 text-white hover:bg-red-600 shadow-xs border border-red-500",
                        N: "bg-zinc-50 hover:bg-zinc-100 text-zinc-400 border border-zinc-200"
                      };
                      return (
                        <button
                          key={`day-${dayNum}`}
                          type="button"
                          onClick={() => clickDay(dayNum)}
                          className={`w-9 h-9 rounded-lg font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-90 ${statusColors[status]}`}
                        >
                          <span>{dayNum}</span>
                          <span className="text-[6px] opacity-75 leading-none mt-0.5">{status === "N" ? "-" : status}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Area: Category Selector Brush */}
                <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-zinc-200 pt-4 md:pt-0 md:pl-5 flex flex-col justify-start space-y-2.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Pilih Kategori</span>
                  
                  <button
                    type="button"
                    onClick={() => setActiveCategory("H")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none border ${
                      activeCategory === "H" 
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-xs ring-2 ring-emerald-500/30" 
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-300/40 hover:bg-emerald-500/20"
                    }`}
                  >
                    <span>Hadir</span>
                    <span className="text-[10px] opacity-80">(H)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory("S")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none border ${
                      activeCategory === "S" 
                        ? "bg-amber-500 text-white border-amber-500 shadow-xs ring-2 ring-amber-500/30" 
                        : "bg-amber-500/10 text-amber-600 border-amber-300/40 hover:bg-amber-500/20"
                    }`}
                  >
                    <span>Sakit</span>
                    <span className="text-[10px] opacity-80">(S)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory("I")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none border ${
                      activeCategory === "I" 
                        ? "bg-strong-blue text-white border-strong-blue shadow-xs ring-2 ring-strong-blue/30" 
                        : "bg-strong-blue/10 text-strong-blue border-strong-blue/30 hover:bg-strong-blue/20"
                    }`}
                  >
                    <span>Izin</span>
                    <span className="text-[10px] opacity-80">(I)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory("A")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none border ${
                      activeCategory === "A" 
                        ? "bg-red-500 text-white border-red-500 shadow-xs ring-2 ring-red-500/30" 
                        : "bg-red-500/10 text-red-600 border-red-300/40 hover:bg-red-500/20"
                    }`}
                  >
                    <span>Alpa</span>
                    <span className="text-[10px] opacity-80">(A)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory("N")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none border ${
                      activeCategory === "N" 
                        ? "bg-zinc-500 text-white border-zinc-500 shadow-xs ring-2 ring-zinc-500/30" 
                        : "bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200"
                    }`}
                  >
                    <span>Kosongkan</span>
                    <span className="text-[10px] opacity-80">(-)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer with calculated live aggregates */}
            <div className="p-4 border-t border-zinc-200 bg-zinc-50 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-extrabold text-zinc-600 bg-white border border-zinc-200 p-2 rounded-lg">
                <span className="text-emerald-600">H: {getCalendarAggregates().hadir}</span>
                <span className="text-amber-500">S: {getCalendarAggregates().sakit}</span>
                <span className="text-strong-blue">I: {getCalendarAggregates().izin}</span>
                <span className="text-red-500">A: {getCalendarAggregates().alpha}</span>
                <span className="text-zinc-800 border-l border-zinc-200 pl-2">Total: {getCalendarAggregates().total} Hari</span>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(false)}
                  className="px-3 py-1.5 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={saveCalendarAttendance}
                  className="px-3 py-1.5 bg-strong-blue hover:bg-[#001D6E] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-strong-blue/10 cursor-pointer"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
