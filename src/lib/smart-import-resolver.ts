import { WideWorkbookParseResult, WideStudentRow, WideParseError } from "./wide-excel-parser";
import { Siswa, Kelas, MataPelajaran } from "@/types/database";

export interface ResolvedSmartImportData {
  summary: {
    totalSheetsProcessed: number;
    totalStudentsParsed: number;
    existingStudentsMatched: number;
    candidateStudentsToCreate: number;
    existingClassesMatched: number;
    candidateClassesToCreate: number;
    existingSubjectsMatched: number;
    candidateSubjectsToCreate: number;
    totalSessionsToCreate: number;
    totalGradesToInsert: number;
    totalUtbkRowsToInsert: number;
    totalUniversityChoicesToInsert: number;
    totalErrors: number;
    totalWarnings: number;
  };

  candidateClasses: {
    nama_kelas: string;
    jenjang: "SD" | "SMP" | "SMA";
    jurusan: "IPA" | "IPS" | "UMUM";
    program_tag: string | null;
    tahun_ajaran: string;
  }[];

  candidateSubjects: {
    nama_mapel: string;
    kode_mapel: string;
    jenjang: string;
    jurusan: string;
    kategori: string;
  }[];

  candidateStudents: {
    nis: string;
    nama_lengkap: string;
    kelas_nama: string;
    sheet_kelas_nama?: string;
    asal_sekolah: string;
    status_siswa: string;
    program_tag: string | null;
  }[];

  resolvedRows: {
    sheetName: string;
    studentNis: string;
    studentNama: string;
    classNama: string;
    isNewStudent: boolean;
    isNewClass: boolean;
    attendance?: WideStudentRow["attendance"];
    catatan?: string;
    gradesCount: number;
    utbkCount: number;
    univCount: number;
  }[];

  errors: WideParseError[];
}

export interface ResolveOptions {
  mode: "strict" | "smart";
  autoCreateSiswa: boolean;
  tahunAjaran: string;
  semester: string;
  existingStudents: Siswa[];
  existingClasses: Kelas[];
  existingSubjects: MataPelajaran[];
}

/**
 * Resolves raw parsed workbook data against existing Supabase database records
 */
export function resolveSmartImport(
  parseResult: WideWorkbookParseResult,
  options: ResolveOptions
): ResolvedSmartImportData {
  const { mode, autoCreateSiswa, tahunAjaran, semester, existingStudents, existingClasses, existingSubjects } = options;

  // Build quick lookup maps
  const studentMapByNis = new Map<string, Siswa>();
  existingStudents.forEach((s) => studentMapByNis.set(s.nis.trim().toLowerCase(), s));

  const classMapByName = new Map<string, Kelas>();
  existingClasses.forEach((c) => classMapByName.set(c.nama_kelas.trim().toLowerCase(), c));

  // Helper key for subject lookup: `${jenjang}_${jurusan}_${kode_mapel}`
  const subjectMapByKey = new Map<string, MataPelajaran>();
  existingSubjects.forEach((m) => {
    if (m.kode_mapel) {
      const key = `${m.jenjang.toUpperCase()}_${(m.jurusan || "UMUM").toUpperCase()}_${m.kode_mapel.toLowerCase()}`;
      subjectMapByKey.set(key, m);
    }
  });

  const candidateClassesMap = new Map<string, ResolvedSmartImportData["candidateClasses"][0]>();
  const candidateSubjectsMap = new Map<string, ResolvedSmartImportData["candidateSubjects"][0]>();
  const candidateStudentsMap = new Map<string, ResolvedSmartImportData["candidateStudents"][0]>();
  const errors: WideParseError[] = [...parseResult.allErrors];

  let existingStudentsMatched = 0;
  let candidateStudentsToCreate = 0;
  let existingClassesMatched = 0;
  let candidateClassesToCreate = 0;
  let existingSubjectsMatched = 0;
  let candidateSubjectsToCreate = 0;
  let totalSessionsToCreate = 0;
  let totalGradesToInsert = 0;
  let totalUtbkRowsToInsert = 0;
  let totalUniversityChoicesToInsert = 0;

  const resolvedRows: ResolvedSmartImportData["resolvedRows"] = [];

  parseResult.sheetResults.forEach((sheet) => {
    const sheetClassName = sheet.inferredClass.nama_kelas;
    const lowerSheetClassName = sheetClassName.toLowerCase();

    // 1. Resolve Class
    let classMatched = classMapByName.has(lowerSheetClassName);
    if (classMatched) {
      existingClassesMatched++;
    } else {
      if (mode === "strict") {
        errors.push({
          sheetName: sheet.sheetName,
          rowIndex: 0,
          message: `Kelas "${sheetClassName}" tidak ditemukan di database (Strict Mode).`,
          severity: "error",
        });
      } else {
        if (!candidateClassesMap.has(lowerSheetClassName)) {
          candidateClassesMap.set(lowerSheetClassName, {
            nama_kelas: sheetClassName,
            jenjang: sheet.inferredClass.jenjang,
            jurusan: sheet.inferredClass.jurusan,
            program_tag: sheet.inferredClass.program_tag,
            tahun_ajaran: tahunAjaran,
          });
          candidateClassesToCreate++;
        }
      }
    }

    // 2. Resolve Students and Grades in this sheet
    sheet.rows.forEach((row) => {
      const lowerNis = row.nis.trim().toLowerCase();
      let studentMatched = studentMapByNis.has(lowerNis);

      if (studentMatched) {
        existingStudentsMatched++;
      } else {
        if (!autoCreateSiswa) {
          errors.push({
            sheetName: sheet.sheetName,
            rowIndex: row.rowIndex,
            columnName: "NISN",
            message: `Siswa "${row.nama}" (NISN: ${row.nis}) tidak terdaftar di database (Auto-create siswa nonaktif).`,
            severity: mode === "strict" ? "error" : "warning",
          });
        } else {
          if (row.nis && !candidateStudentsMap.has(lowerNis)) {
            candidateStudentsMap.set(lowerNis, {
              nis: row.nis,
              nama_lengkap: row.nama,
              kelas_nama: row.kelasPenempatan || sheetClassName,
              sheet_kelas_nama: sheetClassName,
              asal_sekolah: row.asalSekolah || "Import Excel",
              status_siswa: row.statusSiswa || "Aktif",
              program_tag: row.programTag || sheet.inferredClass.program_tag,
            });
            candidateStudentsToCreate++;
          }
        }
      }

      // 3. Resolve Regular Grades & Subjects
      const sessionsInRow = new Set<string>();

      row.grades.forEach((grade) => {
        const subjectKey = `${sheet.inferredClass.jenjang.toUpperCase()}_${sheet.inferredClass.jurusan.toUpperCase()}_${grade.kodeMapel.toLowerCase()}`;
        const fallbackSubjectKey = `${sheet.inferredClass.jenjang.toUpperCase()}_UMUM_${grade.kodeMapel.toLowerCase()}`;

        const subjectMatched = subjectMapByKey.has(subjectKey) || subjectMapByKey.has(fallbackSubjectKey);

        if (subjectMatched) {
          existingSubjectsMatched++;
        } else {
          if (mode === "strict") {
            errors.push({
              sheetName: sheet.sheetName,
              rowIndex: row.rowIndex,
              columnName: grade.rawHeader,
              message: `Mata pelajaran dengan kode "${grade.kodeMapel}" (${sheet.inferredClass.jenjang} ${sheet.inferredClass.jurusan}) tidak ditemukan (Strict Mode).`,
              severity: "error",
            });
          } else {
            const candidateSubjKey = `${sheet.inferredClass.jenjang}_${sheet.inferredClass.jurusan}_${grade.kodeMapel}`;
            if (!candidateSubjectsMap.has(candidateSubjKey)) {
              candidateSubjectsMap.set(candidateSubjKey, {
                nama_mapel: grade.kodeMapel.toUpperCase(),
                kode_mapel: grade.kodeMapel,
                jenjang: sheet.inferredClass.jenjang,
                jurusan: sheet.inferredClass.jurusan,
                kategori: "Peminatan",
              });
              candidateSubjectsToCreate++;
            }
          }
        }

        sessionsInRow.add(`${sheetClassName}_${grade.kodeMapel}_${grade.urutanSesi}`);
        totalGradesToInsert++;
      });

      totalSessionsToCreate += sessionsInRow.size;
      totalUtbkRowsToInsert += row.utbkGrades.length;
      totalUniversityChoicesToInsert += row.universityChoices.length;

      resolvedRows.push({
        sheetName: sheet.sheetName,
        studentNis: row.nis,
        studentNama: row.nama,
        classNama: sheetClassName,
        isNewStudent: !studentMatched,
        isNewClass: !classMatched,
        attendance: row.attendance,
        catatan: row.catatan,
        gradesCount: row.grades.length,
        utbkCount: row.utbkGrades.length,
        univCount: row.universityChoices.length,
      });
    });
  });

  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warningCount = errors.filter((e) => e.severity === "warning").length;

  return {
    summary: {
      totalSheetsProcessed: parseResult.sheetResults.length,
      totalStudentsParsed: parseResult.totalStudents,
      existingStudentsMatched,
      candidateStudentsToCreate,
      existingClassesMatched,
      candidateClassesToCreate,
      existingSubjectsMatched,
      candidateSubjectsToCreate,
      totalSessionsToCreate,
      totalGradesToInsert,
      totalUtbkRowsToInsert,
      totalUniversityChoicesToInsert,
      totalErrors: errorCount,
      totalWarnings: warningCount,
    },
    candidateClasses: Array.from(candidateClassesMap.values()),
    candidateSubjects: Array.from(candidateSubjectsMap.values()),
    candidateStudents: Array.from(candidateStudentsMap.values()),
    resolvedRows,
    errors,
  };
}
