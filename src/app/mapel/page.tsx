"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { MataPelajaran } from "@/types/database";
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  GraduationCap, 
  Tag,
  AlertCircle,
  Search,
  Code,
  CheckCircle,
  XCircle
} from "lucide-react";

export default function MapelPage() {
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJenjangFilter, setSelectedJenjangFilter] = useState("all");
  const [selectedKategoriFilter, setSelectedKategoriFilter] = useState("all");
  const [selectedJurusanFilter, setSelectedJurusanFilter] = useState("all");
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formId, setFormId] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formKodeMapel, setFormKodeMapel] = useState("");
  const [formKategori, setFormKategori] = useState("Wajib");
  const [formJenjang, setFormJenjang] = useState("SD");
  const [formJurusan, setFormJurusan] = useState("UMUM");
  const [formAktif, setFormAktif] = useState(true);
  const [confirmDeleteSubject, setConfirmDeleteSubject] = useState<MataPelajaran | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("mata_pelajaran")
        .select("*")
        .order("nama_mapel", { ascending: true });

      if (error) throw error;
      setSubjects(data || []);
    } catch (err) {
      console.error("Error fetching subjects:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter((subject) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      subject.nama_mapel.toLowerCase().includes(query) ||
      (subject.kode_mapel || "").toLowerCase().includes(query);
    const matchesJenjang = selectedJenjangFilter === "all" || (subject.jenjang || "SD") === selectedJenjangFilter;
    const matchesKategori = selectedKategoriFilter === "all" || subject.kategori === selectedKategoriFilter;
    const matchesJurusan = selectedJurusanFilter === "all" || (subject.jurusan || "UMUM") === selectedJurusanFilter;
    return matchesSearch && matchesJenjang && matchesKategori && matchesJurusan;
  });

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) return;

    try {
      const payload = {
        nama_mapel: formNama,
        kode_mapel: formKodeMapel.trim().toLowerCase() || null,
        kategori: formKategori,
        jenjang: formJenjang,
        jurusan: formJurusan,
        aktif: formAktif,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("mata_pelajaran")
          .update(payload)
          .eq("id", formId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mata_pelajaran")
          .insert(payload);

        if (error) throw error;
      }

      // Reset
      setShowForm(false);
      setIsEditing(false);
      setFormNama("");
      setFormKodeMapel("");
      setFormKategori("Wajib");
      setFormJenjang("SD");
      setFormJurusan("UMUM");
      setFormAktif(true);
      fetchSubjects();
    } catch (err) {
      console.error("Error saving subject:", err);
    }
  };

  const handleEditSubject = (subject: MataPelajaran) => {
    setFormId(subject.id);
    setFormNama(subject.nama_mapel);
    setFormKodeMapel(subject.kode_mapel || "");
    setFormKategori(subject.kategori);
    setFormJenjang(subject.jenjang || "SD");
    setFormJurusan(subject.jurusan || "UMUM");
    setFormAktif(subject.aktif ?? true);
    setIsEditing(true);
    setShowForm(true);
  };

  const executeDeleteSubject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("mata_pelajaran")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setConfirmDeleteSubject(null);
      fetchSubjects();
    } catch (err) {
      console.error("Error deleting subject:", err);
    }
  };

  return (
    <div className="p-8 flex-1 flex flex-col space-y-6 bg-cool-gray text-zinc-900">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-strong-blue tracking-tight">Kurikulum Mata Pelajaran</h2>
          <p className="text-xs text-zinc-600 mt-1 font-medium">Kelola daftar mata pelajaran utama, kode mapel, jurusan, dan peminatan di sekolah.</p>
        </div>
        <button
          onClick={() => {
            setIsEditing(false);
            setFormNama("");
            setFormKodeMapel("");
            setFormKategori("Wajib");
            setFormJenjang("SD");
            setFormJurusan("UMUM");
            setFormAktif(true);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-strong-blue hover:bg-[#001D6E] text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-strong-blue/10 cursor-pointer"
        >
          <Plus size={16} /> Tambah Mapel
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-3 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Cari mata pelajaran atau kode (mtk, kim, fis)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-zinc-300 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
          />
        </div>
        
        <div className="flex flex-wrap sm:flex-nowrap gap-3">
          <div className="w-36">
            <select
              value={selectedJenjangFilter}
              onChange={(e) => setSelectedJenjangFilter(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
            >
              <option value="all">Semua Jenjang</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
            </select>
          </div>

          <div className="w-36">
            <select
              value={selectedJurusanFilter}
              onChange={(e) => setSelectedJurusanFilter(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
            >
              <option value="all">Semua Jurusan</option>
              <option value="UMUM">UMUM</option>
              <option value="IPA">IPA</option>
              <option value="IPS">IPS</option>
            </select>
          </div>

          <div className="w-40">
            <select
              value={selectedKategoriFilter}
              onChange={(e) => setSelectedKategoriFilter(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
            >
              <option value="all">Semua Kategori</option>
              <option value="Wajib">Wajib</option>
              <option value="Peminatan">Peminatan</option>
              <option value="Muatan Lokal">Muatan Lokal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area (Table List View) */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-zinc-200 rounded-xl text-zinc-500 shadow-xs">
          Memuat data mata pelajaran...
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-zinc-200 rounded-xl text-center p-6 shadow-xs">
          <BookOpen className="text-zinc-400 mb-4" size={48} />
          <h3 className="font-bold text-zinc-800 text-base">Tidak ada mata pelajaran</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs font-medium">Tidak ditemukan mata pelajaran yang cocok dengan filter atau kata kunci Anda.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="py-3.5 px-5 w-14">No.</th>
                <th className="py-3.5 px-5">Nama Mata Pelajaran</th>
                <th className="py-3.5 px-5 w-32">Kode Mapel</th>
                <th className="py-3.5 px-5 w-32">Jurusan</th>
                <th className="py-3.5 px-5 w-32">Kategori</th>
                <th className="py-3.5 px-5 w-28">Jenjang</th>
                <th className="py-3.5 px-5 w-24">Status</th>
                <th className="py-3.5 px-5 w-24 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs font-bold text-zinc-800">
              {filteredSubjects.map((subject, index) => (
                <tr 
                  key={subject.id} 
                  className="hover:bg-zinc-50/50 transition-colors group"
                >
                  <td className="py-3.5 px-5 text-zinc-400 font-medium">{index + 1}</td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-strong-blue/10 text-strong-blue rounded-md shrink-0">
                        <BookOpen size={14} />
                      </div>
                      <span className="text-zinc-900 font-bold">{subject.nama_mapel}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    {subject.kode_mapel ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-strong-blue bg-strong-blue/5 border border-strong-blue/15 px-2 py-0.5 rounded-md">
                        <Code size={11} />
                        {subject.kode_mapel}
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-[11px] font-normal">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                      {subject.jurusan || "UMUM"}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      subject.kategori === "Wajib" 
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                        : subject.kategori === "Peminatan"
                        ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                        : "bg-mustard/20 text-[#A67800] border border-mustard/35"
                    }`}>
                      <Tag size={10} />
                      {subject.kategori}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      (subject.jenjang || "SD") === "SD"
                        ? "bg-sky-500/10 text-sky-600 border border-sky-500/20"
                        : (subject.jenjang || "SD") === "SMP"
                        ? "bg-amber-500/10 text-[#A67800] border border-amber-500/20"
                        : "bg-red-500/10 text-red-600 border border-red-500/20"
                    }`}>
                      <GraduationCap size={10} />
                      {subject.jenjang || "SD"}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    {subject.aktif ?? true ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle size={10} /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                        <XCircle size={10} /> Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditSubject(subject)}
                        className="p-1.5 hover:bg-zinc-100 text-zinc-500 hover:text-strong-blue rounded-md transition-colors cursor-pointer"
                        title="Edit Mapel"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteSubject(subject)}
                        className="p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                        title="Hapus Mapel"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-zinc-200">
              <h3 className="font-bold text-zinc-900 text-base">
                {isEditing ? "Edit Mata Pelajaran" : "Tambah Mapel Baru"}
              </h3>
              <button 
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveSubject} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Matematika, Fisika, Biologi"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500">Kode Mapel (Excel)</label>
                  <input
                    type="text"
                    placeholder="Misal: mtk, kim, fis, bio"
                    value={formKodeMapel}
                    onChange={(e) => setFormKodeMapel(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                  />
                  <p className="text-[10px] text-zinc-400">Kode header Excel (kim1, fis1)</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500">Jurusan</label>
                  <select
                    value={formJurusan}
                    onChange={(e) => setFormJurusan(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                  >
                    <option value="UMUM">UMUM</option>
                    <option value="IPA">IPA</option>
                    <option value="IPS">IPS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500">Kategori</label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue focus:ring-1 focus:ring-strong-blue"
                  >
                    <option value="Wajib">Wajib</option>
                    <option value="Peminatan">Peminatan</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                  </select>
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
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="formAktif"
                  checked={formAktif}
                  onChange={(e) => setFormAktif(e.target.checked)}
                  className="rounded border-zinc-300 text-strong-blue focus:ring-strong-blue h-4 w-4"
                />
                <label htmlFor="formAktif" className="text-xs font-bold text-zinc-700 cursor-pointer">
                  Mata Pelajaran Aktif
                </label>
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

      {/* Modal Konfirmasi Hapus Mapel */}
      {confirmDeleteSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex items-center gap-2">
              <AlertCircle className="text-red-500" size={18} />
              <h3 className="font-extrabold text-zinc-900 text-sm">Konfirmasi Hapus Mapel</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Apakah Anda yakin ingin menghapus mata pelajaran <strong className="text-zinc-900">{confirmDeleteSubject.nama_mapel}</strong>?
              </p>
              <p className="text-[11px] text-zinc-400 font-medium">
                Tindakan ini bersifat permanen. Semua data nilai siswa yang terhubung dengan mata pelajaran ini di dalam database juga akan terhapus secara otomatis (ON DELETE CASCADE).
              </p>
            </div>
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteSubject(null)}
                className="px-3.5 py-2 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDeleteSubject(confirmDeleteSubject.id)}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
