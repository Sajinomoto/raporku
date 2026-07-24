import { canonicalizeSubjectCode, parseSubjectGradeHeader, MAPEL_DICTIONARY } from "./mapel-dictionary";
import { inferClassInfo, InferredClassInfo } from "./class-infer";

export interface WideStudentRow {
  rowIndex: number;
  sheetName: string;
  nis: string;
  nama: string;
  asalSekolah?: string;
  statusSiswa?: string;
  programTag?: string | null;
  kelasPenempatan?: string;
  
  attendance?: {
    totalSesi: number;
    hadir: number;
    sakit: number;
    izin: number;
    alpha: number;
  };

  catatan?: string;

  grades: {
    kodeMapel: string;
    urutanSesi: number;
    rawHeader: string;
    skor: number;
  }[];

  utbkGrades: {
    kodeKomponen: string;
    namaKomponen?: string;
    skor: number;
  }[];

  universityChoices: {
    pilihanKe: number;
    universitas: string;
    jurusan: string;
    status?: string;
  }[];
}

export interface WideParseError {
  sheetName: string;
  rowIndex: number;
  columnName?: string;
  message: string;
  severity: "error" | "warning";
}

export interface SheetParseResult {
  sheetName: string;
  inferredClass: InferredClassInfo;
  rows: WideStudentRow[];
  errors: WideParseError[];
}

export interface WideWorkbookParseResult {
  sheetResults: SheetParseResult[];
  candidateClasses: InferredClassInfo[];
  candidateSubjects: { kode: string; nama_mapel: string; defaultKategori: string }[];
  candidateStudents: { nis: string; nama: string; kelasPenempatan: string; asalSekolah?: string; statusSiswa?: string; programTag?: string | null }[];
  allErrors: WideParseError[];
  totalStudents: number;
  totalGrades: number;
  totalUtbk: number;
  totalUniversityChoices: number;
}

// Known UTBK Component Codes
const UTBK_COMPONENT_CODES = new Set([
  "pu", "pbm", "ppu", "pk", "bi", "geo", "sej", "sos", "eko", "srr", "sk", "smp", "pk1", "pm1"
]);

// Known University Columns
const UNIV_COLUMNS = ["univ", "univ1", "j", "j1", "p", "p1"];

/**
 * Parses an entire Excel workbook buffer (multi-sheet wide format)
 */
export async function parseWideWorkbook(file: File): Promise<WideWorkbookParseResult> {
  const result: WideWorkbookParseResult = {
    sheetResults: [],
    candidateClasses: [],
    candidateSubjects: [],
    candidateStudents: [],
    allErrors: [],
    totalStudents: 0,
    totalGrades: 0,
    totalUtbk: 0,
    totalUniversityChoices: 0,
  };

  let XLSX: typeof import("xlsx");
  try {
    XLSX = await import("xlsx");
  } catch {
    result.allErrors.push({
      sheetName: "-",
      rowIndex: 0,
      message: "Gagal memuat library parser Excel.",
      severity: "error",
    });
    return result;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const candidateClassMap = new Map<string, InferredClassInfo>();
        const candidateSubjectMap = new Map<string, { kode: string; nama_mapel: string; defaultKategori: string }>();
        const candidateStudentMap = new Map<string, { nis: string; nama: string; kelasPenempatan: string; asalSekolah?: string; statusSiswa?: string; programTag?: string | null }>();

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          // Convert sheet to 2D array
          const rows2D = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          if (!rows2D || rows2D.length < 2) continue; // Need at least header + 1 data row

          const inferredClass = inferClassInfo(sheetName);
          if (!candidateClassMap.has(inferredClass.nama_kelas)) {
            candidateClassMap.set(inferredClass.nama_kelas, inferredClass);
          }

          const headerRow = rows2D[0] as any[];
          if (!headerRow || headerRow.length === 0) continue;

          const sheetResult: SheetParseResult = {
            sheetName,
            inferredClass,
            rows: [],
            errors: [],
          };

          // Classify columns
          const colClassifications: {
            colIndex: number;
            type: "nis" | "nama" | "asal_sekolah" | "status_siswa" | "program" | "kelas_penempatan" |
                  "sesi_efektif" | "hadir" | "sakit" | "izin" | "alpa" | "catatan" |
                  "regular_grade" | "utbk" | "univ" | "ignore";
            meta?: any;
          }[] = [];

          headerRow.forEach((col, idx) => {
            if (!col) return;
            const headerStr = String(col).trim();
            const lowerHeader = headerStr.toLowerCase();

            // Ignore rekap deskriptif like 'KB kim', 'S kim', 'PM kim', 'NO'
            if (/^(no|no\.|kb\s|pm\s)/i.test(headerStr) || /^(s\s+[a-z]+)$/i.test(headerStr)) {
              colClassifications.push({ colIndex: idx, type: "ignore" });
              return;
            }

            // Identity
            if (["nisn", "nis", "nomor induk", "no induk"].includes(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "nis" });
            } else if (["nama", "nama lengkap", "nama siswa"].includes(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "nama" });
            } else if (["asal sekolah", "sekolah asal"].includes(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "asal_sekolah" });
            } else if (["status siswa", "status"].includes(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "status_siswa" });
            } else if (["program", "program tag"].includes(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "program" });
            } else if (["kelas penempatan", "kelas", "kelompok"].includes(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "kelas_penempatan" });
            }
            // Attendance
            else if (["sesi efektif", "total sesi"].includes(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "sesi_efektif" });
            } else if (["hadir"].includes(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "hadir" });
            } else if (["sakit"].includes(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "sakit" });
            } else if (["izin"].includes(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "izin" });
            } else if (["alpa", "alpha"].includes(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "alpa" });
            }
            // Pesan / Catatan
            else if (["saran", "pesan", "saran dan pesan", "catatan", "evaluasi"].includes(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "catatan" });
            }
            // UTBK
            else if (UTBK_COMPONENT_CODES.has(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "utbk", meta: { kodeKomponen: lowerHeader.toUpperCase() } });
            }
            // Universitas
            else if (UNIV_COLUMNS.includes(lowerHeader)) {
              colClassifications.push({ colIndex: idx, type: "univ", meta: { fieldName: lowerHeader } });
            }
            // Regular Grade
            else {
              const gradeParsed = parseSubjectGradeHeader(headerStr);
              if (gradeParsed) {
                colClassifications.push({
                  colIndex: idx,
                  type: "regular_grade",
                  meta: gradeParsed,
                });

                // Check candidate subjects
                const dictEntry = MAPEL_DICTIONARY[gradeParsed.kode];
                if (dictEntry && !candidateSubjectMap.has(gradeParsed.kode)) {
                  candidateSubjectMap.set(gradeParsed.kode, {
                    kode: dictEntry.kode,
                    nama_mapel: dictEntry.nama_mapel,
                    defaultKategori: dictEntry.defaultKategori,
                  });
                }
              } else {
                colClassifications.push({ colIndex: idx, type: "ignore" });
              }
            }
          });

          // Process student data rows
          for (let r = 1; r < rows2D.length; r++) {
            const rowData = rows2D[r] as any[];
            if (!rowData || rowData.length === 0) continue;

            let nis = "";
            let nama = "";
            let asalSekolah = "";
            let statusSiswa = "Aktif";
            let programTag: string | null = null;
            let kelasPenempatan = sheetName;

            let attendance = { totalSesi: 0, hadir: 0, sakit: 0, izin: 0, alpha: 0 };
            let hasAttendance = false;
            let catatanStr = "";

            const studentGrades: WideStudentRow["grades"] = [];
            const utbkGrades: WideStudentRow["utbkGrades"] = [];
            let univChoicesTemp: Record<string, string> = {};

            colClassifications.forEach((cls) => {
              const val = rowData[cls.colIndex];
              if (val === undefined || val === null || val === "") return;

              const strVal = String(val).trim();

              switch (cls.type) {
                case "nis":
                  nis = strVal;
                  break;
                case "nama":
                  nama = strVal;
                  break;
                case "asal_sekolah":
                  asalSekolah = strVal;
                  break;
                case "status_siswa":
                  statusSiswa = strVal;
                  break;
                case "program":
                  programTag = strVal;
                  break;
                case "kelas_penempatan":
                  kelasPenempatan = strVal;
                  break;
                case "sesi_efektif":
                  attendance.totalSesi = Number(strVal) || 0;
                  hasAttendance = true;
                  break;
                case "hadir":
                  attendance.hadir = Number(strVal) || 0;
                  hasAttendance = true;
                  break;
                case "sakit":
                  attendance.sakit = Number(strVal) || 0;
                  hasAttendance = true;
                  break;
                case "izin":
                  attendance.izin = Number(strVal) || 0;
                  hasAttendance = true;
                  break;
                case "alpa":
                  attendance.alpha = Number(strVal) || 0;
                  hasAttendance = true;
                  break;
                case "catatan":
                  catatanStr = strVal;
                  break;
                case "regular_grade": {
                  const numSkor = Number(String(val).replace(/,/g, "."));
                  if (!isNaN(numSkor)) {
                    studentGrades.push({
                      kodeMapel: cls.meta.kode,
                      urutanSesi: cls.meta.urutan,
                      rawHeader: String(headerRow[cls.colIndex]),
                      skor: numSkor,
                    });
                  }
                  break;
                }
                case "utbk": {
                  const numSkor = Number(String(val).replace(/,/g, "."));
                  if (!isNaN(numSkor)) {
                    utbkGrades.push({
                      kodeKomponen: cls.meta.kodeKomponen,
                      skor: numSkor,
                    });
                  }
                  break;
                }
                case "univ": {
                  univChoicesTemp[cls.meta.fieldName] = strVal;
                  break;
                }
              }
            });

            // Skip row if no NIS and no Nama
            if (!nis && !nama) continue;

            if (!nis && nama) {
              sheetResult.errors.push({
                sheetName,
                rowIndex: r + 1,
                columnName: "NISN/NIS",
                message: `Siswa "${nama}" tidak memiliki NISN/NIS.`,
                severity: "warning",
              });
            }

            if (nis && !candidateStudentMap.has(nis)) {
              candidateStudentMap.set(nis, {
                nis,
                nama: nama || "Tanpa Nama",
                kelasPenempatan: kelasPenempatan || sheetName,
                asalSekolah,
                statusSiswa,
                programTag,
              });
            }

            // Build University choices array if any
            const universityChoices: WideStudentRow["universityChoices"] = [];
            if (univChoicesTemp["univ"] || univChoicesTemp["univ1"]) {
              universityChoices.push({
                pilihanKe: 1,
                universitas: univChoicesTemp["univ"] || univChoicesTemp["univ1"] || "",
                jurusan: univChoicesTemp["j"] || univChoicesTemp["j1"] || "-",
                status: univChoicesTemp["p"] || univChoicesTemp["p1"] || undefined,
              });
            }

            const studentRow: WideStudentRow = {
              rowIndex: r + 1,
              sheetName,
              nis,
              nama,
              asalSekolah,
              statusSiswa,
              programTag,
              kelasPenempatan,
              attendance: hasAttendance ? attendance : undefined,
              catatan: catatanStr || undefined,
              grades: studentGrades,
              utbkGrades,
              universityChoices,
            };

            sheetResult.rows.push(studentRow);
            result.totalStudents++;
            result.totalGrades += studentGrades.length;
            result.totalUtbk += utbkGrades.length;
            result.totalUniversityChoices += universityChoices.length;
          }

          result.sheetResults.push(sheetResult);
          result.allErrors.push(...sheetResult.errors);
        }

        result.candidateClasses = Array.from(candidateClassMap.values());
        result.candidateSubjects = Array.from(candidateSubjectMap.values());
        result.candidateStudents = Array.from(candidateStudentMap.values());

        resolve(result);
      } catch (err: any) {
        result.allErrors.push({
          sheetName: "-",
          rowIndex: 0,
          message: `Gagal membaca file Excel: ${err.message || err}`,
          severity: "error",
        });
        resolve(result);
      }
    };

    reader.readAsArrayBuffer(file);
  });
}
