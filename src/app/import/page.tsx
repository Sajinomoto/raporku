"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Siswa, Kelas, MataPelajaran } from "@/types/database";
import { parseWideWorkbook, WideWorkbookParseResult } from "@/lib/wide-excel-parser";
import { resolveSmartImport, ResolvedSmartImportData } from "@/lib/smart-import-resolver";
import { 
  FileSpreadsheet, 
  Upload, 
  Settings, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Layers, 
  BookOpen, 
  Users, 
  ArrowRight, 
  RefreshCw, 
  HelpCircle, 
  Tag, 
  Sparkles, 
  GraduationCap, 
  Award, 
  School, 
  Check, 
  Info,
  ChevronRight
} from "lucide-react";
import { executeSaveImportPipeline, SaveImportSummary } from "@/lib/save-import-pipeline";

export default function GlobalImportPage() {
  // Step State (1: Upload, 2: Config, 3: Preview)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsingLoading, setParsingLoading] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);
  const [saveSummary, setSaveSummary] = useState<SaveImportSummary | null>(null);

  // Config States
  const [importMode, setImportMode] = useState<"smart" | "strict">("smart");
  const [autoCreateSiswa, setAutoCreateSiswa] = useState<boolean>(false);
  const [tahunAjaran, setTahunAjaran] = useState<string>("2026/2027");
  const [semester, setSemester] = useState<string>("Ganjil");

  // Database context
  const [existingStudents, setExistingStudents] = useState<Siswa[]>([]);
  const [existingClasses, setExistingClasses] = useState<Kelas[]>([]);
  const [existingSubjects, setExistingSubjects] = useState<MataPelajaran[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Parse & Resolve Results
  const [parseResult, setParseResult] = useState<WideWorkbookParseResult | null>(null);
  const [resolvedData, setResolvedData] = useState<ResolvedSmartImportData | null>(null);

  // Preview Active Tab
  const [activePreviewTab, setActivePreviewTab] = useState<
    "summary" | "classes" | "subjects" | "students" | "grades" | "utbk" | "errors"
  >("summary");

  useEffect(() => {
    fetchDatabaseContext();
  }, []);

  const fetchDatabaseContext = async () => {
    setDbLoading(true);
    try {
      const [resSiswa, resKelas, resMapel] = await Promise.all([
        supabase.from("siswa").select("*"),
        supabase.from("kelas").select("*"),
        supabase.from("mata_pelajaran").select("*"),
      ]);

      setExistingStudents(resSiswa.data || []);
      setExistingClasses(resKelas.data || []);
      setExistingSubjects(resMapel.data || []);
    } catch (err) {
      console.error("Error fetching database context:", err);
    } finally {
      setDbLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert("Format berkas tidak valid. Harap pilih berkas Excel (.xlsx atau .xls).");
      return;
    }
    setSelectedFile(file);
    setCurrentStep(2);
  };

  const handleProcessParse = async () => {
    if (!selectedFile) return;

    setParsingLoading(true);
    try {
      const rawParsed = await parseWideWorkbook(selectedFile);
      setParseResult(rawParsed);

      const resolved = resolveSmartImport(rawParsed, {
        mode: importMode,
        autoCreateSiswa,
        tahunAjaran,
        semester,
        existingStudents,
        existingClasses,
        existingSubjects,
      });

      setResolvedData(resolved);
      setCurrentStep(3);
    } catch (err) {
      console.error("Error parsing workbook:", err);
      alert("Terjadi kesalahan saat membaca file Excel.");
    } finally {
      setParsingLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setResolvedData(null);
    setSaveSummary(null);
    setCurrentStep(1);
    setActivePreviewTab("summary");
  };

  const handleExecuteSave = async () => {
    if (!resolvedData || !parseResult) return;

    setSavingLoading(true);
    try {
      const summary = await executeSaveImportPipeline(resolvedData, parseResult, {
        tahunAjaran,
        semester,
      });

      if (summary.success) {
        setSaveSummary(summary);
        // Refresh local database context
        fetchDatabaseContext();
      } else {
        alert(`Gagal menyimpan data import: ${summary.errorMessage || "Terjadi kesalahan pada database."}`);
      }
    } catch (err: any) {
      console.error("Error executing save:", err);
      alert(`Gagal menyimpan data import: ${err.message || String(err)}`);
    } finally {
      setSavingLoading(false);
    }
  };

  return (
    <div className="p-8 flex-1 flex flex-col space-y-6 bg-cool-gray text-zinc-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-strong-blue tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="text-mustard" size={28} />
            Smart Import Raport Excel
          </h2>
          <p className="text-xs text-zinc-600 mt-1 font-medium max-w-xl">
            Pusat unggah dan konversi format workbook Excel wide per kelas menjadi data terstruktur (identitas, presensi, nilai mapel, sesi, UTBK & pilihan universitas).
          </p>
        </div>

        {selectedFile && (
          <button
            onClick={handleReset}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-300 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} /> Reset / Unggah Ulang
          </button>
        )}
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {/* Step 1 */}
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              currentStep === 1 ? "bg-strong-blue text-white shadow-md shadow-strong-blue/20" : "bg-emerald-500 text-white"
            }`}>
              {currentStep > 1 ? <Check size={16} /> : "1"}
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-800">Unggah File</p>
              <p className="text-[10px] text-zinc-400 font-medium">Pilih berkas Excel</p>
            </div>
          </div>

          <div className="flex-1 h-0.5 mx-4 bg-zinc-200">
            <div className={`h-full bg-strong-blue transition-all duration-300 ${currentStep >= 2 ? "w-full" : "w-0"}`}></div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              currentStep === 2 ? "bg-strong-blue text-white shadow-md shadow-strong-blue/20" : currentStep > 2 ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400"
            }`}>
              {currentStep > 2 ? <Check size={16} /> : "2"}
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-800">Konfigurasi</p>
              <p className="text-[10px] text-zinc-400 font-medium">Mode & Aturan Import</p>
            </div>
          </div>

          <div className="flex-1 h-0.5 mx-4 bg-zinc-200">
            <div className={`h-full bg-strong-blue transition-all duration-300 ${currentStep >= 3 ? "w-full" : "w-0"}`}></div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              currentStep === 3 ? "bg-strong-blue text-white shadow-md shadow-strong-blue/20" : "bg-zinc-100 text-zinc-400"
            }`}>
              3
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-800">Preview & Confirm</p>
              <p className="text-[10px] text-zinc-400 font-medium">Review & Simpan Data</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: File Dropzone */}
      {currentStep === 1 && (
        <div className="bg-white border-2 border-dashed border-zinc-300 hover:border-strong-blue rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 transition-all duration-300 shadow-sm hover:shadow-md group">
          <div className="p-4 bg-strong-blue/10 text-strong-blue rounded-full group-hover:scale-110 transition-transform">
            <Upload size={40} />
          </div>
          <div>
            <h3 className="font-extrabold text-zinc-900 text-lg">Unggah Berkas Excel Raport</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-md">
              Pilih file workbook Excel contoh (`.xlsx` / `.xls`) yang berisi data nilai per kelas/sheet.
            </p>
          </div>
          <label className="mt-2 px-6 py-3 bg-strong-blue hover:bg-[#001D6E] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-strong-blue/10 cursor-pointer flex items-center gap-2">
            <FileSpreadsheet size={16} /> Pilih File dari Komputer
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Step 2: Configuration */}
      {currentStep === 2 && selectedFile && (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
            <div className="p-2 bg-mustard/15 text-[#A67800] rounded-lg">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-zinc-900 text-base">Konfigurasi Parameter Import</h3>
              <p className="text-xs text-zinc-500 font-medium">Berkas terpilih: <span className="font-bold text-strong-blue">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Import Mode */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold text-zinc-700 block">Mode Import</label>
              <div className="grid grid-cols-1 gap-3">
                <label className={`p-4 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                  importMode === "smart" ? "border-strong-blue bg-strong-blue/5 ring-1 ring-strong-blue" : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}>
                  <input
                    type="radio"
                    name="importMode"
                    value="smart"
                    checked={importMode === "smart"}
                    onChange={() => setImportMode("smart")}
                    className="mt-1 text-strong-blue focus:ring-strong-blue"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-zinc-900 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-mustard" /> Smart Import Mode (Rekomendasi)
                    </span>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed font-medium">
                      Otomatis membuat preview kandidat **Kelas Baru** dan **Mata Pelajaran Baru** jika belum terdaftar di database.
                    </p>
                  </div>
                </label>

                <label className={`p-4 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                  importMode === "strict" ? "border-strong-blue bg-strong-blue/5 ring-1 ring-strong-blue" : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}>
                  <input
                    type="radio"
                    name="importMode"
                    value="strict"
                    checked={importMode === "strict"}
                    onChange={() => setImportMode("strict")}
                    className="mt-1 text-strong-blue focus:ring-strong-blue"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-zinc-900">Strict Mode</span>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed font-medium">
                      Gagal/error jika ada kelas, mata pelajaran, atau siswa yang belum terdaftar di database.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Toggle Auto-Create Siswa */}
            <div className="space-y-4">
              <label className="text-xs font-extrabold text-zinc-700 block">Aturan Buat Siswa Baru</label>
              <div className="p-4 border border-zinc-200 rounded-xl bg-zinc-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800">Buat Siswa Baru jika NISN Belum Ada</span>
                  <input
                    type="checkbox"
                    checked={autoCreateSiswa}
                    onChange={(e) => setAutoCreateSiswa(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-strong-blue focus:ring-strong-blue cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                  Status Default: <strong className="text-zinc-700">Nonaktif / Off</strong>. Aktifkan fitur ini jika Anda ingin sistem otomatis mendaftarkan data siswa baru dari Excel.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500">Tahun Ajaran Default</label>
                  <input
                    type="text"
                    value={tahunAjaran}
                    onChange={(e) => setTahunAjaran(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500">Semester Default</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-strong-blue"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Kembali
            </button>
            <button
              onClick={handleProcessParse}
              disabled={parsingLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-strong-blue hover:bg-[#001D6E] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-strong-blue/10 cursor-pointer disabled:opacity-50"
            >
              {parsingLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Memproses Parsing...
                </>
              ) : (
                <>
                  <Eye size={14} /> Parse & Tampilkan Preview <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Candidates */}
      {currentStep === 3 && resolvedData && (
        <div className="space-y-6">
          {/* Summary Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total Sheet</span>
              <p className="text-xl font-black text-strong-blue mt-1">{resolvedData.summary.totalSheetsProcessed}</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Siswa Terdeteksi</span>
              <p className="text-xl font-black text-strong-blue mt-1">{resolvedData.summary.totalStudentsParsed}</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Kelas Baru</span>
              <p className="text-xl font-black text-purple-600 mt-1">{resolvedData.summary.candidateClassesToCreate}</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Mapel Baru</span>
              <p className="text-xl font-black text-amber-600 mt-1">{resolvedData.summary.candidateSubjectsToCreate}</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Siswa Baru</span>
              <p className="text-xl font-black text-emerald-600 mt-1">{resolvedData.summary.candidateStudentsToCreate}</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Errors / Warnings</span>
              <p className={`text-xl font-black mt-1 ${resolvedData.summary.totalErrors > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {resolvedData.summary.totalErrors} / {resolvedData.summary.totalWarnings}
              </p>
            </div>
          </div>

          {/* Preview Tabs Navigation */}
          <div className="bg-white border border-zinc-200 rounded-xl p-2 shadow-xs flex flex-wrap gap-2">
            {[
              { id: "summary", label: "Ringkasan & Status", icon: Info, count: null },
              { id: "classes", label: "Kandidat Kelas Baru", icon: Layers, count: resolvedData.candidateClasses.length },
              { id: "subjects", label: "Kandidat Mapel Baru", icon: BookOpen, count: resolvedData.candidateSubjects.length },
              { id: "students", label: "Kandidat Siswa Baru", icon: Users, count: resolvedData.candidateStudents.length },
              { id: "grades", label: "Nilai & Presensi", icon: FileSpreadsheet, count: resolvedData.summary.totalGradesToInsert },
              { id: "utbk", label: "UTBK & Universitas", icon: Award, count: resolvedData.summary.totalUtbkRowsToInsert + resolvedData.summary.totalUniversityChoicesToInsert },
              { id: "errors", label: "Peringatan & Error", icon: AlertTriangle, count: resolvedData.errors.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activePreviewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-strong-blue text-white shadow-sm"
                      : "bg-transparent text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-700"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content 1: Summary */}
          {activePreviewTab === "summary" && (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-zinc-900 text-base">Detail Hasil Smart Import Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-zinc-700">
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                  <p className="font-bold text-strong-blue">Identitas Import:</p>
                  <p>• Tahun Ajaran Default: <strong>{tahunAjaran}</strong></p>
                  <p>• Semester Default: <strong>{semester}</strong></p>
                  <p>• Mode Import: <strong className="uppercase">{importMode}</strong></p>
                  <p>• Auto-Create Siswa: <strong>{autoCreateSiswa ? "Aktif" : "Nonaktif"}</strong></p>
                </div>
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                  <p className="font-bold text-strong-blue">Estimasi Data Terproses:</p>
                  <p>• Total Nilai Regular Mapel: <strong>{resolvedData.summary.totalGradesToInsert} entries</strong></p>
                  <p>• Total Sesi Pembelajaran: <strong>{resolvedData.summary.totalSessionsToCreate} sesi</strong></p>
                  <p>• Total Tryout UTBK: <strong>{resolvedData.summary.totalUtbkRowsToInsert} komponen</strong></p>
                  <p>• Total Pilihan Universitas: <strong>{resolvedData.summary.totalUniversityChoicesToInsert} data</strong></p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Candidate Classes */}
          {activePreviewTab === "classes" && (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
                <Layers className="text-purple-600" size={18} />
                Preview Kandidat Kelas Baru ({resolvedData.candidateClasses.length})
              </h3>
              {resolvedData.candidateClasses.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Semua kelas pada file Excel sudah cocok dengan data kelas di database.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase">
                        <th className="py-3 px-4">Nama Kelas</th>
                        <th className="py-3 px-4">Jenjang</th>
                        <th className="py-3 px-4">Jurusan</th>
                        <th className="py-3 px-4">Program Tag</th>
                        <th className="py-3 px-4">Tahun Ajaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-bold text-zinc-800">
                      {resolvedData.candidateClasses.map((cls, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50">
                          <td className="py-3 px-4 text-strong-blue">{cls.nama_kelas}</td>
                          <td className="py-3 px-4">{cls.jenjang}</td>
                          <td className="py-3 px-4">{cls.jurusan}</td>
                          <td className="py-3 px-4">{cls.program_tag || "-"}</td>
                          <td className="py-3 px-4">{cls.tahun_ajaran}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab Content 3: Candidate Subjects */}
          {activePreviewTab === "subjects" && (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
                <BookOpen className="text-amber-600" size={18} />
                Preview Kandidat Mata Pelajaran Baru ({resolvedData.candidateSubjects.length})
              </h3>
              {resolvedData.candidateSubjects.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Semua mata pelajaran pada header Excel sudah cocok dengan database.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase">
                        <th className="py-3 px-4">Kode Mapel</th>
                        <th className="py-3 px-4">Nama Mapel</th>
                        <th className="py-3 px-4">Jenjang</th>
                        <th className="py-3 px-4">Jurusan</th>
                        <th className="py-3 px-4">Kategori</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-bold text-zinc-800">
                      {resolvedData.candidateSubjects.map((subj, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50">
                          <td className="py-3 px-4 font-mono text-strong-blue">{subj.kode_mapel}</td>
                          <td className="py-3 px-4">{subj.nama_mapel}</td>
                          <td className="py-3 px-4">{subj.jenjang}</td>
                          <td className="py-3 px-4">{subj.jurusan}</td>
                          <td className="py-3 px-4">{subj.kategori}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab Content 4: Candidate Students */}
          {activePreviewTab === "students" && (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
                <Users className="text-emerald-600" size={18} />
                Preview Kandidat Siswa Baru ({resolvedData.candidateStudents.length})
              </h3>
              {resolvedData.candidateStudents.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Tidak ada kandidat siswa baru yang akan dibuat.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase">
                        <th className="py-3 px-4">NISN / NIS</th>
                        <th className="py-3 px-4">Nama Lengkap</th>
                        <th className="py-3 px-4">Kelas Penempatan</th>
                        <th className="py-3 px-4">Asal Sekolah</th>
                        <th className="py-3 px-4">Status Siswa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-bold text-zinc-800">
                      {resolvedData.candidateStudents.map((std, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50">
                          <td className="py-3 px-4 font-mono text-strong-blue">{std.nis}</td>
                          <td className="py-3 px-4">{std.nama_lengkap}</td>
                          <td className="py-3 px-4">{std.kelas_nama}</td>
                          <td className="py-3 px-4">{std.asal_sekolah}</td>
                          <td className="py-3 px-4">{std.status_siswa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab Content 5: Grades & Attendance */}
          {activePreviewTab === "grades" && (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
                <FileSpreadsheet className="text-strong-blue" size={18} />
                Preview Nilai Regular & Presensi per Siswa ({resolvedData.resolvedRows.length} Siswa)
              </h3>
              {resolvedData.resolvedRows.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Tidak ada data nilai atau presensi yang dibaca.</p>
              ) : (
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-zinc-100 z-10">
                      <tr className="border-b border-zinc-200 text-[10px] font-bold text-zinc-400 uppercase">
                        <th className="py-3 px-4">Sheet / Kelas</th>
                        <th className="py-3 px-4">NISN</th>
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-4">Presensi (H/S/I/A)</th>
                        <th className="py-3 px-4">Catatan Guru</th>
                        <th className="py-3 px-4">Total Nilai Mapel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-bold text-zinc-800">
                      {resolvedData.resolvedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50">
                          <td className="py-3 px-4 text-strong-blue">{row.sheetName}</td>
                          <td className="py-3 px-4 font-mono">{row.studentNis}</td>
                          <td className="py-3 px-4">{row.studentNama}</td>
                          <td className="py-3 px-4 font-mono">
                            {row.attendance ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px]">
                                {row.attendance.hadir}/{row.attendance.sakit}/{row.attendance.izin}/{row.attendance.alpha}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-3 px-4 font-normal text-zinc-600 truncate max-w-xs">{row.catatan || "-"}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-strong-blue/10 text-strong-blue rounded text-[10px] font-bold">
                              {row.gradesCount} Nilai Terbaca
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab Content 6: UTBK & University Choices */}
          {activePreviewTab === "utbk" && (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
                <Award className="text-amber-600" size={18} />
                Preview UTBK & Pilihan Universitas ({resolvedData.summary.totalUtbkRowsToInsert} UTBK, {resolvedData.summary.totalUniversityChoicesToInsert} Universitas)
              </h3>
              {resolvedData.summary.totalUtbkRowsToInsert === 0 && resolvedData.summary.totalUniversityChoicesToInsert === 0 ? (
                <p className="text-xs text-zinc-500 italic">Sheet ini tidak memiliki kolom data UTBK atau Pilihan Universitas (Bukan kelas SMA / Kolom kosong).</p>
              ) : (
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-zinc-100 z-10">
                      <tr className="border-b border-zinc-200 text-[10px] font-bold text-zinc-400 uppercase">
                        <th className="py-3 px-4">Sheet / Kelas</th>
                        <th className="py-3 px-4">NISN</th>
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-4">UTBK (Komponen Skor)</th>
                        <th className="py-3 px-4">Pilihan Universitas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-bold text-zinc-800">
                      {resolvedData.resolvedRows
                        .filter((r) => r.utbkCount > 0 || r.univCount > 0)
                        .map((row, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50">
                            <td className="py-3 px-4 text-strong-blue">{row.sheetName}</td>
                            <td className="py-3 px-4 font-mono">{row.studentNis}</td>
                            <td className="py-3 px-4">{row.studentNama}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                                {row.utbkCount} Komponen Skor
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                                {row.univCount} Pilihan Univ
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab Content 7: Errors & Warnings */}
          {activePreviewTab === "errors" && (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={18} />
                Daftar Peringatan & Error ({resolvedData.errors.length})
              </h3>
              {resolvedData.errors.length === 0 ? (
                <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Tidak ada error atau peringatan pada proses parsing file Excel!
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase">
                        <th className="py-3 px-4">Tingkat</th>
                        <th className="py-3 px-4">Sheet</th>
                        <th className="py-3 px-4">Baris</th>
                        <th className="py-3 px-4">Pesan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
                      {resolvedData.errors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50">
                          <td className="py-3 px-4">
                            {err.severity === "error" ? (
                              <span className="text-red-600 font-bold flex items-center gap-1">
                                <XCircle size={12} /> Error
                              </span>
                            ) : (
                              <span className="text-amber-600 font-bold flex items-center gap-1">
                                <AlertTriangle size={12} /> Warning
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-zinc-900">{err.sheetName}</td>
                          <td className="py-3 px-4 font-mono">{err.rowIndex > 0 ? err.rowIndex : "-"}</td>
                          <td className="py-3 px-4">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(2)}
              disabled={savingLoading}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Ubah Konfigurasi
            </button>
            <button
              onClick={handleExecuteSave}
              disabled={savingLoading || !parseResult}
              className="flex items-center gap-2 px-6 py-2.5 bg-strong-blue hover:bg-[#001D6E] text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-strong-blue/10 cursor-pointer disabled:opacity-50"
            >
              {savingLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Menyimpan Batch ke Database...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Konfirmasi & Simpan Batch Import
                </>
              )}
            </button>
          </div>

          {/* Success Summary Modal/Alert */}
          {saveSummary && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
              <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-up">
                <div className="flex items-center gap-3 text-emerald-600">
                  <div className="p-3 bg-emerald-50 rounded-full">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-zinc-900 text-lg">Import Berhasil Disimpan!</h3>
                    <p className="text-xs text-zinc-500 font-medium">Batch data raport dari Excel telah berhasil diinsert ke Supabase.</p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 space-y-1.5">
                  <p>• Kelas Baru Dibuat: <strong>{saveSummary.classesCreated}</strong></p>
                  <p>• Mapel Baru Dibuat: <strong>{saveSummary.subjectsCreated}</strong></p>
                  <p>• Siswa Baru Didaftarkan: <strong>{saveSummary.studentsCreated}</strong></p>
                  <p>• Presensi Tersimpan: <strong>{saveSummary.attendanceUpserted}</strong></p>
                  <p>• Sesi Pembelajaran: <strong>{saveSummary.sessionsCreatedOrFound}</strong></p>
                  <p>• Nilai Regular Tersimpan: <strong>{saveSummary.gradesInserted} entries</strong></p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setSaveSummary(null);
                      handleReset();
                    }}
                    className="w-full py-2.5 bg-strong-blue hover:bg-[#001D6E] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer text-center"
                  >
                    Selesai & Tutup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
