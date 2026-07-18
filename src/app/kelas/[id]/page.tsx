"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Layers, 
  Plus, 
  Edit3, 
  Trash2, 
  Search,
  Users, 
  BookOpen,
  ArrowLeft,
  X,
  UserPlus,
  UserMinus,
  TrendingUp,
  Award,
  CalendarDays,
  Calendar,
  FileSpreadsheet,
  ClipboardCheck,
  Clock,
  Save,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  GraduationCap,
  Shuffle
} from "lucide-react";

interface Kelas {
  id: string;
  nama_kelas: string;
  tahun_ajaran: string;
  deskripsi: string | null;
  jenjang: string;
  created_at: string;
}

interface MataPelajaran {
  id: string;
  nama_mapel: string;
  kategori: string;
  jenjang: string;
}

interface Siswa {
  id: string;
  nama_lengkap: string;
  nis: string;
  kelas_id: string | null;
  foto_url: string | null;
  jenjang?: string;
}

interface SubjectGrade {
  skor: number | "";
  materi: string;
  kode_tentor: string;
  tanggal_pembelajaran: string;
}

interface AcademicRow {
  id?: string;
  mapel_id: string;
  nama_mapel: string;
  kategori: string;
  skor: number | "";
  materi: string;
  kode_tentor: string;
  tanggal_pembelajaran: string;
  jam: string;
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
  const [formJenjang, setFormJenjang] = useState("SD");

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
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [sortBy, setSortBy] = useState<"nama" | "nilai" | "kehadiran">("nama");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [activeDropdownStudentId, setActiveDropdownStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classList, setClassList] = useState<Kelas[]>([]);
  const [academicGrades, setAcademicGrades] = useState<{ rows: AcademicRow[] }>({ rows: [] });
  const [deletedGradeIds, setDeletedGradeIds] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerTargetRow, setDatePickerTargetRow] = useState<number | null>(null);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date().getMonth());
  const [datePickerYear, setDatePickerYear] = useState(new Date().getFullYear());
  const [showSubjectSelector, setShowSubjectSelector] = useState(false);
  const [subjectSelectorTargetRow, setSubjectSelectorTargetRow] = useState<number | null>(null);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
  const [confirmRemoveStudent, setConfirmRemoveStudent] = useState<Siswa | null>(null);
  const [confirmMoveStudent, setConfirmMoveStudent] = useState<Siswa | null>(null);
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [confirmGraduateStudent, setConfirmGraduateStudent] = useState<Siswa | null>(null);

  // Statistics states
  const [classAverage, setClassAverage] = useState<number>(0);
  const [classAttendance, setClassAttendance] = useState<number>(0);

  useEffect(() => {
    if (classId) {
      fetchClassData();
      fetchClassDetails();
      fetchSubjects();
      fetchClassList();
    }
  }, [classId]);

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

  const fetchClassList = async () => {
    try {
      const { data } = await supabase
        .from("kelas")
        .select("*")
        .order("nama_kelas");
      setClassList(data || []);
    } catch (err) {
      console.error("Error fetching class list:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, prefix: string, currentIndex: number) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextInput = document.getElementById(`${prefix}-${currentIndex + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
        (nextInput as HTMLInputElement).select();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevInput = document.getElementById(`${prefix}-${currentIndex - 1}`);
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
        (prevInput as HTMLInputElement).select();
      }
    }
  };

  const openDatePicker = (idx: number, currentDateStr: string) => {
    setDatePickerTargetRow(idx);
    let initialDate = new Date();
    if (currentDateStr) {
      const parsed = new Date(currentDateStr);
      if (!isNaN(parsed.getTime())) {
        initialDate = parsed;
      }
    }
    setDatePickerMonth(initialDate.getMonth());
    setDatePickerYear(initialDate.getFullYear());
    setShowDatePicker(true);
  };

  const handleSelectDatePickerDate = (day: number) => {
    if (datePickerTargetRow === null) return;
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${datePickerYear}-${pad(datePickerMonth + 1)}-${pad(day)}`;
    
    setAcademicGrades(prev => {
      const currentRows = [...prev.rows];
      currentRows[datePickerTargetRow] = {
        ...currentRows[datePickerTargetRow],
        tanggal_pembelajaran: dateStr
      };
      return { rows: currentRows };
    });
    
    setShowDatePicker(false);
    setDatePickerTargetRow(null);
  };

  const openSubjectSelector = (idx: number) => {
    setSubjectSelectorTargetRow(idx);
    setSubjectSearchQuery("");
    setShowSubjectSelector(true);
  };

  const handleSelectSubject = (subjectId: string, subjectName: string, category: string) => {
    if (subjectSelectorTargetRow === null) return;
    
    setAcademicGrades(prev => {
      const currentRows = [...prev.rows];
      currentRows[subjectSelectorTargetRow] = {
        ...currentRows[subjectSelectorTargetRow],
        mapel_id: subjectId,
        nama_mapel: subjectName,
        kategori: category
      };
      return { rows: currentRows };
    });
    
    setShowSubjectSelector(false);
    setSubjectSelectorTargetRow(null);
  };

  const addAcademicRow = () => {
    setAcademicGrades(prev => ({
      rows: [
        ...prev.rows,
        {
          mapel_id: "",
          nama_mapel: "",
          kategori: "",
          skor: "",
          materi: "",
          kode_tentor: "",
          tanggal_pembelajaran: new Date().toISOString().split("T")[0],
          jam: ""
        }
      ]
    }));
  };

  const removeAcademicRow = (idx: number) => {
    setAcademicGrades(prev => {
      const currentRows = [...prev.rows];
      const target = currentRows[idx];
      if (target && target.id) {
        setDeletedGradeIds(d => [...d, target.id!]);
      }
      currentRows.splice(idx, 1);
      return { rows: currentRows };
    });
  };

  const openInputModal = async (student: Siswa) => {
    setModalStudent(student);
    setHadir(0);
    setSakit(0);
    setIzen(0);
    setAlpha(0);
    setCatatan("");
    setNamaGuru("");
    setAcademicGrades({ rows: [] });
    setDeletedGradeIds([]);
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

      // 3. Fetch all grades for this student
      const { data: gradesData } = await supabase
        .from("nilai")
        .select(`
          id,
          skor,
          mapel_id,
          materi,
          kode_tentor,
          tanggal_pembelajaran,
          jam,
          mata_pelajaran (nama_mapel, kategori)
        `)
        .eq("siswa_id", student.id);
      
      const rows: AcademicRow[] = [];
      if (gradesData) {
        gradesData.forEach((g: any) => {
          rows.push({
            id: g.id,
            mapel_id: g.mapel_id,
            nama_mapel: g.mata_pelajaran?.nama_mapel || "Mata Pelajaran",
            kategori: g.mata_pelajaran?.kategori || "Wajib",
            skor: g.skor !== null ? Number(g.skor) : "",
            materi: g.materi || "",
            kode_tentor: g.kode_tentor || "",
            tanggal_pembelajaran: g.tanggal_pembelajaran || new Date().toISOString().split("T")[0],
            jam: g.jam || ""
          });
        });
      }

      if (rows.length === 0) {
        rows.push({
          mapel_id: "",
          nama_mapel: "",
          kategori: "",
          skor: "",
          materi: "",
          kode_tentor: "",
          tanggal_pembelajaran: new Date().toISOString().split("T")[0],
          jam: ""
        });
      }
      setAcademicGrades({ rows });
    } catch (err) {
      console.error("Error loading modal data:", err);
    }
  };

  const handleSaveModalData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalStudent) return;
    setModalSaving(true);
    setModalFeedback(null);

    try {
      // 1. Delete rows that were removed in the UI
      if (deletedGradeIds.length > 0) {
        const { error: delError } = await supabase
          .from("nilai")
          .delete()
          .in("id", deletedGradeIds);
        if (delError) throw delError;
      }

      // 2. Insert or Update remaining rows
      for (const row of academicGrades.rows) {
        if (!row.mapel_id && row.skor === "" && !row.materi && !row.kode_tentor && !row.jam) {
          continue;
        }

        if (!row.mapel_id) {
          throw new Error("Mata pelajaran harus dipilih untuk setiap baris yang diisi.");
        }

        if (row.skor !== "" && (Number(row.skor) < 0 || Number(row.skor) > 100)) {
          throw new Error("Skor nilai harus berada dalam rentang 0 sampai 100.");
        }

        const payload = {
          siswa_id: modalStudent.id,
          mapel_id: row.mapel_id,
          skor: row.skor !== "" ? Number(row.skor) : null,
          materi: row.materi || null,
          kode_tentor: row.kode_tentor || null,
          tanggal_pembelajaran: row.tanggal_pembelajaran || null,
          jam: row.jam || null
        };

        if (row.id) {
          const { error: updError } = await supabase
            .from("nilai")
            .update(payload)
            .eq("id", row.id);
          if (updError) throw updError;
        } else {
          const { error: insError } = await supabase
            .from("nilai")
            .insert(payload);
          if (insError) throw insError;
        }
      }

      // 3. Save Attendance
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

      // 4. Save Notes
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
    
    setCalendarYear(year);
    setCalendarMonth(month);

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

  const handleMonthChange = (newMonth: number, newYear: number) => {
    const aggs = getCalendarAggregates();
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);

    const daysInMonth = new Date(newYear, newMonth + 1, 0).getDate();
    const initialDays: Record<number, "H" | "S" | "I" | "A" | "N"> = {};
    let hLeft = aggs.hadir;
    let sLeft = aggs.sakit;
    let iLeft = aggs.izin;
    let aLeft = aggs.alpha;

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

  const handleSort = (criteria: "nama" | "nilai" | "kehadiran") => {
    if (sortBy === criteria) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(criteria);
      setSortOrder(criteria === "nama" ? "asc" : "desc");
    }
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
      setFormJenjang(data.jenjang || "SD");
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
          jenjang: formJenjang,
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

  const executeRemoveStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from("siswa")
        .update({ kelas_id: null })
        .eq("id", studentId);

      if (error) throw error;
      setConfirmRemoveStudent(null);
      fetchClassDetails();
    } catch (err) {
      console.error("Error removing student:", err);
    }
  };

  const executeMoveStudent = async (studentId: string, destClassId: string) => {
    if (!destClassId) return;
    try {
      const { error } = await supabase
        .from("siswa")
        .update({ kelas_id: destClassId })
        .eq("id", studentId);

      if (error) throw error;
      setConfirmMoveStudent(null);
      setTargetClassId("");
      fetchClassDetails();
    } catch (err) {
      console.error("Error moving student:", err);
    }
  };

  const executeGraduateStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from("siswa")
        .update({ kelas_id: null })
        .eq("id", studentId);

      if (error) throw error;
      setConfirmGraduateStudent(null);
      fetchClassDetails();
    } catch (err) {
      console.error("Error graduating student:", err);
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Jumlah Siswa */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 flex items-center gap-4 shadow-xs min-h-[110px]">
              <div className="p-3.5 bg-mustard/10 text-[#D49B00] rounded-xl shrink-0">
                <Users size={24} />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Jumlah Siswa</span>
                <p className="text-2xl font-black text-[#D49B00] mt-0.5">{students.length} Siswa</p>
              </div>
            </div>

            {/* Card 2: Rata-Rata Kelas */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 flex items-center gap-4 shadow-xs min-h-[110px]">
              <div className="p-3.5 bg-strong-blue/10 text-strong-blue rounded-xl shrink-0">
                <Award size={24} />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Rata-Rata Kelas</span>
                <p className="text-2xl font-black text-strong-blue mt-0.5">{classAverage > 0 ? `${classAverage}` : "Belum ada nilai"}</p>
              </div>
            </div>
            
            {/* Card 3: Kehadiran Kelas */}
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-100 pb-3">
              <h4 className="font-extrabold text-strong-blue text-sm flex items-center gap-2">
                <Users size={16} /> Anggota Kelas
              </h4>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-zinc-400" size={14} />
                <input
                  type="text"
                  placeholder="Cari nama atau NIS siswa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-zinc-50 hover:bg-zinc-100/50 border border-zinc-200 focus:border-strong-blue focus:bg-white rounded-lg text-xs text-zinc-900 focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {students.length === 0 ? (
              <div className="py-12 bg-cool-gray/10 border border-zinc-200 border-dashed rounded-xl text-center text-xs text-zinc-500 font-medium">
                Tidak ada siswa terdaftar di kelas ini.
              </div>
            ) : (
              <div className="border border-zinc-200 rounded-xl bg-white shadow-xs">
                <table className="w-full text-left text-xs text-zinc-600">
                  <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center text-zinc-400 font-bold rounded-tl-xl">No</th>
                      <th className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleSort("nama")}
                          className="hover:text-strong-blue inline-flex items-center gap-1 cursor-pointer font-bold focus:outline-none"
                        >
                          Nama Siswa
                          <span className="text-[10px] text-zinc-400">
                            {sortBy === "nama" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                          </span>
                        </button>
                      </th>
                      <th className="px-4 py-3">NIS</th>
                      <th className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleSort("nilai")}
                          className="hover:text-strong-blue inline-flex items-center gap-1 cursor-pointer font-bold focus:outline-none"
                        >
                          Rata-rata Nilai
                          <span className="text-[10px] text-zinc-400">
                            {sortBy === "nilai" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                          </span>
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleSort("kehadiran")}
                          className="hover:text-strong-blue inline-flex items-center gap-1 cursor-pointer font-bold focus:outline-none"
                        >
                          Kehadiran
                          <span className="text-[10px] text-zinc-400">
                            {sortBy === "kehadiran" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                          </span>
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right rounded-tr-xl">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {(() => {
                      const filteredList = students.filter(student => 
                        student.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        student.nis.toLowerCase().includes(searchQuery.toLowerCase())
                      );

                      if (filteredList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-zinc-500 font-medium italic">
                              Tidak ada siswa yang cocok dengan pencarian "{searchQuery}"
                            </td>
                          </tr>
                        );
                      }

                      const sortedList = [...filteredList].sort((a, b) => {
                        let comparison = 0;
                        if (sortBy === "nama") {
                          comparison = a.nama_lengkap.localeCompare(b.nama_lengkap);
                        } else if (sortBy === "nilai") {
                          const scoreA = a.averageScore || 0;
                          const scoreB = b.averageScore || 0;
                          comparison = scoreA - scoreB;
                        } else if (sortBy === "kehadiran") {
                          const attA = a.attendanceRate || 0;
                          const attB = b.attendanceRate || 0;
                          comparison = attA - attB;
                        }
                        return sortOrder === "asc" ? comparison : -comparison;
                      });
                      return sortedList.map((student, idx) => (
                        <tr 
                          key={student.id} 
                          onClick={() => router.push(`/siswa?id=${student.id}`)}
                          className="hover:bg-zinc-100/75 cursor-pointer transition-colors duration-150"
                        >
                          <td className="px-4 py-3 text-center font-bold text-zinc-400">{idx + 1}</td>
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
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownStudentId(
                                    activeDropdownStudentId === student.id ? null : student.id
                                  );
                                }}
                                className="p-1 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 rounded-lg cursor-pointer transition-colors"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {activeDropdownStudentId === student.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDropdownStudentId(null);
                                    }}
                                  />
                                  <div 
                                    className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 py-1.5 w-44 animate-scale-up text-left"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownStudentId(null);
                                        openInputModal(student);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 cursor-pointer font-bold"
                                    >
                                      <ClipboardCheck size={14} className="text-mustard" /> Input Nilai & Absen
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownStudentId(null);
                                        setConfirmMoveStudent(student);
                                        setTargetClassId("");
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 cursor-pointer font-bold border-t border-zinc-100"
                                    >
                                      <Shuffle size={14} className="text-strong-blue" /> Pindahkan Kelas
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownStudentId(null);
                                        setConfirmGraduateStudent(student);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-600 hover:bg-emerald-50 cursor-pointer font-bold border-t border-zinc-100"
                                    >
                                      <GraduationCap size={14} /> Luluskan Siswa
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownStudentId(null);
                                        setConfirmRemoveStudent(student);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer font-bold border-t border-zinc-100"
                                    >
                                      <UserMinus size={14} /> Keluarkan dari Kelas
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
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
                <label className="text-xs font-bold text-zinc-500">Jenjang</label>
                <select
                  value={formJenjang}
                  onChange={(e) => setFormJenjang(e.target.value)}
                  required
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                >
                  <option value="SD">SD</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                </select>
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
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden animate-scale-up">
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
                  
                  <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left text-xs text-zinc-600">
                      <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200 sticky top-0 z-10 shadow-xs">
                        <tr>
                          <th className="px-4 py-2.5 w-12 text-center">No</th>
                          <th className="px-4 py-2.5 w-44">Tanggal</th>
                          <th className="px-4 py-2.5 w-28 text-center">Jam</th>
                          <th className="px-4 py-2.5 w-60">Mata Pelajaran</th>
                          <th className="px-4 py-2.5 min-w-[200px]">Materi Pembelajaran</th>
                          <th className="px-4 py-2.5 w-28 text-center">Kode Tentor</th>
                          <th className="px-4 py-2.5 w-24 text-center">Skor</th>
                          <th className="px-4 py-2.5 w-12 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {(academicGrades.rows || []).map((row, idx) => {
                          return (
                            <tr key={idx} className="hover:bg-zinc-50/50 animate-fade-in">
                              <td className="px-4 py-2 text-center font-bold text-zinc-400">{idx + 1}</td>
                              
                              {/* Tanggal column */}
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => openDatePicker(idx, row.tanggal_pembelajaran)}
                                  className="w-full text-left bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 focus:border-strong-blue rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 font-medium transition-colors flex items-center justify-between cursor-pointer"
                                >
                                  <span>
                                    {row.tanggal_pembelajaran
                                      ? new Date(row.tanggal_pembelajaran).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })
                                      : "Atur Tanggal"}
                                  </span>
                                  <CalendarDays size={12} className="text-zinc-400" />
                                </button>
                              </td>

                              {/* Jam column */}
                              <td className="px-4 py-2">
                                <input
                                  id={`grade-jam-${idx}`}
                                  type="text"
                                  placeholder="19.00"
                                  value={row.jam}
                                  onChange={(e) => {
                                    setAcademicGrades(prev => {
                                      const currentRows = [...prev.rows];
                                      currentRows[idx] = { ...currentRows[idx], jam: e.target.value };
                                      return { rows: currentRows };
                                    });
                                  }}
                                  onKeyDown={(e) => handleKeyDown(e, 'grade-jam', idx)}
                                  className="w-full text-center bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-strong-blue rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none transition-colors font-mono focus:ring-1 focus:ring-strong-blue"
                                />
                              </td>

                              {/* Mata Pelajaran column */}
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => openSubjectSelector(idx)}
                                  className="w-full text-left bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 focus:border-strong-blue rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 font-semibold transition-colors flex items-center justify-between cursor-pointer"
                                >
                                  <span className="truncate max-w-[180px]">
                                    {row.nama_mapel
                                      ? `${row.nama_mapel} (${row.kategori})`
                                      : "Pilih Mapel..."}
                                  </span>
                                  <Search size={12} className="text-zinc-400" />
                                </button>
                              </td>

                              {/* Materi Pembelajaran column */}
                              <td className="px-4 py-2">
                                <input
                                  id={`grade-materi-${idx}`}
                                  type="text"
                                  placeholder="Bahas soal..."
                                  value={row.materi}
                                  onChange={(e) => {
                                    setAcademicGrades(prev => {
                                      const currentRows = [...prev.rows];
                                      currentRows[idx] = { ...currentRows[idx], materi: e.target.value };
                                      return { rows: currentRows };
                                    });
                                  }}
                                  onKeyDown={(e) => handleKeyDown(e, 'grade-materi', idx)}
                                  className="w-full bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-strong-blue rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none transition-colors focus:ring-1 focus:ring-strong-blue"
                                />
                              </td>

                              {/* Kode Tentor column */}
                              <td className="px-4 py-2">
                                <input
                                  id={`grade-tentor-${idx}`}
                                  type="text"
                                  placeholder="Tentor..."
                                  value={row.kode_tentor}
                                  onChange={(e) => {
                                    setAcademicGrades(prev => {
                                      const currentRows = [...prev.rows];
                                      currentRows[idx] = { ...currentRows[idx], kode_tentor: e.target.value };
                                      return { rows: currentRows };
                                    });
                                  }}
                                  onKeyDown={(e) => handleKeyDown(e, 'grade-tentor', idx)}
                                  className="w-full text-center bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-strong-blue rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none transition-colors font-mono focus:ring-1 focus:ring-strong-blue"
                                />
                              </td>

                              {/* Skor column */}
                              <td className="px-4 py-2">
                                <input
                                  id={`grade-skor-${idx}`}
                                  type="number"
                                  min={0}
                                  max={100}
                                  placeholder="-"
                                  value={row.skor}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? "" : Number(e.target.value);
                                    setAcademicGrades(prev => {
                                      const currentRows = [...prev.rows];
                                      currentRows[idx] = { ...currentRows[idx], skor: val };
                                      return { rows: currentRows };
                                    });
                                  }}
                                  onKeyDown={(e) => handleKeyDown(e, 'grade-skor', idx)}
                                  className="w-full text-center bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-strong-blue rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none transition-colors font-bold font-mono focus:ring-1 focus:ring-strong-blue"
                                />
                              </td>

                              {/* Aksi column */}
                              <td className="px-4 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeAcademicRow(idx)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                  title="Hapus Baris"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {(!academicGrades.rows || academicGrades.rows.length === 0) && (
                          <tr>
                            <td colSpan={8} className="px-4 py-6 text-center text-xs text-zinc-500 italic">
                              Belum ada materi ditambahkan. Klik tombol di bawah untuk menambah baris.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={addAcademicRow}
                      className="flex items-center gap-1.5 px-4 py-2 bg-strong-blue/10 hover:bg-strong-blue/20 text-strong-blue font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      <Plus size={14} /> Tambah Baris
                    </button>
                  </div>
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

      {/* Date Picker Modal */}
      {showDatePicker && datePickerTargetRow !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex justify-between items-center p-4 border-b border-zinc-200 bg-zinc-50">
              <span className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                <CalendarDays size={14} className="text-strong-blue" /> Atur Tanggal
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowDatePicker(false);
                  setDatePickerTargetRow(null);
                }}
                className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-800 rounded-lg cursor-pointer transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    if (datePickerMonth === 0) {
                      setDatePickerMonth(11);
                      setDatePickerYear(prev => prev - 1);
                    } else {
                      setDatePickerMonth(prev => prev - 1);
                    }
                  }}
                  className="p-1 hover:bg-zinc-200 text-zinc-600 rounded-md cursor-pointer transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                
                <span className="font-extrabold text-zinc-700 text-xs uppercase">
                  {[
                    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
                  ][datePickerMonth]} {datePickerYear}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (datePickerMonth === 11) {
                      setDatePickerMonth(0);
                      setDatePickerYear(prev => prev + 1);
                    } else {
                      setDatePickerMonth(prev => prev + 1);
                    }
                  }}
                  className="p-1 hover:bg-zinc-200 text-zinc-600 rounded-md cursor-pointer transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-zinc-400 border-b border-zinc-100 pb-1.5">
                <div>Min</div>
                <div>Sen</div>
                <div>Sel</div>
                <div>Rab</div>
                <div>Kam</div>
                <div>Jum</div>
                <div>Sab</div>
              </div>

              <div className="grid grid-cols-7 gap-1 justify-items-center">
                {Array.from({ length: new Date(datePickerYear, datePickerMonth, 1).getDay() }).map((_, idx) => (
                  <div key={`offset-${idx}`} className="w-8 h-8"></div>
                ))}

                {Array.from({ length: new Date(datePickerYear, datePickerMonth + 1, 0).getDate() }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const isToday = new Date().getDate() === dayNum && new Date().getMonth() === datePickerMonth && new Date().getFullYear() === datePickerYear;
                  return (
                    <button
                      key={`dp-day-${dayNum}`}
                      type="button"
                      onClick={() => handleSelectDatePickerDate(dayNum)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-90 relative ${
                        isToday ? "bg-mustard text-strong-blue shadow-xs border border-mustard font-black" : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200/60"
                      }`}
                    >
                      <span>{dayNum}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subject Selector Modal */}
      {showSubjectSelector && subjectSelectorTargetRow !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex justify-between items-center p-4 border-b border-zinc-200 bg-zinc-50">
              <span className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                <Search size={14} className="text-strong-blue" /> Cari Mata Pelajaran
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowSubjectSelector(false);
                  setSubjectSelectorTargetRow(null);
                }}
                className="p-1 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-800 rounded-lg cursor-pointer transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari mapel atau kategori..."
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                />
                <Search size={12} className="absolute left-3 top-3 text-zinc-400" />
              </div>

              <div className="max-h-[250px] overflow-y-auto border border-zinc-200 rounded-lg divide-y divide-zinc-100 bg-white">
                {(() => {
                  const filtered = subjects
                    .filter((subj) => subj.jenjang === (kelas?.jenjang || "SD"))
                    .filter((subj) => 
                      subj.nama_mapel.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
                      subj.kategori.toLowerCase().includes(subjectSearchQuery.toLowerCase())
                    );
                  if (filtered.length === 0) {
                    return (
                      <div className="p-4 text-center text-xs text-zinc-500 italic">
                        Tidak ada mata pelajaran yang cocok.
                      </div>
                    );
                  }
                  return filtered.map((subj) => (
                    <button
                      key={subj.id}
                      type="button"
                      onClick={() => handleSelectSubject(subj.id, subj.nama_mapel, subj.kategori)}
                      className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 text-xs transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-semibold text-zinc-900">{subj.nama_mapel}</span>
                      <span className="text-[10px] bg-zinc-100 text-zinc-600 font-bold px-2 py-0.5 rounded-full border border-zinc-200">
                        {subj.kategori}
                      </span>
                    </button>
                  ));
                })()}
              </div>
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
                    {Object.keys(calendarDays).map((dayStr) => {
                      const dayNum = Number(dayStr);
                      const status = calendarDays[dayNum];
                      
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

      {/* Modal Konfirmasi Keluarkan Siswa */}
      {confirmRemoveStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex items-center gap-2">
              <AlertCircle className="text-red-500" size={18} />
              <h3 className="font-extrabold text-zinc-900 text-sm">Konfirmasi Keluarkan Siswa</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Apakah Anda yakin ingin mengeluarkan siswa <strong className="text-zinc-900">{confirmRemoveStudent.nama_lengkap}</strong> dari kelas <strong className="text-zinc-900">{kelas.nama_kelas}</strong>?
              </p>
              <p className="text-[11px] text-zinc-400 font-medium">
                Siswa ini tidak akan terdaftar di kelas manapun setelah dikeluarkan, namun seluruh riwayat data akademiknya tetap tersimpan di database.
              </p>
            </div>
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemoveStudent(null)}
                className="px-3.5 py-2 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeRemoveStudent(confirmRemoveStudent.id)}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Keluarkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Pindahkan Kelas */}
      {confirmMoveStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex items-center gap-2">
              <Shuffle className="text-strong-blue" size={18} />
              <h3 className="font-extrabold text-zinc-900 text-sm">Pindahkan Kelas</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Pilih kelas tujuan baru untuk memindahkan siswa <strong className="text-zinc-900">{confirmMoveStudent.nama_lengkap}</strong>:
              </p>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Kelas Tujuan</label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                >
                  <option value="">-- Pilih Kelas Tujuan --</option>
                  {classList
                    .filter((c) => c.id !== classId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama_kelas} ({c.tahun_ajaran})
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmMoveStudent(null);
                  setTargetClassId("");
                }}
                className="px-3.5 py-2 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!targetClassId}
                onClick={() => executeMoveStudent(confirmMoveStudent.id, targetClassId)}
                className={`px-3.5 py-2 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer ${
                  targetClassId ? "bg-strong-blue hover:bg-[#001D6E]" : "bg-zinc-300 cursor-not-allowed"
                }`}
              >
                Pindahkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Luluskan Siswa */}
      {confirmGraduateStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex items-center gap-2">
              <GraduationCap className="text-emerald-500" size={18} />
              <h3 className="font-extrabold text-zinc-900 text-sm">Konfirmasi Luluskan Siswa</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Apakah Anda yakin siswa <strong className="text-zinc-900">{confirmGraduateStudent.nama_lengkap}</strong> telah Lulus?
              </p>
              <p className="text-[11px] text-zinc-400 font-medium">
                Tindakan ini akan mengeluarkan siswa secara hormat dari kelas saat ini dan mengosongkan status kelas terdaftarnya (Lulus). Seluruh data akademik sejarah siswa ini tetap tersimpan.
              </p>
            </div>
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmGraduateStudent(null)}
                className="px-3.5 py-2 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeGraduateStudent(confirmGraduateStudent.id)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Ya, Luluskan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
