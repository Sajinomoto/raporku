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
import NextImage from "next/image";

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
  const [activeTab, setActiveTab] = useState<"detail" | "rapor">("detail");
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null);

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
      // Fetch grades, attendance, and notes in parallel
      const [gradesRes, attRes, noteRes] = await Promise.all([
        supabase
          .from("nilai")
          .select(`
            id,
            skor,
            mapel_id,
            mata_pelajaran (nama_mapel, kategori)
          `)
          .eq("siswa_id", student.id),
        supabase
          .from("kehadiran")
          .select("hadir, sakit, izin, alpha, total_sesi")
          .eq("siswa_id", student.id)
          .maybeSingle(),
        supabase
          .from("catatan_guru")
          .select("catatan, nama_guru")
          .eq("siswa_id", student.id)
          .maybeSingle()
      ]);

      if (gradesRes.error) throw gradesRes.error;
      if (attRes.error) throw attRes.error;
      if (noteRes.error) throw noteRes.error;

      const formattedGrades: NilasMapel[] = (gradesRes.data || []).map((g: any) => ({
        id: g.id,
        skor: Number(g.skor),
        nama_mapel: g.mata_pelajaran?.nama_mapel || "Mata Pelajaran",
        kategori: g.mata_pelajaran?.kategori || "Wajib",
      }));
      setStudentGrades(formattedGrades);

      setStudentAttendance(attRes.data || { hadir: 0, sakit: 0, izin: 0, alpha: 0, total_sesi: 0 });
      setStudentNote(noteRes.data || { catatan: "Belum ada catatan dari wali kelas.", nama_guru: "-" });

    } catch (err) {
      console.error("Error fetching student details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenReport = (student: Siswa) => {
    setSelectedStudent(student);
    setActiveTab("detail");
    fetchStudentReportData(student);
  };

  const compressImage = (file: File, maxWidth = 500, maxHeight = 500, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Maintain aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file); // fallback
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleUploadPhoto = async (file: File): Promise<string> => {
    // Compress image client side before upload
    const compressedFile = await compressImage(file);
    
    const fileName = `${Math.random().toString(36).substring(2)}.jpg`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("student-photos")
      .upload(filePath, compressedFile);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("student-photos")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formNis.trim()) return;

    setUploading(true);
    try {
      let photoUrl = formFileUrl;
      if (formFile) {
        try {
          photoUrl = await handleUploadPhoto(formFile);
        } catch (uploadError: any) {
          console.error("Error uploading photo:", uploadError);
          alert(`Gagal mengunggah foto siswa: ${uploadError.message || "Terjadi kesalahan pada Supabase Storage."}\n\nKemungkinan besar RLS (Row Level Security) memblokir unggahan. Silakan buka Dashboard Supabase > Storage > Policies, lalu buat kebijakan baru (Storage Policy) untuk bucket 'student-photos' agar mengizinkan operasi INSERT bagi pengguna publik/anonim.`);
          setUploading(false);
          return;
        }
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

        if (selectedStudent && selectedStudent.id === formId) {
          const updatedStudent = { ...selectedStudent, ...payload, id: formId, created_at: selectedStudent.created_at };
          setSelectedStudent(updatedStudent);
        }
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
    <div className="p-8 flex-1 flex flex-col space-y-6 bg-cool-gray text-zinc-900">
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
          <h2 className="text-2xl font-black text-strong-blue tracking-tight">Data Siswa</h2>
          <p className="text-xs text-zinc-600 mt-1 font-medium">Daftarkan siswa, unggah foto, dan pantau rapor/statistik perkembangan mereka.</p>
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
          className="flex items-center gap-2 px-4 py-2.5 bg-strong-blue hover:bg-[#001D6E] text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-strong-blue/10 cursor-pointer"
        >
          <Plus size={16} /> Registrasi Siswa
        </button>
      </div>

      {/* Main Content Area (No Print if Report is Open in full) */}
      <div className={`grid grid-cols-1 gap-6 no-print ${selectedStudent ? "hidden" : ""}`}>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
            />
          </div>
          
          <div className="w-full sm:w-64">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
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
          <div className="flex items-center justify-center py-20 bg-white border border-zinc-200 rounded-xl text-zinc-500 shadow-xs">
            Memuat data siswa...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-zinc-200 rounded-xl text-center p-6 shadow-xs">
            <Users className="text-zinc-400 mb-4" size={48} />
            <h3 className="font-bold text-zinc-800 text-base">Belum ada siswa terdaftar</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs font-medium">Silakan registrasikan siswa baru atau sesuaikan filter pencarian.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student) => {
              const studentClass = classes.find(c => c.id === student.kelas_id);
              return (
                <div
                  key={student.id}
                  onClick={() => handleOpenReport(student)}
                  className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-strong-blue/40 shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.96] active:translate-y-0 transition-all duration-200 flex flex-col justify-between h-48 group relative cursor-pointer"
                >
                  <div className="flex gap-4 items-start">
                    {student.foto_url ? (
                      <NextImage 
                        src={student.foto_url} 
                        alt={student.nama_lengkap} 
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-lg object-cover bg-zinc-100 border border-zinc-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-strong-blue/10 text-strong-blue border border-zinc-200 flex items-center justify-center">
                        <UserRound size={28} />
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <h3 className="font-bold text-zinc-900 text-sm tracking-tight line-clamp-1 group-hover:text-strong-blue transition-colors">
                        {student.nama_lengkap}
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium">NIS: {student.nis}</p>
                      
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-2 font-medium">
                        <Layers size={12} className="text-strong-blue" />
                        <span>{studentClass ? studentClass.nama_kelas : "Belum ada kelas"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-zinc-100 mt-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenReport(student);
                      }}
                      className="text-xs font-bold text-strong-blue hover:text-[#001D6E] flex items-center gap-1 cursor-pointer"
                    >
                      Buka Rapor & Statistik <ChevronRight size={14} />
                    </button>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStudent(student);
                        }}
                        className="p-1.5 hover:bg-zinc-100 text-zinc-500 hover:text-strong-blue rounded-md cursor-pointer"
                        title="Edit Profil"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStudent(student.id);
                        }}
                        className="p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-600 rounded-md cursor-pointer"
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
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-white border border-zinc-200 p-4 rounded-xl no-print gap-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setSelectedStudent(null)}
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-strong-blue font-semibold cursor-pointer"
              >
                <ArrowLeft size={16} /> Kembali ke daftar siswa
              </button>
              
              {/* Tab Selector Bar */}
              <div className="flex border-l border-zinc-200 pl-4 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("detail")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "detail"
                      ? "bg-strong-blue text-white shadow-xs"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-strong-blue"
                  }`}
                >
                  Profil Siswa
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("rapor")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "rapor"
                      ? "bg-strong-blue text-white shadow-xs"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-strong-blue"
                  }`}
                >
                  Lembar Rapor
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end items-center">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-strong-blue hover:bg-[#001D6E] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-strong-blue/10 cursor-pointer"
              >
                <Printer size={14} /> Print Rapor
              </button>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-20 bg-white border border-zinc-200 rounded-xl text-zinc-500 shadow-xs">
              Menghitung statistik siswa...
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Tab 1: Detailed Profile (hidden when print or when tab is not detail) */}
              <div className={`no-print ${activeTab === "detail" ? "block" : "hidden"}`}>
                <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-6">
                  
                  {/* Avatar & Title Row */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-zinc-100">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      {selectedStudent.foto_url ? (
                        <div 
                          onClick={() => setShowPhotoModal(selectedStudent.foto_url)}
                          className="relative group cursor-zoom-in overflow-hidden rounded-2xl border-2 border-mustard shadow-md animate-fade-in shrink-0"
                          title="Klik untuk memperbesar foto"
                        >
                          <NextImage 
                            src={selectedStudent.foto_url} 
                            alt={selectedStudent.nama_lengkap} 
                            width={96}
                            height={96}
                            className="w-24 h-24 object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-extrabold tracking-wider uppercase">
                            Zoom
                          </div>
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-2xl bg-strong-blue/10 text-strong-blue border-2 border-mustard/30 flex items-center justify-center shadow-inner">
                          <UserRound size={48} />
                        </div>
                      )}
                      <div className="text-center sm:text-left space-y-1">
                        <h3 className="text-xl font-black text-strong-blue tracking-tight">{selectedStudent.nama_lengkap}</h3>
                        <p className="text-xs text-zinc-500 font-bold">NIS: {selectedStudent.nis}</p>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Status: Aktif
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleEditStudent(selectedStudent)}
                      className="flex items-center gap-2 px-4 py-2 bg-mustard hover:bg-[#E6A600] text-strong-blue rounded-lg text-xs font-bold transition-all shadow-md shadow-mustard/20 cursor-pointer self-center sm:self-start shrink-0"
                    >
                      <Edit3 size={14} /> Edit Data
                    </button>
                  </div>

                  {/* Detailed Information Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Nama Lengkap</span>
                      <p className="font-bold text-zinc-800 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2">{selectedStudent.nama_lengkap}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Nomor Induk Siswa (NIS)</span>
                      <p className="font-bold text-zinc-800 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2">{selectedStudent.nis}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Kelas Terdaftar</span>
                      <p className="font-bold text-zinc-800 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2">
                        {classes.find(c => c.id === selectedStudent.kelas_id)?.nama_kelas || "Belum terdaftar di kelas"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Asal Sekolah</span>
                      <p className="font-bold text-zinc-800 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2">{selectedStudent.asal_sekolah || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Semester Aktif</span>
                      <p className="font-bold text-zinc-800 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2">{selectedStudent.semester || "Ganjil"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Tahun Ajaran</span>
                      <p className="font-bold text-zinc-800 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2">{selectedStudent.tahun_ajaran || "-"}</p>
                    </div>
                  </div>

                  {/* Academic Highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="p-2 bg-strong-blue/10 text-strong-blue rounded-lg">
                        <Award size={18} />
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Rata-Rata Nilai Akademik</span>
                        <p className="font-extrabold text-strong-blue text-sm">
                          {studentGrades.length > 0
                            ? (studentGrades.reduce((sum, g) => sum + g.skor, 0) / studentGrades.length).toFixed(2)
                            : "Belum ada nilai terinput"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Total Kehadiran Aktif</span>
                        <p className="font-extrabold text-emerald-600 text-sm">
                          {studentAttendance ? `${studentAttendance.hadir} Sesi` : "0 Sesi"}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Tab 2: Rapor Sheet (Visible on screen if tab is "rapor", and ALWAYS visible when printing) */}
              <div className={activeTab === "rapor" ? "block" : "hidden print:block"}>
                <div ref={printRef} className="print-container bg-white border border-zinc-200 rounded-xl p-8 space-y-8 shadow-2xl max-w-4xl mx-auto text-zinc-800 animate-fade-in">
                  
                  {/* Header Rapor */}
                  <div className="flex justify-between items-center border-b-2 print-border pb-4">
                    <div className="flex items-center gap-3">
                      {/* Mock Instansi Logo */}
                      <div className="p-3 bg-mustard rounded-xl text-strong-blue font-black text-xl flex items-center justify-center leading-none shadow-sm">
                        SG
                      </div>
                      <div>
                        <h1 className="text-xl font-black text-strong-blue print-text tracking-wide leading-none">RAPOR HASIL BELAJAR SISWA</h1>
                        <span className="text-xs text-zinc-500 print-text-muted font-bold">SG Cabang Nusantara</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 print-text-muted font-bold block uppercase tracking-wider">Semester</span>
                      <span className="font-extrabold text-strong-blue print-text text-sm">{selectedStudent.semester} {selectedStudent.tahun_ajaran}</span>
                    </div>
                  </div>

                  {/* Student Identity Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Profile Photo */}
                    <div className="md:col-span-3 flex justify-center">
                      {selectedStudent.foto_url ? (
                        <NextImage 
                          src={selectedStudent.foto_url} 
                          alt={selectedStudent.nama_lengkap} 
                          width={128}
                          height={128}
                          className="w-32 h-32 rounded-xl object-cover border-2 border-zinc-200 print-border bg-zinc-50"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-xl bg-strong-blue/10 text-strong-blue border-2 border-zinc-200 print-border flex items-center justify-center">
                          <UserRound size={64} />
                        </div>
                      )}
                    </div>

                    {/* Identity Details */}
                    <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="flex justify-between border-b border-zinc-200 print-border py-1">
                        <span className="text-zinc-500 print-text-muted font-medium">Nama Lengkap</span>
                        <span className="text-zinc-800 print-text font-bold">{selectedStudent.nama_lengkap}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-200 print-border py-1">
                        <span className="text-zinc-500 print-text-muted font-medium">Semester</span>
                        <span className="text-zinc-800 print-text font-bold">{selectedStudent.semester}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-200 print-border py-1">
                        <span className="text-zinc-500 print-text-muted font-medium">NIS</span>
                        <span className="text-zinc-800 print-text font-bold">{selectedStudent.nis}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-200 print-border py-1">
                        <span className="text-zinc-500 print-text-muted font-medium">Tahun Ajaran</span>
                        <span className="text-zinc-800 print-text font-bold">{selectedStudent.tahun_ajaran}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-200 print-border py-1">
                        <span className="text-zinc-500 print-text-muted font-medium">Kelas</span>
                        <span className="text-zinc-800 print-text font-bold">
                          {classes.find(c => c.id === selectedStudent.kelas_id)?.nama_kelas || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-200 print-border py-1">
                        <span className="text-zinc-500 print-text-muted font-medium">Asal Sekolah</span>
                        <span className="text-zinc-800 print-text font-bold">{selectedStudent.asal_sekolah}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rangkuman Metrik Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-50 border border-zinc-200 print-card rounded-xl p-4 text-center shadow-xs">
                      <span className="text-[10px] text-zinc-500 print-text-muted font-bold uppercase tracking-wider block">Rata-Rata</span>
                      <p className="text-2xl font-black text-strong-blue print-text mt-1">{avgGrade > 0 ? avgGrade.toFixed(2) : "0.00"}</p>
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded mt-1.5 ${
                        avgGrade >= 80 ? "bg-emerald-500/10 text-emerald-600" : "bg-mustard/20 text-[#A67800]"
                      }`}>
                        {overallPredicate.desc}
                      </span>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 print-card rounded-xl p-4 text-center shadow-xs">
                      <span className="text-[10px] text-zinc-500 print-text-muted font-bold uppercase tracking-wider block">Kehadiran</span>
                      <p className="text-2xl font-black text-emerald-600 print-text mt-1">{Math.round(attendancePercent)}%</p>
                      <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded mt-1.5 bg-emerald-500/10 text-emerald-600">
                        {attendancePercent >= 90 ? "Sangat Baik" : attendancePercent >= 75 ? "Baik" : "Kurang"}
                      </span>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 print-card rounded-xl p-4 text-center shadow-xs">
                      <span className="text-[10px] text-zinc-500 print-text-muted font-bold uppercase tracking-wider block">Total Hadir</span>
                      <p className="text-2xl font-black text-zinc-800 print-text mt-1">{(studentAttendance?.hadir || 0)} Sesi</p>
                      <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded mt-1.5 bg-zinc-200 print-fill-card text-zinc-600 print-text-muted">
                        Dari {studentAttendance?.total_sesi || 0} Sesi
                      </span>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 print-card rounded-xl p-4 text-center shadow-xs">
                      <span className="text-[10px] text-zinc-500 print-text-muted font-bold uppercase tracking-wider block">Predikat</span>
                      <p className="text-2xl font-black text-purple-600 print-text mt-1">{overallPredicate.letter}</p>
                      <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded mt-1.5 bg-purple-500/10 text-purple-600">
                        {overallPredicate.desc}
                      </span>
                    </div>
                  </div>

                  {/* Visualisasi Grafik Row (ApexCharts) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                    <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2 shadow-xs">
                      <h4 className="text-xs font-bold text-strong-blue tracking-wide border-b border-zinc-200 pb-2">NILAI SETIAP MAPEL</h4>
                      {studentGrades.length > 0 ? (
                        <ReactApexChart 
                          options={barChartOptions} 
                          series={barChartSeries} 
                          type="bar" 
                          height={200} 
                        />
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-[10px] text-zinc-500 font-medium">Belum ada nilai</div>
                      )}
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2 shadow-xs">
                      <h4 className="text-xs font-bold text-strong-blue tracking-wide border-b border-zinc-200 pb-2">GRAFIK KEMAMPUAN (RADAR)</h4>
                      {studentGrades.length > 0 ? (
                        <ReactApexChart 
                          options={radarChartOptions} 
                          series={radarChartSeries} 
                          type="radar" 
                          height={200} 
                        />
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-[10px] text-zinc-500 font-medium">Belum ada nilai</div>
                      )}
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2 shadow-xs">
                      <h4 className="text-xs font-bold text-strong-blue tracking-wide border-b border-zinc-200 pb-2">DISTRIBUSI NILAI</h4>
                      {studentGrades.length > 0 ? (
                        <ReactApexChart 
                          options={donutChartOptions} 
                          series={donutChartSeries} 
                          type="donut" 
                          height={200} 
                        />
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-[10px] text-zinc-500 font-medium">Belum ada nilai</div>
                      )}
                    </div>
                  </div>

                  {/* Detail Nilai & Kehadiran Table */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Attendance details */}
                    <div className="md:col-span-1 space-y-2">
                      <h4 className="text-xs font-bold text-strong-blue print-text tracking-wide border-b-2 print-border border-zinc-200 pb-2">KEHADIRAN</h4>
                      <table className="w-full text-xs text-zinc-600 print-text-muted">
                        <thead>
                          <tr className="border-b border-zinc-200 print-border">
                            <th className="py-2 text-left">Keterangan</th>
                            <th className="py-2 text-right">Jumlah</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 print-border">
                          <tr>
                            <td className="py-2 font-medium text-zinc-800 print-text">Hadir</td>
                            <td className="py-2 text-right">{(studentAttendance?.hadir || 0)} Sesi</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-medium text-zinc-800 print-text">Sakit</td>
                            <td className="py-2 text-right">{(studentAttendance?.sakit || 0)} Sesi</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-medium text-zinc-800 print-text">Izin</td>
                            <td className="py-2 text-right">{(studentAttendance?.izin || 0)} Sesi</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-medium text-zinc-800 print-text">Alpa (Alpha)</td>
                            <td className="py-2 text-right">{(studentAttendance?.alpha || 0)} Sesi</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Table of subject details (Print friendly) */}
                    <div className="md:col-span-2 space-y-2">
                      <h4 className="text-xs font-bold text-strong-blue print-text tracking-wide border-b-2 print-border border-zinc-200 pb-2">DETAIL NILAI</h4>
                      <table className="w-full text-xs text-zinc-600 print-text-muted">
                        <thead>
                          <tr className="border-b border-zinc-200 print-border">
                            <th className="py-2 text-left">Mata Pelajaran</th>
                            <th className="py-2">Kategori</th>
                            <th className="py-2 text-right">Skor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 print-border">
                          {studentGrades.map((g) => (
                            <tr key={g.id}>
                              <td className="py-2 font-medium text-zinc-800 print-text">{g.nama_mapel}</td>
                              <td className="py-2">{g.kategori}</td>
                              <td className="py-2 text-right font-bold text-strong-blue print-text">{g.skor}</td>
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
                  <div className="bg-zinc-50 border border-zinc-200 print-card rounded-xl p-5 space-y-2">
                    <h4 className="text-xs font-bold text-strong-blue print-text tracking-wide border-b border-zinc-200 print-border pb-2">CATATAN WALI KELAS</h4>
                    <p className="text-xs text-zinc-700 print-text leading-relaxed italic">
                      "{studentNote?.catatan}"
                    </p>
                    <div className="text-right text-[10px] text-zinc-500 print-text-muted font-bold mt-2">
                      Nama Guru: {studentNote?.nama_guru}
                    </div>
                  </div>

                  {/* Signatures block */}
                  <div className="grid grid-cols-2 gap-8 text-center text-xs pt-8 border-t border-zinc-200 print-border">
                    <div className="space-y-12">
                      <div>
                        <p className="text-zinc-500 print-text-muted">Dibuat Oleh,</p>
                        <p className="text-zinc-800 print-text font-bold mt-1">Staf Akademik</p>
                      </div>
                      <p className="text-zinc-600 print-text font-semibold border-b border-dashed border-zinc-400 print-border w-48 mx-auto pb-1">
                        {studentNote?.nama_guru || "Prof. Dr. Dora The Explorer"}
                      </p>
                    </div>
                    <div className="space-y-12">
                      <div>
                        <p className="text-zinc-500 print-text-muted">Mengetahui,</p>
                        <p className="text-zinc-800 print-text font-bold mt-1">Pimpinan Cabang</p>
                      </div>
                      <p className="text-zinc-600 print-text font-semibold border-b border-dashed border-zinc-400 print-border w-48 mx-auto pb-1">
                        Dr. Boots M.Pd
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Student Form Modal (No Print) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-zinc-200">
              <h3 className="font-bold text-zinc-900 text-base">
                {isEditing ? "Edit Profil Siswa" : "Registrasi Siswa Baru"}
              </h3>
              <button 
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveStudent} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500">NIS (Nomor Induk Siswa)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 250001"
                    value={formNis}
                    onChange={(e) => setFormNis(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kim Nam-joon"
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500">Kelas</label>
                  <select
                    value={formKelasId}
                    onChange={(e) => setFormKelasId(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                  >
                    <option value="">-- Pilih Kelas (Opsional) --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.nama_kelas}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500">Asal Sekolah</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SMP Negeri Wakanda"
                    value={formAsalSekolah}
                    onChange={(e) => setFormAsalSekolah(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500">Semester</label>
                  <select
                    value={formSemester}
                    onChange={(e) => setFormSemester(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500">Tahun Ajaran</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 2025/2026"
                    value={formTahun}
                    onChange={(e) => setFormTahun(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 block">Foto Profil (Opsional)</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-bold text-zinc-600 transition-all cursor-pointer shadow-xs">
                    <Upload size={14} className="text-strong-blue" /> Pilih File Gambar
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (!file.type.startsWith("image/")) {
                            alert("Format berkas tidak didukung. Silakan pilih file gambar.");
                            e.target.value = "";
                            setFormFile(null);
                            return;
                          }
                          if (file.size > 10 * 1024 * 1024) {
                            alert("Ukuran file gambar terlalu besar (maksimal 10 MB).");
                            e.target.value = "";
                            setFormFile(null);
                            return;
                          }
                          setFormFile(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {formFile ? (
                    <span className="text-xs text-strong-blue font-bold truncate max-w-xs">{formFile.name}</span>
                  ) : formFileUrl ? (
                    <span className="text-xs text-emerald-600 font-bold">Foto sudah diunggah</span>
                  ) : (
                    <span className="text-xs text-zinc-400">Belum ada foto terpilih</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-transparent hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-strong-blue hover:bg-[#001D6E] disabled:bg-zinc-300 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-strong-blue/10 cursor-pointer"
                >
                  {uploading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Zoom Modal */}
      {showPhotoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 no-print cursor-zoom-out animate-fade-in"
          onClick={() => setShowPhotoModal(null)}
        >
          <div 
            className="relative max-w-xl w-full max-h-[80vh] flex flex-col items-center justify-center cursor-default animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowPhotoModal(null)}
              className="absolute -top-10 right-0 text-white hover:text-mustard transition-colors flex items-center gap-1.5 text-xs font-extrabold cursor-pointer"
            >
              <X size={16} /> Tutup
            </button>
            
            {/* Large Photo Wrapper */}
            <div className="bg-white p-2 rounded-3xl border-2 border-mustard shadow-2xl">
              <NextImage 
                src={showPhotoModal} 
                alt="Foto Siswa" 
                width={500}
                height={500}
                className="max-w-full max-h-[70vh] rounded-2xl object-contain shadow-inner"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
