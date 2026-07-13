"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  X, 
  Upload, 
  Printer, 
  Layers, 
  CalendarDays,
  School,
  Award,
  TrendingUp,
  Clock,
  ChevronRight,
  ClipboardPen,
  BookmarkCheck,
  UserRound,
  ArrowLeft
} from "lucide-react";

// Dynamically import ReactApexChart to prevent SSR window error
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface Kelas {
  id: string;
  nama_kelas: string;
  tahun_ajaran: string;
}

interface Siswa {
  id: string;
  nis: string;
  nama_lengkap: string;
  kelas_id: string | null;
  foto_url: string | null;
  semester: string;
  tahun_ajaran: string;
  asal_sekolah: string;
  created_at: string;
}

interface NilasMapel {
  id: string;
  nama_mapel: string;
  kategori: string;
  skor: number;
}

interface Kehadiran {
  hadir: number;
  sakit: number;
  izin: number;
  alpha: number;
  total_sesi: number;
}

interface CatatanGuru {
  catatan: string;
  nama_guru: string;
}

export default function SiswaPage() {
  const [students, setStudents] = useState<Siswa[]>([]);
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");

  // Detail / Statistics states
  const [selectedStudent, setSelectedStudent] = useState<Siswa | null>(null);
  const [studentGrades, setStudentGrades] = useState<NilasMapel[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<Kehadiran | null>(null);
  const [studentNote, setStudentNote] = useState<CatatanGuru | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formId, setFormId] = useState("");
  const [formNis, setFormNis] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formKelasId, setFormKelasId] = useState("");
  const [formSemester, setFormSemester] = useState("Ganjil");
  const [formTahun, setFormTahun] = useState("2026/2027");
  const [formAsalSekolah, setFormAsalSekolah] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formFileUrl, setFormFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Ref for print area
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("siswa")
        .select("*")
        .order("nama_lengkap", { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("kelas")
        .select("id, nama_kelas, tahun_ajaran")
        .order("nama_kelas", { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (err) {
      console.error("Error fetching classes:", err);
    }
  };

  const fetchStudentReportData = async (student: Siswa) => {
    setLoadingDetails(true);
    try {
      // 1. Fetch grades (nilai joins mata_pelajaran)
      const { data: gradesData, error: gradesError } = await supabase
        .from("nilai")
        .select(`
          id,
          skor,
          mapel_id,
          mata_pelajaran (nama_mapel, kategori)
        `)
        .eq("siswa_id", student.id);

      if (gradesError) throw gradesError;

      const formattedGrades: NilasMapel[] = (gradesData || []).map((g: any) => ({
        id: g.id,
        skor: Number(g.skor),
        nama_mapel: g.mata_pelajaran?.nama_mapel || "Mata Pelajaran",
        kategori: g.mata_pelajaran?.kategori || "Wajib",
      }));
      setStudentGrades(formattedGrades);

      // 2. Fetch attendance
      const { data: attData, error: attError } = await supabase
        .from("kehadiran")
        .select("hadir, sakit, izin, alpha, total_sesi")
        .eq("siswa_id", student.id)
        .maybeSingle();

      if (attError) throw attError;
      setStudentAttendance(attData || { hadir: 0, sakit: 0, izin: 0, alpha: 0, total_sesi: 0 });

      // 3. Fetch teacher note
      const { data: noteData, error: noteError } = await supabase
        .from("catatan_guru")
        .select("catatan, nama_guru")
        .eq("siswa_id", student.id)
        .maybeSingle();

      if (noteError) throw noteError;
      setStudentNote(noteData || { catatan: "Belum ada catatan dari wali kelas.", nama_guru: "-" });

    } catch (err) {
      console.error("Error fetching student details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenReport = (student: Siswa) => {
    setSelectedStudent(student);
    fetchStudentReportData(student);
  };

  const handleUploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("student-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("student-photos")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error("Error uploading photo:", err);
      return null;
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formNis.trim()) return;

    setUploading(true);
    try {
      let photoUrl = formFileUrl;
      if (formFile) {
        photoUrl = await handleUploadPhoto(formFile);
      }

      const payload = {
        nis: formNis,
        nama_lengkap: formNama,
        kelas_id: formKelasId || null,
        foto_url: photoUrl,
        semester: formSemester,
        tahun_ajaran: formTahun,
        asal_sekolah: formAsalSekolah,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("siswa")
          .update(payload)
          .eq("id", formId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("siswa")
          .insert(payload);

        if (error) throw error;
      }

      setShowForm(false);
      setIsEditing(false);
      setFormNis("");
      setFormNama("");
      setFormKelasId("");
      setFormAsalSekolah("");
      setFormFile(null);
      setFormFileUrl(null);
      fetchStudents();
    } catch (err) {
      console.error("Error saving student:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleEditStudent = (student: Siswa) => {
    setFormId(student.id);
    setFormNis(student.nis);
    setFormNama(student.nama_lengkap);
    setFormKelasId(student.kelas_id || "");
    setFormSemester(student.semester);
    setFormTahun(student.tahun_ajaran);
    setFormAsalSekolah(student.asal_sekolah);
    setFormFileUrl(student.foto_url);
    setFormFile(null);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data siswa ini? Semua nilai dan absensi yang terhubung juga akan dihapus.")) return;

    try {
      const { error } = await supabase
        .from("siswa")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      if (selectedStudent?.id === id) {
        setSelectedStudent(null);
      }
      fetchStudents();
    } catch (err) {
      console.error("Error deleting student:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter students
  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.nis.includes(searchQuery);
    const matchesClass = selectedClassFilter === "all" || student.kelas_id === selectedClassFilter;
    return matchesSearch && matchesClass;
  });

  // Calculate student report metrics
  const avgGrade = studentGrades.length > 0
    ? studentGrades.reduce((sum, item) => sum + item.skor, 0) / studentGrades.length
    : 0;

  const attendancePercent = studentAttendance && studentAttendance.total_sesi > 0
    ? (studentAttendance.hadir / studentAttendance.total_sesi) * 100
    : 0;

  // Grade predicate calculation
  const getGradePredicate = (score: number) => {
    if (score >= 80) return { letter: "A", desc: "Sangat Baik" };
    if (score >= 70) return { letter: "B", desc: "Baik" };
    if (score >= 60) return { letter: "C", desc: "Cukup" };
    return { letter: "D", desc: "Kurang" };
  };

  const overallPredicate = getGradePredicate(avgGrade);

  // Donut chart distribution calculations
  const countA = studentGrades.filter(g => g.skor >= 80).length;
  const countB = studentGrades.filter(g => g.skor >= 70 && g.skor < 80).length;
  const countC = studentGrades.filter(g => g.skor >= 60 && g.skor < 70).length;
  const countD = studentGrades.filter(g => g.skor < 60).length;

  // Chart configuration: Horizontal Bar
  const barChartOptions = {
    chart: {
      id: "grades-bar",
      toolbar: { show: false },
      foreColor: "#94a3b8",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "50%",
        borderRadius: 4,
      }
    },
    colors: ["#6366f1"],
    xaxis: {
      categories: studentGrades.map(g => g.nama_mapel),
      max: 100,
    },
    grid: {
      borderColor: "#334155",
      xaxis: { lines: { show: true } }
    }
  };

  const barChartSeries = [
    {
      name: "Skor",
      data: studentGrades.map(g => g.skor),
    }
  ];

  // Chart configuration: Radar Capabilities
  const radarChartOptions = {
    chart: {
      id: "radar-caps",
      toolbar: { show: false },
      foreColor: "#94a3b8",
    },
    colors: ["#3b82f6"],
    xaxis: {
      categories: studentGrades.map(g => g.nama_mapel),
    },
    yaxis: {
      max: 100,
      tickAmount: 5,
    },
    grid: {
      borderColor: "#334155"
    }
  };

  const radarChartSeries = [
    {
      name: "Kekuatan",
      data: studentGrades.map(g => g.skor),
    }
  ];

  // Chart configuration: Donut Distribution
  const donutChartOptions = {
    chart: {
      id: "donut-dist",
      foreColor: "#94a3b8",
    },
    labels: ["A (80-100)", "B (70-79)", "C (60-69)", "D (<60)"],
    colors: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"],
    legend: {
      position: "bottom" as const,
    },
    stroke: {
      colors: ["#0f172a"]
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Mapel",
              color: "#ffffff",
              formatter: () => String(studentGrades.length)
            }
          }
        }
      }
    }
  };

  const donutChartSeries = [countA, countB, countC, countD];

  return (
    <div className="p-8 flex-1 flex flex-col space-y-6 bg-[#0B0F19]">
      {/* CSS @media print style definition to render the report cleanly */}
      <style jsx global>{`
        @media print {
          aside, nav, header, button, .no-print {
            display: none !important;
          }
          main, body, html {
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-container {
            display: block !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            padding: 20px !important;
            max-width: 100% !important;
            box-shadow: none !important;
          }
          .print-card {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            color: #0f172a !important;
          }
          .print-text {
            color: #0f172a !important;
          }
          .print-text-muted {
            color: #475569 !important;
          }
          .print-border {
            border-color: #cbd5e1 !important;
          }
          .print-fill-card {
            background: #f1f5f9 !important;
          }
        }
      `}</style>

      {/* Header (No Print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Data Siswa</h2>
          <p className="text-xs text-zinc-500 mt-1">Daftarkan siswa, unggah foto, dan pantau rapor/statistik perkembangan mereka.</p>
        </div>
        <button
          onClick={() => {
            setIsEditing(false);
            setFormNis("");
            setFormNama("");
            setFormKelasId("");
            setFormAsalSekolah("");
            setFormFile(null);
            setFormFileUrl(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
        >
          <Plus size={16} /> Registrasi Siswa
        </button>
      </div>

      {/* Main Content Area (No Print if Report is Open in full) */}
      <div className={`grid grid-cols-1 gap-6 no-print ${selectedStudent ? "hidden" : ""}`}>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          
          <div className="w-full sm:w-64">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Semua Kelas</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.nama_kelas}</option>
              ))}
              <option value="none">Belum Ada Kelas</option>
            </select>
          </div>
        </div>

        {/* Student Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-[#0F172A] border border-[#1E293B] rounded-xl text-zinc-500">
            Memuat data siswa...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#0F172A] border border-[#1E293B] rounded-xl text-center p-6">
            <Users className="text-zinc-600 mb-4" size={48} />
            <h3 className="font-bold text-white text-base">Belum ada siswa terdaftar</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">Silakan registrasikan siswa baru atau sesuaikan filter pencarian.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student) => {
              const studentClass = classes.find(c => c.id === student.kelas_id);
              return (
                <div
                  key={student.id}
                  className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5 hover:border-zinc-700 transition-all flex flex-col justify-between h-48 group relative"
                >
                  <div className="flex gap-4 items-start">
                    {student.foto_url ? (
                      <img 
                        src={student.foto_url} 
                        alt={student.nama_lengkap} 
                        className="w-14 h-14 rounded-lg object-cover bg-zinc-800 border border-[#1E293B]"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-indigo-500/10 text-indigo-400 border border-[#1E293B] flex items-center justify-center">
                        <UserRound size={28} />
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <h3 className="font-bold text-white text-sm tracking-tight line-clamp-1 group-hover:text-indigo-400 transition-colors">
                        {student.nama_lengkap}
                      </h3>
                      <p className="text-xs text-zinc-500">NIS: {student.nis}</p>
                      
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-2">
                        <Layers size={12} className="text-indigo-400" />
                        <span>{studentClass ? studentClass.nama_kelas : "Belum ada kelas"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-[#1E293B] mt-4">
                    <button
                      onClick={() => handleOpenReport(student)}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      Buka Rapor & Statistik <ChevronRight size={14} />
                    </button>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditStudent(student)}
                        className="p-1.5 hover:bg-[#1E293B] text-zinc-400 hover:text-white rounded-md cursor-pointer"
                        title="Edit Profil"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="p-1.5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-md cursor-pointer"
                        title="Hapus Siswa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rapor & Statistik View Sheet (PDF Print Layout) */}
      {selectedStudent && (
        <div className="space-y-6">
          {/* Controls Bar (No Print) */}
          <div className="flex justify-between items-center bg-[#0F172A] border border-[#1E293B] p-4 rounded-xl no-print">
            <button
              onClick={() => setSelectedStudent(null)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white cursor-pointer"
            >
              <ArrowLeft size={16} /> Kembali ke daftar siswa
            </button>
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                <Printer size={14} /> Print Rapor
              </button>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 bg-[#1E293B] hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Rapor Sheet */}
          {loadingDetails ? (
            <div className="flex items-center justify-center py-20 bg-[#0F172A] border border-[#1E293B] rounded-xl text-zinc-500">
              Menghitung statistik siswa...
            </div>
          ) : (
            <div ref={printRef} className="print-container bg-[#0F172A] border border-[#1E293B] rounded-xl p-8 space-y-8 shadow-2xl max-w-4xl mx-auto text-zinc-100">
              
              {/* Header Rapor */}
              <div className="flex justify-between items-center border-b-2 print-border pb-4">
                <div className="flex items-center gap-3">
                  {/* Mock Instansi Logo */}
                  <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl text-zinc-950 font-black text-xl flex items-center justify-center leading-none">
                    SG
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-white print-text tracking-wide leading-none">RAPOR HASIL BELAJAR SISWA</h1>
                    <span className="text-xs text-zinc-400 print-text-muted">SG Cabang Nusantara</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 print-text-muted font-bold block uppercase tracking-wider">Semester</span>
                  <span className="font-extrabold text-indigo-400 print-text text-sm">{selectedStudent.semester} {selectedStudent.tahun_ajaran}</span>
                </div>
              </div>

              {/* Student Identity Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Profile Photo */}
                <div className="md:col-span-3 flex justify-center">
                  {selectedStudent.foto_url ? (
                    <img 
                      src={selectedStudent.foto_url} 
                      alt={selectedStudent.nama_lengkap} 
                      className="w-32 h-32 rounded-xl object-cover border-2 border-[#1E293B] print-border bg-[#0B0F19]"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-indigo-500/10 text-indigo-400 border-2 border-[#1E293B] print-border flex items-center justify-center">
                      <UserRound size={64} />
                    </div>
                  )}
                </div>

                {/* Identity Details */}
                <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex justify-between border-b border-[#1E293B]/40 print-border py-1">
                    <span className="text-zinc-500 print-text-muted font-medium">Nama Lengkap</span>
                    <span className="text-white print-text font-bold">{selectedStudent.nama_lengkap}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#1E293B]/40 print-border py-1">
                    <span className="text-zinc-500 print-text-muted font-medium">Semester</span>
                    <span className="text-white print-text font-bold">{selectedStudent.semester}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#1E293B]/40 print-border py-1">
                    <span className="text-zinc-500 print-text-muted font-medium">NIS</span>
                    <span className="text-white print-text font-bold">{selectedStudent.nis}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#1E293B]/40 print-border py-1">
                    <span className="text-zinc-500 print-text-muted font-medium">Tahun Ajaran</span>
                    <span className="text-white print-text font-bold">{selectedStudent.tahun_ajaran}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#1E293B]/40 print-border py-1">
                    <span className="text-zinc-500 print-text-muted font-medium">Kelas</span>
                    <span className="text-white print-text font-bold">
                      {classes.find(c => c.id === selectedStudent.kelas_id)?.nama_kelas || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#1E293B]/40 print-border py-1">
                    <span className="text-zinc-500 print-text-muted font-medium">Asal Sekolah</span>
                    <span className="text-white print-text font-bold">{selectedStudent.asal_sekolah}</span>
                  </div>
                </div>
              </div>

              {/* Rangkuman Metrik Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0B0F19] border border-[#1E293B] print-card rounded-xl p-4 text-center">
                  <span className="text-[10px] text-zinc-500 print-text-muted font-bold uppercase tracking-wider block">Rata-Rata</span>
                  <p className="text-2xl font-black text-indigo-400 print-text mt-1">{avgGrade > 0 ? avgGrade.toFixed(2) : "0.00"}</p>
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded mt-1.5 ${
                    avgGrade >= 80 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {overallPredicate.desc}
                  </span>
                </div>

                <div className="bg-[#0B0F19] border border-[#1E293B] print-card rounded-xl p-4 text-center">
                  <span className="text-[10px] text-zinc-500 print-text-muted font-bold uppercase tracking-wider block">Kehadiran</span>
                  <p className="text-2xl font-black text-emerald-400 print-text mt-1">{Math.round(attendancePercent)}%</p>
                  <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded mt-1.5 bg-emerald-500/10 text-emerald-400">
                    {attendancePercent >= 90 ? "Sangat Baik" : attendancePercent >= 75 ? "Baik" : "Kurang"}
                  </span>
                </div>

                <div className="bg-[#0B0F19] border border-[#1E293B] print-card rounded-xl p-4 text-center">
                  <span className="text-[10px] text-zinc-500 print-text-muted font-bold uppercase tracking-wider block">Total Hadir</span>
                  <p className="text-2xl font-black text-white print-text mt-1">{(studentAttendance?.hadir || 0)} Sesi</p>
                  <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded mt-1.5 bg-zinc-800 print-fill-card text-zinc-400 print-text-muted">
                    Dari {studentAttendance?.total_sesi || 0} Sesi
                  </span>
                </div>

                <div className="bg-[#0B0F19] border border-[#1E293B] print-card rounded-xl p-4 text-center">
                  <span className="text-[10px] text-zinc-500 print-text-muted font-bold uppercase tracking-wider block">Predikat</span>
                  <p className="text-2xl font-black text-purple-400 print-text mt-1">{overallPredicate.letter}</p>
                  <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded mt-1.5 bg-purple-500/10 text-purple-400">
                    {overallPredicate.desc}
                  </span>
                </div>
              </div>

              {/* Visualisasi Grafik Row (ApexCharts) - Hidden during print because Canvas charts don't render cleanly, but shown on screen */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-white tracking-wide border-b border-[#1E293B] pb-2">NILAI SETIAP MAPEL</h4>
                  {studentGrades.length > 0 ? (
                    <ReactApexChart 
                      options={barChartOptions} 
                      series={barChartSeries} 
                      type="bar" 
                      height={200} 
                    />
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-[10px] text-zinc-500">Belum ada nilai</div>
                  )}
                </div>

                <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-white tracking-wide border-b border-[#1E293B] pb-2">GRAFIK KEMAMPUAN (RADAR)</h4>
                  {studentGrades.length > 0 ? (
                    <ReactApexChart 
                      options={radarChartOptions} 
                      series={radarChartSeries} 
                      type="radar" 
                      height={200} 
                    />
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-[10px] text-zinc-500">Belum ada nilai</div>
                  )}
                </div>

                <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-white tracking-wide border-b border-[#1E293B] pb-2">DISTRIBUSI NILAI</h4>
                  {studentGrades.length > 0 ? (
                    <ReactApexChart 
                      options={donutChartOptions} 
                      series={donutChartSeries} 
                      type="donut" 
                      height={200} 
                    />
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-[10px] text-zinc-500">Belum ada nilai</div>
                  )}
                </div>
              </div>

              {/* Detail Nilai & Kehadiran Table */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Attendance details */}
                <div className="md:col-span-1 space-y-2">
                  <h4 className="text-xs font-bold text-white print-text tracking-wide border-b-2 print-border border-[#1E293B] pb-2">KEHADIRAN</h4>
                  <table className="w-full text-xs text-zinc-400 print-text-muted">
                    <thead>
                      <tr className="border-b border-[#1E293B]/40 print-border">
                        <th className="py-2 text-left">Keterangan</th>
                        <th className="py-2 text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]/40 print-border">
                      <tr>
                        <td className="py-2 font-medium text-white print-text">Hadir</td>
                        <td className="py-2 text-right">{studentAttendance?.hadir || 0} Sesi</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium text-white print-text">Sakit</td>
                        <td className="py-2 text-right">{studentAttendance?.sakit || 0} Sesi</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium text-white print-text">Izin</td>
                        <td className="py-2 text-right">{studentAttendance?.izin || 0} Sesi</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium text-white print-text">Alpa (Alpha)</td>
                        <td className="py-2 text-right">{studentAttendance?.alpha || 0} Sesi</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table of subject details (Print friendly) */}
                <div className="md:col-span-2 space-y-2">
                  <h4 className="text-xs font-bold text-white print-text tracking-wide border-b-2 print-border border-[#1E293B] pb-2">DETAIL NILAI</h4>
                  <table className="w-full text-xs text-zinc-400 print-text-muted">
                    <thead>
                      <tr className="border-b border-[#1E293B]/40 print-border">
                        <th className="py-2 text-left">Mata Pelajaran</th>
                        <th className="py-2">Kategori</th>
                        <th className="py-2 text-right">Skor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]/40 print-border">
                      {studentGrades.map((g) => (
                        <tr key={g.id}>
                          <td className="py-2 font-medium text-white print-text">{g.nama_mapel}</td>
                          <td className="py-2">{g.kategori}</td>
                          <td className="py-2 text-right font-bold text-indigo-400 print-text">{g.skor}</td>
                        </tr>
                      ))}
                      {studentGrades.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-zinc-500 italic">Belum ada nilai terinput.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Catatan Guru */}
              <div className="bg-[#0B0F19] border border-[#1E293B] print-card rounded-xl p-5 space-y-2">
                <h4 className="text-xs font-bold text-white print-text tracking-wide border-b border-[#1E293B]/40 print-border pb-2">CATATAN WALI KELAS</h4>
                <p className="text-xs text-zinc-300 print-text leading-relaxed italic">
                  "{studentNote?.catatan}"
                </p>
                <div className="text-right text-[10px] text-zinc-500 print-text-muted font-bold mt-2">
                  Nama Guru: {studentNote?.nama_guru}
                </div>
              </div>

              {/* Signatures block */}
              <div className="grid grid-cols-2 gap-8 text-center text-xs pt-8 border-t border-[#1E293B]/40 print-border">
                <div className="space-y-12">
                  <div>
                    <p className="text-zinc-500 print-text-muted">Dibuat Oleh,</p>
                    <p className="text-white print-text font-bold mt-1">Staf Akademik</p>
                  </div>
                  <p className="text-zinc-400 print-text font-semibold border-b border-dashed border-zinc-600 print-border w-48 mx-auto pb-1">
                    {studentNote?.nama_guru || "Prof. Dr. Dora The Explorer"}
                  </p>
                </div>
                <div className="space-y-12">
                  <div>
                    <p className="text-zinc-500 print-text-muted">Mengetahui,</p>
                    <p className="text-white print-text font-bold mt-1">Pimpinan Cabang</p>
                  </div>
                  <p className="text-zinc-400 print-text font-semibold border-b border-dashed border-zinc-600 print-border w-48 mx-auto pb-1">
                    Dr. Boots M.Pd
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Student Form Modal (No Print) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-[#1E293B]">
              <h3 className="font-bold text-white text-base">
                {isEditing ? "Edit Profil Siswa" : "Registrasi Siswa Baru"}
              </h3>
              <button 
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-[#1E293B] text-zinc-500 hover:text-white rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveStudent} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">NIS (Nomor Induk Siswa)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 250001"
                    value={formNis}
                    onChange={(e) => setFormNis(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kim Nam-joon"
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Kelas</label>
                  <select
                    value={formKelasId}
                    onChange={(e) => setFormKelasId(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Pilih Kelas (Opsional) --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.nama_kelas}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Asal Sekolah</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SMP Negeri Wakanda"
                    value={formAsalSekolah}
                    onChange={(e) => setFormAsalSekolah(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Semester</label>
                  <select
                    value={formSemester}
                    onChange={(e) => setFormSemester(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Tahun Ajaran</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 2025/2026"
                    value={formTahun}
                    onChange={(e) => setFormTahun(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 block">Foto Profil (Opsional)</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-[#0B0F19] hover:bg-[#1E293B] border border-[#1E293B] rounded-lg text-xs font-bold text-zinc-300 transition-all cursor-pointer">
                    <Upload size={14} /> Pilih File Gambar
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormFile(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {formFile ? (
                    <span className="text-xs text-indigo-400 font-medium truncate max-w-xs">{formFile.name}</span>
                  ) : formFileUrl ? (
                    <span className="text-xs text-emerald-400 font-medium">Foto sudah diunggah</span>
                  ) : (
                    <span className="text-xs text-zinc-600">Belum ada foto terpilih</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-transparent hover:bg-[#1E293B] text-zinc-400 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {uploading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
