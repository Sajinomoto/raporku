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
  ArrowLeft,
  ClipboardCheck,
  FileSpreadsheet,
  Save,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

// Dynamically import ReactApexChart to prevent SSR window error
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
import NextImage from "next/image";

interface Kelas {
  id: string;
  nama_kelas: string;
  tahun_ajaran: string;
  jenjang: string;
}

interface MataPelajaran {
  id: string;
  nama_mapel: string;
  kategori: string;
  jenjang: string;
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
  jenjang?: string;
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
  const [activeTab, setActiveTab] = useState<"detail" | "rapor" | "input">("detail");
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
  const [formJenjang, setFormJenjang] = useState("SD");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formFileUrl, setFormFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Input Inline states
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
  const [calendarDays, setCalendarDays] = useState<Record<string, "H" | "S" | "I" | "A" | "N">>({});
  const [activeCategory, setActiveCategory] = useState<"H" | "S" | "I" | "A" | "N">("H");
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState<Siswa | null>(null);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Ref for print area
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data } = await supabase
        .from("mata_pelajaran")
        .select("id, nama_mapel, kategori, jenjang")
        .order("nama_mapel");
      setSubjects(data || []);
    } catch (err) {
      console.error("Error fetching subjects:", err);
    }
  };

  const openInputInline = async (student: Siswa) => {
    setSelectedSubjectId("");
    setSkor("");
    setHadir(0);
    setSakit(0);
    setIzen(0);
    setAlpha(0);
    setCatatan("");
    setNamaGuru("");
    setModalFeedback(null);

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
      console.error("Error loading inline data:", err);
    }
  };

  const initializeCalendarFromTotals = (h: number, s: number, i: number, a: number, startYear: number, startMonth: number) => {
    const initialDays: Record<string, "H" | "S" | "I" | "A" | "N"> = {};
    let hLeft = h;
    let sLeft = s;
    let iLeft = i;
    let aLeft = a;

    let currentYear = startYear;
    let currentMonth = startMonth;

    while (hLeft > 0 || sLeft > 0 || iLeft > 0 || aLeft > 0) {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      for (let d = daysInMonth; d >= 1; d--) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        
        // Skip future dates
        const cellDate = new Date(currentYear, currentMonth, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (cellDate.getTime() > today.getTime()) {
          continue;
        }

        if (hLeft > 0) {
          initialDays[dateStr] = "H";
          hLeft--;
        } else if (sLeft > 0) {
          initialDays[dateStr] = "S";
          sLeft--;
        } else if (iLeft > 0) {
          initialDays[dateStr] = "I";
          iLeft--;
        } else if (aLeft > 0) {
          initialDays[dateStr] = "A";
          aLeft--;
        } else {
          break;
        }
      }
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      if (currentYear < startYear - 1) break;
    }
    return initialDays;
  };

  const openCalendarModal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    setCalendarYear(year);
    setCalendarMonth(month);

    const initialDays = initializeCalendarFromTotals(hadir, sakit, izin, alpha, year, month);

    setCalendarDays(initialDays);
    setActiveCategory("H");
    setShowCalendarModal(true);
  };

  const handleMonthChange = (newMonth: number, newYear: number) => {
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
  };

  const clickDay = (dayNum: number) => {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    setCalendarDays((prev) => ({
      ...prev,
      [dateStr]: activeCategory
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

  const handleSubjectChange = async (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    if (!selectedStudent || !subjectId) {
      setSkor("");
      return;
    }
    try {
      const { data: gradeData } = await supabase
        .from("nilai")
        .select("skor")
        .eq("siswa_id", selectedStudent.id)
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
    if (!selectedStudent) return;
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
          .eq("siswa_id", selectedStudent.id)
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
              siswa_id: selectedStudent.id,
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
        .eq("siswa_id", selectedStudent.id)
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
            siswa_id: selectedStudent.id,
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
        .eq("siswa_id", selectedStudent.id)
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
            siswa_id: selectedStudent.id,
            catatan,
            nama_guru: namaGuru || "-"
          });
        if (error) throw error;
      }

      setModalFeedback({ text: "Data berhasil disimpan!", type: "success" });
      fetchStudentReportData(selectedStudent); // Reload current student report view!
      setTimeout(() => {
        setModalFeedback(null);
      }, 3000);
    } catch (err: any) {
      setModalFeedback({ text: err.message || "Gagal menyimpan data.", type: "error" });
    } finally {
      setModalSaving(false);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("siswa")
        .select("*")
        .order("nama_lengkap", { ascending: true });

      if (error) throw error;
      setStudents(data || []);

      // Auto-open student report if ID is present in URL query parameters
      if (typeof window !== "undefined" && data && data.length > 0) {
        const params = new URLSearchParams(window.location.search);
        const studentId = params.get("id");
        if (studentId) {
          const found = data.find((s: any) => s.id === studentId);
          if (found) {
            // Delay slightly to ensure browser rendering context is ready
            setTimeout(() => {
              handleOpenReport(found);
            }, 100);
          }
        }
      }
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
        .select("id, nama_kelas, tahun_ajaran, jenjang")
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

        showToast("Perubahan data siswa berhasil disimpan!", "success");

        if (selectedStudent && selectedStudent.id === formId) {
          const updatedStudent = { ...selectedStudent, ...payload, id: formId, created_at: selectedStudent.created_at };
          setSelectedStudent(updatedStudent);
        }
      } else {
        const { error } = await supabase
          .from("siswa")
          .insert(payload);

        if (error) throw error;

        showToast("Siswa baru berhasil diregistrasikan!", "success");
      }

      setShowForm(false);
      setIsEditing(false);
      setFormNis("");
      setFormNama("");
      setFormKelasId("");
      setFormAsalSekolah("");
      setFormJenjang("SD");
      setFormFile(null);
      setFormFileUrl(null);
      fetchStudents();
    } catch (err) {
      console.error("Error saving student:", err);
      showToast("Gagal menyimpan data siswa. Silakan coba lagi.", "error");
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
    setFormJenjang(student.jenjang || "SD");
    setFormFileUrl(student.foto_url);
    setFormFile(null);
    setIsEditing(true);
    setShowForm(true);
  };

  const executeDeleteStudent = async (id: string) => {
    try {
      const { error } = await supabase
        .from("siswa")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setConfirmDeleteStudent(null);
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
    const query = searchQuery.toLowerCase();
    const matchesSearch = student.nama_lengkap.toLowerCase().includes(query) || 
                          student.nis.includes(searchQuery) ||
                          (student.asal_sekolah && student.asal_sekolah.toLowerCase().includes(query));
    const matchesClass = selectedClassFilter === "all" || 
                         (selectedClassFilter === "none" ? !student.kelas_id : student.kelas_id === selectedClassFilter);
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

  const cleanSubjectName = (name: string) => {
    return name.replace(/\s*\[(SD|SMP|SMA)\]/g, "");
  };

  const dynamicBarHeight = Math.max(240, studentGrades.length * 20);

  // Chart configuration: Horizontal Bar
  const barChartOptions = {
    chart: {
      id: "grades-bar",
      toolbar: { show: false },
      foreColor: "#475569", // slate-600
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "65%",
        borderRadius: 4,
      }
    },
    colors: ["#002583"], // Strong Blue
    xaxis: {
      categories: studentGrades.map(g => cleanSubjectName(g.nama_mapel)),
      max: 100,
      labels: {
        style: {
          fontWeight: 600,
          colors: "#475569"
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          fontWeight: 600,
          colors: "#475569"
        }
      }
    },
    grid: {
      borderColor: "#e2e8f0", // slate-200
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
      foreColor: "#475569",
    },
    plotOptions: {
      radar: {
        size: 70, // Optimized radar size for landscape/stacked width
        polygons: {
          strokeColors: "#e2e8f0",
          connectorColors: "#e2e8f0",
          fill: {
            colors: ["#f8fafc", "#ffffff"]
          }
        }
      }
    },
    colors: ["#002583"], // Strong Blue
    stroke: {
      width: 2
    },
    fill: {
      opacity: 0.15
    },
    markers: {
      size: 4
    },
    xaxis: {
      categories: studentGrades.map(g => [cleanSubjectName(g.nama_mapel), `(${g.skor})`]),
      labels: {
        style: {
          fontWeight: 700,
          colors: Array(studentGrades.length).fill("#475569"),
          fontSize: "9px"
        }
      }
    },
    yaxis: {
      max: 100,
      tickAmount: 5,
      labels: {
        style: {
          fontSize: "8px", // Smaller font size for central scale numbers
          fontWeight: 600,
          colors: "#94a3b8" // Softer gray for scale numbers
        }
      }
    },
    grid: {
      borderColor: "#e2e8f0"
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
      foreColor: "#475569",
    },
    dataLabels: {
      enabled: false // Disable percentage overlay on donut segments to prevent overlapping
    },
    labels: ["A (80-100)", "B (70-79)", "C (60-69)", "D (<60)"],
    colors: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"],
    legend: {
      position: "right" as const,
      horizontalAlign: "left" as const,
      fontSize: "11px",
      fontWeight: 600,
      markers: {
        size: 5
      },
      formatter: function(val: string, opts: any) {
        const seriesIndex = opts.seriesIndex;
        const value = opts.w.globals.series[seriesIndex];
        return val + ": " + value + " Mapel";
      }
    },
    stroke: {
      colors: ["#ffffff"],
      width: 2
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%", // Clean donut width
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "10px",
              fontWeight: 600,
              color: "#64748b",
              offsetY: -5
            },
            value: {
              show: true,
              fontSize: "16px",
              fontWeight: 800,
              color: "#0f172a",
              offsetY: 5,
              formatter: function(val: string) {
                return val;
              }
            },
            total: {
              show: true,
              label: "Mata Pelajaran",
              color: "#64748b",
              fontWeight: 700,
              fontSize: "9px",
              formatter: function (w: any) {
                const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                return String(total);
              }
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
          /* Hide non-print elements */
          aside, nav, header, button, .no-print {
            display: none !important;
          }
          
          /* Override all parent wrapper containers' styles to prevent offsets and cut-off */
          html, body, main, #__next, [class*="p-8"], [class*="flex-1"], [class*="space-y-6"] {
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            position: static !important;
            float: none !important;
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
            box-shadow: none !important;
          }
          
          /* Target print container specifically */
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 8mm !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: block !important;
            overflow: visible !important;
            box-sizing: border-box !important;
          }

          /* Force exact A4 Page dimensions and safe margins */
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          
          /* Clean styles for print cards and text */
          .print-card {
            background: #ffffff !important;
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
            background: #f8fafc !important;
          }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 15px !important;
          }
          .print-grid > div {
            min-width: 0 !important;
            overflow: hidden !important;
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
            setFormJenjang("SD");
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
              placeholder="Cari berdasarkan nama, NIS, atau asal sekolah..."
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
                      
                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                          <Layers size={12} className="text-strong-blue shrink-0" />
                          <span className="line-clamp-1">{studentClass ? studentClass.nama_kelas : "Belum ada kelas"}</span>
                        </div>
                        {student.asal_sekolah && (
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                            <School size={12} className="text-strong-blue shrink-0" />
                            <span className="line-clamp-1">{student.asal_sekolah}</span>
                          </div>
                        )}
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
                          setConfirmDeleteStudent(student);
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
                  onClick={() => {
                    setActiveTab("input");
                    if (selectedStudent) {
                      openInputInline(selectedStudent);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "input"
                      ? "bg-strong-blue text-white shadow-xs"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-strong-blue"
                  }`}
                >
                  Input Nilai & Absen
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

            <div className="space-y-6 animate-fade-in">
              
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
                        <div className="flex flex-wrap gap-1.5 items-center justify-center sm:justify-start">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Status: Aktif
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            (classes.find(c => c.id === selectedStudent.kelas_id)?.jenjang || "SD") === "SD"
                              ? "bg-sky-500/10 text-sky-600 border border-sky-500/20"
                              : (classes.find(c => c.id === selectedStudent.kelas_id)?.jenjang || "SD") === "SMP"
                              ? "bg-amber-500/10 text-[#A67800] border border-amber-500/20"
                              : "bg-red-500/10 text-red-600 border border-red-500/20"
                          }`}>
                            Jenjang: {classes.find(c => c.id === selectedStudent.kelas_id)?.jenjang || "SD"}
                          </span>
                        </div>
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
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Jenjang Pendidikan</span>
                      <p className="font-bold text-zinc-800 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2">
                        {classes.find(c => c.id === selectedStudent.kelas_id)?.jenjang || "SD"}
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
                        <p className="font-extrabold text-strong-blue text-sm min-h-[20px] flex items-center">
                          {loadingDetails ? (
                            <span className="inline-block animate-pulse bg-zinc-200 h-4 w-12 rounded" />
                          ) : studentGrades.length > 0 ? (
                            (studentGrades.reduce((sum, g) => sum + g.skor, 0) / studentGrades.length).toFixed(2)
                          ) : (
                            "Belum ada nilai terinput"
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Total Kehadiran Aktif</span>
                        <p className="font-extrabold text-emerald-600 text-sm min-h-[20px] flex items-center">
                          {loadingDetails ? (
                            <span className="inline-block animate-pulse bg-zinc-200 h-4 w-24 rounded" />
                          ) : (() => {
                            if (!studentAttendance) return "0 Sesi | 0% Kehadiran";
                            const h = studentAttendance.hadir || 0;
                            const s = studentAttendance.sakit || 0;
                            const i = studentAttendance.izin || 0;
                            const a = studentAttendance.alpha || 0;
                            const total = h + s + i + a;
                            const rate = total > 0 ? Math.round((h / total) * 100) : 0;
                            return `${h} Sesi | ${rate}% Kehadiran`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Tab 3: Inline Input Nilai & Kehadiran (hidden when not active) */}
              <div className={`no-print ${activeTab === "input" ? "block" : "hidden"}`}>
                <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-bold text-strong-blue text-sm border-b border-zinc-100 pb-2">Input Nilai & Kehadiran</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Siswa: {selectedStudent.nama_lengkap} (NIS: {selectedStudent.nis})</p>
                  </div>

                  <form onSubmit={handleSaveModalData} className="space-y-6">
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
                            {subjects
                              .filter((subj) => {
                                const studentClass = classes.find(c => c.id === selectedStudent?.kelas_id);
                                return subj.jenjang === (studentClass?.jenjang || "SD");
                              })
                              .map((subj) => (
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
                            <span className="text-xs font-extrabold text-emerald-600 mt-1 block">
                              {hadir} Hari <span className="text-[10px] text-zinc-400 font-medium font-mono">({Math.round((hadir / ((hadir + sakit + izin + alpha) || 1)) * 100)}%)</span>
                            </span>
                          </div>
                          <div className="bg-white border border-zinc-200 rounded-lg p-2 flex flex-col justify-center shadow-2xs">
                            <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Sakit</span>
                            <span className="text-xs font-extrabold text-amber-500 mt-1 block">
                              {sakit} Hari <span className="text-[10px] text-zinc-400 font-medium font-mono">({Math.round((sakit / ((hadir + sakit + izin + alpha) || 1)) * 100)}%)</span>
                            </span>
                          </div>
                          <div className="bg-white border border-zinc-200 rounded-lg p-2 flex flex-col justify-center shadow-2xs">
                            <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Izin</span>
                            <span className="text-xs font-extrabold text-strong-blue mt-1 block">
                              {izin} Hari <span className="text-[10px] text-zinc-400 font-medium font-mono">({Math.round((izin / ((hadir + sakit + izin + alpha) || 1)) * 100)}%)</span>
                            </span>
                          </div>
                          <div className="bg-white border border-zinc-200 rounded-lg p-2 flex flex-col justify-center shadow-2xs">
                            <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Alpa</span>
                            <span className="text-xs font-extrabold text-red-500 mt-1 block">
                              {alpha} Hari <span className="text-[10px] text-zinc-400 font-medium font-mono">({Math.round((alpha / ((hadir + sakit + izin + alpha) || 1)) * 100)}%)</span>
                            </span>
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
                  {loadingDetails ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Array(4).fill(0).map((_, idx) => (
                        <div key={idx} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2 animate-pulse">
                          <div className="h-3 bg-zinc-200 rounded w-16 mx-auto" />
                          <div className="h-6 bg-zinc-300 rounded w-12 mx-auto" />
                          <div className="h-3 bg-zinc-200 rounded w-20 mx-auto" />
                        </div>
                      ))}
                    </div>
                  ) : (
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
                  )}

                    {/* Visualisasi Grafik Row (ApexCharts) */}
                    {loadingDetails ? (
                      <div className="grid grid-cols-1 gap-6 print-grid">
                        {Array(3).fill(0).map((_, idx) => (
                          <div key={idx} className="bg-white border border-zinc-200 rounded-xl p-6 h-[280px] flex flex-col justify-center items-center gap-3 animate-pulse">
                            <div className="h-4 bg-zinc-200 rounded w-32" />
                            <div className="w-full flex-1 bg-zinc-50 rounded-xl flex items-center justify-center text-xs text-zinc-400 font-bold uppercase tracking-wider">
                              Memuat grafik...
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6 print-grid">
                        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2 shadow-xs">
                          <h4 className="text-xs font-bold text-strong-blue tracking-wide border-b border-zinc-200 pb-2">NILAI SETIAP MAPEL</h4>
                          {studentGrades.length > 0 ? (
                            <ReactApexChart 
                              options={barChartOptions} 
                              series={barChartSeries} 
                              type="bar" 
                              height={dynamicBarHeight} 
                            />
                          ) : (
                            <div className="h-[240px] flex items-center justify-center text-[10px] text-zinc-500 font-medium">Belum ada nilai</div>
                          )}
                        </div>

                        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2 shadow-xs">
                          <h4 className="text-xs font-bold text-strong-blue tracking-wide border-b border-zinc-200 pb-2">GRAFIK KEMAMPUAN (RADAR)</h4>
                          {studentGrades.length > 0 ? (
                            <ReactApexChart 
                              options={radarChartOptions} 
                              series={radarChartSeries} 
                              type="radar" 
                              height={240} 
                            />
                          ) : (
                            <div className="h-[240px] flex items-center justify-center text-[10px] text-zinc-500 font-medium">Belum ada nilai</div>
                          )}
                        </div>

                        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2 shadow-xs">
                          <h4 className="text-xs font-bold text-strong-blue tracking-wide border-b border-zinc-200 pb-2">DISTRIBUSI NILAI</h4>
                          {studentGrades.length > 0 ? (
                            <ReactApexChart 
                              options={donutChartOptions} 
                              series={donutChartSeries} 
                              type="donut" 
                              height={240} 
                            />
                          ) : (
                            <div className="h-[240px] flex items-center justify-center text-[10px] text-zinc-500 font-medium">Belum ada nilai</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Detail Nilai & Kehadiran Table */}
                    {loadingDetails ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse bg-white border border-zinc-200 rounded-xl p-6">
                        <div className="md:col-span-1 space-y-4">
                          <div className="h-4 bg-zinc-200 rounded w-24" />
                          <div className="h-32 bg-zinc-50 rounded-xl" />
                        </div>
                        <div className="md:col-span-2 space-y-4">
                          <div className="h-4 bg-zinc-200 rounded w-24" />
                          <div className="h-32 bg-zinc-50 rounded-xl" />
                        </div>
                      </div>
                    ) : (
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
                    )}

                    {/* Catatan Guru */}
                    {loadingDetails ? (
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-3 animate-pulse">
                        <div className="h-4 bg-zinc-200 rounded w-32" />
                        <div className="h-3 bg-zinc-200 rounded w-full" />
                        <div className="h-3 bg-zinc-200 rounded w-2/3" />
                      </div>
                    ) : (
                      <div className="bg-zinc-50 border border-zinc-200 print-card rounded-xl p-5 space-y-2">
                        <h4 className="text-xs font-bold text-strong-blue print-text tracking-wide border-b border-zinc-200 print-border pb-2">CATATAN WALI KELAS</h4>
                        <p className="text-xs text-zinc-700 print-text leading-relaxed italic">
                          "{studentNote?.catatan}"
                        </p>
                        <div className="text-right text-[10px] text-zinc-500 print-text-muted font-bold mt-2">
                          Nama Guru: {studentNote?.nama_guru}
                        </div>
                      </div>
                    )}

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
                    required
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                  >
                    <option value="">-- Pilih Kelas --</option>
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
                    null
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

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex justify-between items-center p-4 border-b border-zinc-200 bg-zinc-50">
              <div>
                <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                  <Clock size={16} className="text-strong-blue" /> Atur Kehadiran
                </h3>
                {/* Month/Year selector navigation */}
                <div className="flex items-center gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
                      const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
                      handleMonthChange(prevMonth, prevYear);
                    }}
                    className="p-1 hover:bg-zinc-200 text-zinc-600 rounded-md cursor-pointer transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  
                  <select
                    value={calendarMonth}
                    onChange={(e) => handleMonthChange(Number(e.target.value), calendarYear)}
                    className="bg-white border border-zinc-300 text-zinc-700 font-extrabold uppercase text-[10px] focus:outline-none cursor-pointer rounded px-1.5 py-0.5"
                  >
                    {[
                      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
                    ].map((m, idx) => (
                      <option key={idx} value={idx}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={calendarYear}
                    onChange={(e) => handleMonthChange(calendarMonth, Number(e.target.value))}
                    className="bg-white border border-zinc-300 text-zinc-700 font-extrabold uppercase text-[10px] focus:outline-none cursor-pointer rounded px-1.5 py-0.5"
                  >
                    {[calendarYear - 2, calendarYear - 1, calendarYear, calendarYear + 1, calendarYear + 2].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
                      const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
                      handleMonthChange(nextMonth, nextYear);
                    }}
                    className="p-1 hover:bg-zinc-200 text-zinc-600 rounded-md cursor-pointer transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>
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
                💡 Pilih kategori kehadiran di sebelah kanan, lalu klik tanggal pada kalender di bawah untuk menerapkannya. Tanggal hari esok/mendatang terkunci secara otomatis.
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
                    {Array.from({ length: new Date(calendarYear, calendarMonth, 1).getDay() }).map((_, idx) => (
                      <div key={`offset-${idx}`} className="w-9 h-9"></div>
                    ))}

                    {/* Active calendar days */}
                    {Array.from({ length: new Date(calendarYear, calendarMonth + 1, 0).getDate() }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                      const status = calendarDays[dateStr] || "N";
                      
                      // Calculate today highlight and future disabling
                      const cellDate = new Date(calendarYear, calendarMonth, dayNum);
                      const systemToday = new Date();
                      systemToday.setHours(0, 0, 0, 0);
                      const isFuture = cellDate.getTime() > systemToday.getTime();
                      const isToday = systemToday.getDate() === dayNum && systemToday.getMonth() === calendarMonth && systemToday.getFullYear() === calendarYear;

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
                          disabled={isFuture}
                          onClick={() => clickDay(dayNum)}
                          className={`w-9 h-9 rounded-lg font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-90 relative ${
                            isFuture ? "opacity-25 cursor-not-allowed pointer-events-none" : ""
                          } ${
                            isToday ? "ring-2 ring-mustard border-mustard" : ""
                          } ${statusColors[status]}`}
                        >
                          <span>{dayNum}</span>
                          <span className="text-[6px] opacity-75 leading-none mt-0.5">{status === "N" ? "-" : status}</span>
                          {isToday && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-mustard rounded-full ring-1 ring-white shadow-xs" title="Hari Ini" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Area: Category Selector Brush */}
                <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-zinc-200 pt-4 md:pt-0 md:pl-5 flex flex-col justify-start space-y-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Pilih Kategori</span>
                  
                  <button
                    type="button"
                    onClick={() => setActiveCategory("H")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none border ${
                      activeCategory === "H" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-500 shadow-xs ring-2 ring-emerald-500/25" 
                        : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" /> Hadir
                    </span>
                    <span className="text-[10px] opacity-80">(H)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory("S")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none border ${
                      activeCategory === "S" 
                        ? "bg-amber-50 text-amber-700 border-amber-500 shadow-xs ring-2 ring-amber-500/25" 
                        : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" /> Sakit
                    </span>
                    <span className="text-[10px] opacity-80">(S)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory("I")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none border ${
                      activeCategory === "I" 
                        ? "bg-blue-50 text-strong-blue border-strong-blue shadow-xs ring-2 ring-strong-blue/25" 
                        : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-strong-blue block" /> Izin
                    </span>
                    <span className="text-[10px] opacity-80">(I)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory("A")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none border ${
                      activeCategory === "A" 
                        ? "bg-red-50 text-red-700 border-red-500 shadow-xs ring-2 ring-red-500/25" 
                        : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" /> Alpa
                    </span>
                    <span className="text-[10px] opacity-80">(A)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory("N")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none border ${
                      activeCategory === "N" 
                        ? "bg-zinc-100 text-zinc-800 border-zinc-500 shadow-xs ring-2 ring-zinc-500/25" 
                        : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 block" /> Kosongkan
                    </span>
                    <span className="text-[10px] opacity-80">(-)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer with calculated live aggregates */}
            <div className="p-4 border-t border-zinc-200 bg-zinc-50 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-extrabold text-zinc-600 bg-white border border-zinc-200 p-2 rounded-lg">
                <span className="text-emerald-600">H: {getCalendarAggregates().hadir} ({Math.round((getCalendarAggregates().hadir / (getCalendarAggregates().total || 1)) * 100)}%)</span>
                <span className="text-amber-500">S: {getCalendarAggregates().sakit} ({Math.round((getCalendarAggregates().sakit / (getCalendarAggregates().total || 1)) * 100)}%)</span>
                <span className="text-strong-blue">I: {getCalendarAggregates().izin} ({Math.round((getCalendarAggregates().izin / (getCalendarAggregates().total || 1)) * 100)}%)</span>
                <span className="text-red-500">A: {getCalendarAggregates().alpha} ({Math.round((getCalendarAggregates().alpha / (getCalendarAggregates().total || 1)) * 100)}%)</span>
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

      {/* Modal Konfirmasi Hapus Siswa */}
      {confirmDeleteStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex items-center gap-2">
              <AlertCircle className="text-red-500" size={18} />
              <h3 className="font-extrabold text-zinc-900 text-sm">Konfirmasi Hapus Siswa</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Apakah Anda yakin ingin menghapus data siswa <strong className="text-zinc-900">{confirmDeleteStudent.nama_lengkap}</strong>?
              </p>
              <p className="text-[11px] text-zinc-400 font-medium">
                Tindakan ini bersifat permanen. Semua nilai, absensi, dan data akademik yang terhubung dengan siswa ini di dalam database juga akan dihapus sepenuhnya.
              </p>
            </div>
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteStudent(null)}
                className="px-3.5 py-2 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDeleteStudent(confirmDeleteStudent.id)}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce-in pointer-events-none">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl ${
            toast.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="text-xs font-extrabold">{toast.text}</span>
          </div>
        </div>
      )}

    </div>
  );
}
