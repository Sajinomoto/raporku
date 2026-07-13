"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ClipboardCheck, 
  User, 
  BookOpen, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Save,
  MessageSquare,
  Clock
} from "lucide-react";

interface Siswa {
  id: string;
  nis: string;
  nama_lengkap: string;
  kelas_id: string | null;
}

interface Kelas {
  id: string;
  nama_kelas: string;
}

interface MataPelajaran {
  id: string;
  nama_mapel: string;
  kategori: string;
}

export default function InputNilaiPage() {
  const [students, setStudents] = useState<Siswa[]>([]);
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Selected values
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // Form inputs
  const [skor, setSkor] = useState<number | "">("");
  
  // Attendance inputs
  const [hadir, setHadir] = useState<number>(0);
  const [sakit, setSakit] = useState<number>(0);
  const [izin, setIzen] = useState<number>(0);
  const [alpha, setAlpha] = useState<number>(0);

  // Notes inputs
  const [catatan, setCatatan] = useState("");
  const [namaGuru, setNamaGuru] = useState("");

  // Feedback states
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentAttendanceAndNote(selectedStudentId);
      if (selectedSubjectId) {
        fetchStudentSubjectGrade(selectedStudentId, selectedSubjectId);
      }
    } else {
      resetInputs();
    }
  }, [selectedStudentId]);

  useEffect(() => {
    if (selectedStudentId && selectedSubjectId) {
      fetchStudentSubjectGrade(selectedStudentId, selectedSubjectId);
    } else {
      setSkor("");
    }
  }, [selectedSubjectId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch classes
      const { data: classData } = await supabase.from("kelas").select("id, nama_kelas");
      setClasses(classData || []);

      // 2. Fetch subjects
      const { data: subjectData } = await supabase.from("mata_pelajaran").select("id, nama_mapel, kategori").order("nama_mapel");
      setSubjects(subjectData || []);

      // 3. Fetch students
      const { data: studentData } = await supabase.from("siswa").select("id, nis, nama_lengkap, kelas_id").order("nama_lengkap");
      setStudents(studentData || []);
    } catch (err) {
      console.error("Error loading initial data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAttendanceAndNote = async (studentId: string) => {
    try {
      // Fetch attendance
      const { data: attData } = await supabase
        .from("kehadiran")
        .select("hadir, sakit, izin, alpha")
        .eq("siswa_id", studentId)
        .maybeSingle();

      if (attData) {
        setHadir(attData.hadir);
        setSakit(attData.sakit);
        setIzen(attData.izin);
        setAlpha(attData.alpha);
      } else {
        setHadir(0);
        setSakit(0);
        setIzen(0);
        setAlpha(0);
      }

      // Fetch note
      const { data: noteData } = await supabase
        .from("catatan_guru")
        .select("catatan, nama_guru")
        .eq("siswa_id", studentId)
        .maybeSingle();

      if (noteData) {
        setCatatan(noteData.catatan);
        setNamaGuru(noteData.nama_guru);
      } else {
        setCatatan("");
        setNamaGuru("");
      }
    } catch (err) {
      console.error("Error loading student attendance/note:", err);
    }
  };

  const fetchStudentSubjectGrade = async (studentId: string, subjectId: string) => {
    try {
      const { data: gradeData } = await supabase
        .from("nilai")
        .select("skor")
        .eq("siswa_id", studentId)
        .eq("mapel_id", subjectId)
        .maybeSingle();

      if (gradeData) {
        setSkor(Number(gradeData.skor));
      } else {
        setSkor("");
      }
    } catch (err) {
      console.error("Error loading subject grade:", err);
    }
  };

  const resetInputs = () => {
    setSkor("");
    setHadir(0);
    setSakit(0);
    setIzen(0);
    setAlpha(0);
    setCatatan("");
    setNamaGuru("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      showFeedback("Silakan pilih siswa terlebih dahulu.", "error");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // 1. Save Grade if subject & score are specified
      if (selectedSubjectId && skor !== "") {
        if (Number(skor) < 0 || Number(skor) > 100) {
          throw new Error("Skor nilai harus berada dalam rentang 0 sampai 100.");
        }

        // Check if grade already exists for upsert
        const { data: existingGrade } = await supabase
          .from("nilai")
          .select("id")
          .eq("siswa_id", selectedStudentId)
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
              siswa_id: selectedStudentId,
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
        .eq("siswa_id", selectedStudentId)
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
            siswa_id: selectedStudentId,
            hadir,
            sakit,
            izin,
            alpha,
            total_sesi: totalSesi
          });
        if (error) throw error;
      }

      // 3. Save Teacher Note
      if (catatan.trim() || namaGuru.trim()) {
        const { data: existingNote } = await supabase
          .from("catatan_guru")
          .select("id")
          .eq("siswa_id", selectedStudentId)
          .maybeSingle();

        const notePayload = {
          siswa_id: selectedStudentId,
          catatan: catatan.trim() || "Sangat baik.",
          nama_guru: namaGuru.trim() || "Wali Kelas"
        };

        if (existingNote) {
          const { error } = await supabase
            .from("catatan_guru")
            .update({
              catatan: notePayload.catatan,
              nama_guru: notePayload.nama_guru
            })
            .eq("id", existingNote.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("catatan_guru")
            .insert(notePayload);
          if (error) throw error;
        }
      }

      showFeedback("Data nilai, kehadiran, dan catatan sukses disimpan!", "success");
    } catch (err: any) {
      console.error("Error saving data:", err);
      showFeedback(err.message || "Gagal menyimpan data ke database.", "error");
    } finally {
      setSaving(false);
    }
  };

  const showFeedback = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    // Auto clear success message
    if (type === "success") {
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const totalSesi = hadir + sakit + izin + alpha;

  return (
    <div className="p-8 flex-1 flex flex-col space-y-6 bg-[#0B0F19]">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Input Nilai & Kehadiran</h2>
        <p className="text-xs text-zinc-500 mt-1">Masukkan nilai per mata pelajaran dan rekap absen kehadiran siswa secara cepat.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-[#0F172A] border border-[#1E293B] rounded-xl text-zinc-500">
          Memuat data referensi akademik...
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: Selector Panel */}
          <div className="lg:col-span-1 bg-[#0F172A] border border-[#1E293B] rounded-xl p-5 space-y-5">
            <h3 className="font-bold text-white text-sm border-b border-[#1E293B] pb-2">1. Pilih Target Siswa & Mapel</h3>
            
            {/* Student selection */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <User size={12} className="text-indigo-400" /> Nama Siswa
              </label>
              <select
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Pilih Siswa --</option>
                {students.map((student) => {
                  const sClass = classes.find(c => c.id === student.kelas_id);
                  return (
                    <option key={student.id} value={student.id}>
                      {student.nama_lengkap} ({sClass ? sClass.nama_kelas : "Tanpa Kelas"})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Subject selection */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <BookOpen size={12} className="text-indigo-400" /> Mata Pelajaran
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Pilih Mata Pelajaran (Opsional) --</option>
                {subjects.map((subj) => (
                  <option key={subj.id} value={subj.id}>
                    {subj.nama_mapel} ({subj.kategori})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-zinc-500 block">Isi jika ingin menginput/mengubah nilai mata pelajaran tertentu.</span>
            </div>
          </div>

          {/* Right Area: Form Inputs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Feedback Notifications */}
            {message && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all duration-300 ${
                message.type === "success" 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}>
                {message.type === "success" ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
                <p className="text-xs font-medium">{message.text}</p>
              </div>
            )}

            {!selectedStudentId ? (
              <div className="py-20 border border-dashed border-[#1E293B] rounded-xl flex flex-col items-center justify-center text-center p-6 bg-[#0F172A]/50">
                <ClipboardCheck className="text-zinc-600 mb-4" size={48} />
                <h3 className="font-bold text-white text-base">Form Input Terkunci</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">Silakan pilih target siswa terlebih dahulu pada panel kiri untuk membuka form input data.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 2 Form Fields Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Grade Score Card */}
                  <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm border-b border-[#1E293B] pb-2 flex items-center gap-2">
                      <FileSpreadsheet size={16} className="text-indigo-400" /> 2. Nilai Akademik
                    </h3>

                    {!selectedSubjectId ? (
                      <p className="text-xs text-zinc-500 italic py-6 text-center">Silakan pilih mata pelajaran di panel kiri untuk mengisi skor nilai.</p>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 block">
                          Skor Nilai ({subjects.find(s => s.id === selectedSubjectId)?.nama_mapel})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          required
                          placeholder="Rentang 0 - 100"
                          value={skor}
                          onChange={(e) => setSkor(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Attendance Card */}
                  <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm border-b border-[#1E293B] pb-2 flex items-center gap-2">
                      <Clock size={16} className="text-indigo-400" /> 3. Rekap Kehadiran
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-400">Hadir</label>
                        <input
                          type="number"
                          min={0}
                          value={hadir}
                          onChange={(e) => setHadir(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-400">Sakit</label>
                        <input
                          type="number"
                          min={0}
                          value={sakit}
                          onChange={(e) => setSakit(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-400">Izin</label>
                        <input
                          type="number"
                          min={0}
                          value={izin}
                          onChange={(e) => setIzen(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-400">Alpha</label>
                        <input
                          type="number"
                          min={0}
                          value={alpha}
                          onChange={(e) => setAlpha(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between items-center text-xs border-t border-[#1E293B]/60">
                      <span className="text-zinc-500 font-semibold uppercase tracking-wider">Total Sesi Kehadiran</span>
                      <span className="font-extrabold text-white">{totalSesi} Sesi</span>
                    </div>
                  </div>

                </div>

                {/* Teacher Notes Card */}
                <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5 space-y-4">
                  <h3 className="font-bold text-white text-sm border-b border-[#1E293B] pb-2 flex items-center gap-2">
                    <MessageSquare size={16} className="text-indigo-400" /> 4. Catatan Wali Kelas
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-400">Catatan/Evaluasi Siswa</label>
                      <textarea
                        rows={3}
                        placeholder="Misal: Sangat cerdas. Tolong pertahankan prestasinya."
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-400">Nama Guru / Wali Kelas</label>
                      <input
                        type="text"
                        placeholder="Misal: Prof. Dr. Dora The Explorer"
                        value={namaGuru}
                        onChange={(e) => setNamaGuru(e.target.value)}
                        className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
                  >
                    <Save size={16} /> {saving ? "Menyimpan Data..." : "Simpan Seluruh Data"}
                  </button>
                </div>

              </div>
            )}

          </div>

        </form>
      )}

    </div>
  );
}
