"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  Layers, 
  Plus, 
  Edit3, 
  Trash2, 
  X,
  CalendarDays,
  ChevronRight,
  Users
} from "lucide-react";

interface Kelas {
  id: string;
  nama_kelas: string;
  tahun_ajaran: string;
  deskripsi: string | null;
  created_at: string;
}

export default function KelasPage() {
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formId, setFormId] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formTahun, setFormTahun] = useState("2026/2027");
  const [formDeskripsi, setFormDeskripsi] = useState("");

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from("kelas")
        .select("*")
        .order("nama_kelas", { ascending: true });

      if (classesError) throw classesError;

      // Fetch students to map count of students in each class
      const { data: studentsData, error: studentsError } = await supabase
        .from("siswa")
        .select("kelas_id");

      if (studentsError) throw studentsError;

      const counts: Record<string, number> = {};
      studentsData?.forEach((student) => {
        if (student.kelas_id) {
          counts[student.kelas_id] = (counts[student.kelas_id] || 0) + 1;
        }
      });

      setClasses(classesData || []);
      setStudentCounts(counts);
    } catch (err) {
      console.error("Error fetching classes:", err);
    } finally {
      setLoading(false);
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
      fetchClasses();
    } catch (err) {
      console.error("Error deleting class:", err);
    }
  };

  return (
    <div className="p-8 flex-1 flex flex-col space-y-6 bg-cool-gray text-zinc-900">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-strong-blue tracking-tight">Manajemen Kelas</h2>
          <p className="text-xs text-zinc-600 mt-1 font-medium">Buat, kelola, dan pantau data kelas dan siswa.</p>
        </div>
        <button
          onClick={() => {
            setIsEditing(false);
            setFormNama("");
            setFormDeskripsi("");
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-strong-blue hover:bg-[#001D6E] text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-strong-blue/10 cursor-pointer"
        >
          <Plus size={16} /> Tambah Kelas
        </button>
      </div>

      {/* Class List Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-zinc-200 rounded-xl text-zinc-500 shadow-xs">
          Memuat data kelas...
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-zinc-200 rounded-xl text-center p-6 shadow-xs">
          <Layers className="text-zinc-400 mb-4" size={48} />
          <h3 className="font-bold text-zinc-800 text-base">Belum ada kelas</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs font-medium">Silakan tambahkan kelas baru untuk mulai mengelompokkan siswa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((kelas) => (
            <div
              key={kelas.id}
              className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-strong-blue/30 shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 relative group flex flex-col justify-between h-[170px] cursor-pointer"
            >
              <Link href={`/kelas/${kelas.id}`} className="absolute inset-0 z-0 rounded-xl" />
              
              <div className="z-10 pointer-events-none">
                <h3 className="font-black text-zinc-900 text-lg tracking-tight group-hover:text-strong-blue transition-colors">
                  {kelas.nama_kelas}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1.5 text-xs text-zinc-500 font-medium">
                  <div className="flex items-center gap-1">
                    <CalendarDays size={12} className="text-strong-blue" />
                    <span>Tahun Ajaran: {kelas.tahun_ajaran}</span>
                  </div>
                  <span className="hidden sm:inline text-zinc-300">|</span>
                  <div className="flex items-center gap-1">
                    <Users size={12} className="text-strong-blue" />
                    <span>{studentCounts[kelas.id] || 0} Siswa</span>
                  </div>
                </div>
                {kelas.deskripsi && (
                  <p className="text-xs text-zinc-600 mt-2 line-clamp-2 italic leading-relaxed font-medium">
                    "{kelas.deskripsi}"
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center z-10 mt-4 border-t border-zinc-100 pt-3">
                <span className="text-xs font-bold text-strong-blue flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  Detail Kelas <ChevronRight size={14} />
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleEditClass(kelas);
                    }}
                    className="p-1.5 hover:bg-zinc-100 text-zinc-500 hover:text-strong-blue rounded-md transition-colors cursor-pointer"
                    title="Edit Kelas"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeleteClass(kelas.id);
                    }}
                    className="p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                    title="Hapus Kelas"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Class Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-zinc-200">
              <h3 className="font-bold text-zinc-900 text-base">
                {isEditing ? "Edit Kelas" : "Tambah Kelas Baru"}
              </h3>
              <button 
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveClass} className="p-5 space-y-4">
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
