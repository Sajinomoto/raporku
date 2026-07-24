import { supabase } from "./supabase";
import { ResolvedSmartImportData } from "./smart-import-resolver";
import { WideWorkbookParseResult } from "./wide-excel-parser";

export interface SaveImportSummary {
  success: boolean;
  classesCreated: number;
  subjectsCreated: number;
  studentsCreated: number;
  attendanceUpserted: number;
  notesUpserted: number;
  sessionsCreatedOrFound: number;
  gradesInserted: number;
  utbkInserted?: number;
  univChoicesInserted?: number;
  errorMessage?: string;
}

/**
 * Ultra-fast batch save import pipeline to process thousands of Excel rows in seconds
 */
export async function executeSaveImportPipeline(
  resolvedData: ResolvedSmartImportData,
  parseResult: WideWorkbookParseResult,
  options: { tahunAjaran: string; semester: string }
): Promise<SaveImportSummary> {
  const summary: SaveImportSummary = {
    success: false,
    classesCreated: 0,
    subjectsCreated: 0,
    studentsCreated: 0,
    attendanceUpserted: 0,
    notesUpserted: 0,
    sessionsCreatedOrFound: 0,
    gradesInserted: 0,
    utbkInserted: 0,
    univChoicesInserted: 0,
  };

  try {
    // 1. Bulk Insert Candidate Classes
    if (resolvedData.candidateClasses.length > 0) {
      const { data: existingClasses } = await supabase.from("kelas").select("nama_kelas");
      const existingNameSet = new Set((existingClasses || []).map((c) => c.nama_kelas.trim().toLowerCase()));

      const newClassesToInsert = resolvedData.candidateClasses
        .filter((cls) => !existingNameSet.has(cls.nama_kelas.trim().toLowerCase()))
        .map((cls) => ({
          nama_kelas: cls.nama_kelas,
          jenjang: cls.jenjang,
          jurusan: cls.jurusan,
          program_tag: cls.program_tag,
          tahun_ajaran: cls.tahun_ajaran || options.tahunAjaran,
          deskripsi: "Dibuat otomatis dari Smart Import Excel",
        }));

      if (newClassesToInsert.length > 0) {
        const { error: clsErr } = await supabase.from("kelas").insert(newClassesToInsert);
        if (clsErr) throw clsErr;
        summary.classesCreated = newClassesToInsert.length;
      }
    }

    // 2. Bulk Insert Candidate Subjects
    if (resolvedData.candidateSubjects.length > 0) {
      const { data: existingSubjects } = await supabase.from("mata_pelajaran").select("jenjang, jurusan, kode_mapel");
      const existingSubjSet = new Set(
        (existingSubjects || []).map(
          (m) => `${m.jenjang.toUpperCase()}_${(m.jurusan || "UMUM").toUpperCase()}_${m.kode_mapel?.toLowerCase()}`
        )
      );

      const newSubjToInsert = resolvedData.candidateSubjects
        .filter((subj) => {
          const key = `${subj.jenjang.toUpperCase()}_${subj.jurusan.toUpperCase()}_${subj.kode_mapel.toLowerCase()}`;
          return !existingSubjSet.has(key);
        })
        .map((subj) => ({
          nama_mapel: subj.nama_mapel,
          kode_mapel: subj.kode_mapel,
          jenjang: subj.jenjang,
          jurusan: subj.jurusan,
          kategori: subj.kategori || "Peminatan",
          aktif: true,
        }));

      if (newSubjToInsert.length > 0) {
        const { error: subjErr } = await supabase.from("mata_pelajaran").insert(newSubjToInsert);
        if (subjErr) throw subjErr;
        summary.subjectsCreated = newSubjToInsert.length;
      }
    }

    // 3. Fetch Refreshed Master Tables (In Parallel)
    const [{ data: freshClasses }, { data: freshSubjects }] = await Promise.all([
      supabase.from("kelas").select("id, nama_kelas"),
      supabase.from("mata_pelajaran").select("id, jenjang, jurusan, kode_mapel"),
    ]);

    const classMapByName = new Map<string, string>();
    (freshClasses || []).forEach((c) => classMapByName.set(c.nama_kelas.trim().toLowerCase(), c.id));

    const subjectMapByKey = new Map<string, string>();
    (freshSubjects || []).forEach((m) => {
      if (m.kode_mapel) {
        const key = `${m.jenjang.toUpperCase()}_${(m.jurusan || "UMUM").toUpperCase()}_${m.kode_mapel.toLowerCase()}`;
        subjectMapByKey.set(key, m.id);
      }
    });

    // 4. Bulk Insert Candidate Students
    if (resolvedData.candidateStudents.length > 0) {
      const { data: existingStudents } = await supabase.from("siswa").select("nis");
      const existingNisSet = new Set((existingStudents || []).map((s) => s.nis.trim().toLowerCase()));

      const newStudentsToInsert = resolvedData.candidateStudents
        .filter((std) => !existingNisSet.has(std.nis.trim().toLowerCase()))
        .map((std) => ({
          nis: std.nis,
          nama_lengkap: std.nama_lengkap,
          kelas_id: classMapByName.get(std.kelas_nama.trim().toLowerCase()) || null,
          asal_sekolah: std.asal_sekolah || "Import Excel",
          status_siswa: std.status_siswa || "Aktif",
          program_tag: std.program_tag || null,
          semester: options.semester,
          tahun_ajaran: options.tahunAjaran,
        }));

      if (newStudentsToInsert.length > 0) {
        const { error: stdErr } = await supabase.from("siswa").insert(newStudentsToInsert);
        if (stdErr) throw stdErr;
        summary.studentsCreated = newStudentsToInsert.length;
      }
    }

    // 5. Fetch Refreshed Student Map
    const { data: freshStudents } = await supabase.from("siswa").select("id, nis");
    const studentMapByNis = new Map<string, string>();
    (freshStudents || []).forEach((s) => studentMapByNis.set(s.nis.trim().toLowerCase(), s.id));

    // Prepare Bulk Data Holders
    const attendanceBatch: { siswa_id: string; hadir: number; sakit: number; izin: number; alpha: number; total_sesi: number }[] = [];
    const notesBatch: { siswa_id: string; catatan: string; nama_guru: string }[] = [];
    const targetStudentIdsSet = new Set<string>();

    // Unique Sessions Collector: key `${classId}_${subjectId}_${kodeSesi}` -> payload
    const neededSessionsMap = new Map<string, { kelas_id: string; mapel_id: string; kode_sesi: string; urutan_sesi: number }>();
    
    // Raw grade items before session assignment
    const rawGradesList: { studentId: string; classId?: string; subjectId: string; kodeSesi: string; urutanSesi: number; kodeMapel: string; skor: number }[] = [];
    
    const utbkGroupedByStudent = new Map<string, { studentId: string; classId?: string; grades: { kodeKomponen: string; namaKomponen?: string; skor: number }[] }>();
    const univChoicesBatch: { siswa_id: string; pilihan_ke: number; universitas: string; jurusan: string; status: string | null; sumber_import: string }[] = [];

    // Parse loop to prepare bulk payloads
    for (const sheet of parseResult.sheetResults) {
      const classId = classMapByName.get(sheet.inferredClass.nama_kelas.trim().toLowerCase());

      for (const row of sheet.rows) {
        const studentId = studentMapByNis.get(row.nis.trim().toLowerCase());
        if (!studentId) continue;

        targetStudentIdsSet.add(studentId);

        if (row.attendance) {
          attendanceBatch.push({
            siswa_id: studentId,
            hadir: row.attendance.hadir,
            sakit: row.attendance.sakit,
            izin: row.attendance.izin,
            alpha: row.attendance.alpha,
            total_sesi: row.attendance.totalSesi,
          });
        }

        if (row.catatan) {
          notesBatch.push({
            siswa_id: studentId,
            catatan: row.catatan,
            nama_guru: "Guru Akademik (Import Excel)",
          });
        }

        for (const grade of row.grades) {
          const subjectKey = `${sheet.inferredClass.jenjang.toUpperCase()}_${sheet.inferredClass.jurusan.toUpperCase()}_${grade.kodeMapel.toLowerCase()}`;
          const fallbackKey = `${sheet.inferredClass.jenjang.toUpperCase()}_UMUM_${grade.kodeMapel.toLowerCase()}`;
          const subjectId = subjectMapByKey.get(subjectKey) || subjectMapByKey.get(fallbackKey);

          if (!subjectId) continue;

          const kodeSesi = `${grade.kodeMapel}${grade.urutanSesi}`;

          if (classId) {
            const sessionKey = `${classId}_${subjectId}_${kodeSesi}`;
            if (!neededSessionsMap.has(sessionKey)) {
              neededSessionsMap.set(sessionKey, {
                kelas_id: classId,
                mapel_id: subjectId,
                kode_sesi: kodeSesi,
                urutan_sesi: grade.urutanSesi,
              });
            }
          }

          rawGradesList.push({
            studentId,
            classId,
            subjectId,
            kodeSesi,
            urutanSesi: grade.urutanSesi,
            kodeMapel: grade.kodeMapel,
            skor: grade.skor,
          });
        }

        if (row.utbkGrades && row.utbkGrades.length > 0) {
          utbkGroupedByStudent.set(studentId, {
            studentId,
            classId,
            grades: row.utbkGrades,
          });
        }

        if (row.universityChoices && row.universityChoices.length > 0) {
          for (const univ of row.universityChoices) {
            if (!univ.universitas) continue;
            univChoicesBatch.push({
              siswa_id: studentId,
              pilihan_ke: univ.pilihanKe,
              universitas: univ.universitas,
              jurusan: univ.jurusan || "Umum",
              status: univ.status || null,
              sumber_import: "Smart Import Excel",
            });
          }
        }
      }
    }

    const targetStudentIds = Array.from(targetStudentIdsSet);

    // 6. Bulk Process Attendance & Notes (Clean replace existing for target students)
    if (targetStudentIds.length > 0) {
      if (attendanceBatch.length > 0) {
        await supabase.from("kehadiran").delete().in("siswa_id", targetStudentIds);
        const { error: attErr } = await supabase.from("kehadiran").insert(attendanceBatch);
        if (!attErr) summary.attendanceUpserted = attendanceBatch.length;
      }

      if (notesBatch.length > 0) {
        await supabase.from("catatan_guru").delete().in("siswa_id", targetStudentIds);
        const { error: noteErr } = await supabase.from("catatan_guru").insert(notesBatch);
        if (!noteErr) summary.notesUpserted = notesBatch.length;
      }
    }

    // 7. Bulk Process Sesi Pembelajaran
    const sessionCache = new Map<string, string>();
    if (neededSessionsMap.size > 0) {
      const { data: existingSessions } = await supabase
        .from("sesi_pembelajaran")
        .select("id, kelas_id, mapel_id, kode_sesi");

      (existingSessions || []).forEach((s) => {
        const key = `${s.kelas_id}_${s.mapel_id}_${s.kode_sesi}`;
        sessionCache.set(key, s.id);
      });

      const missingSessions = Array.from(neededSessionsMap.entries())
        .filter(([key]) => !sessionCache.has(key))
        .map(([, payload]) => ({
          ...payload,
          sumber_import: "Smart Import Excel",
        }));

      if (missingSessions.length > 0) {
        const { data: createdSessions, error: sesErr } = await supabase
          .from("sesi_pembelajaran")
          .insert(missingSessions)
          .select("id, kelas_id, mapel_id, kode_sesi");

        if (!sesErr && createdSessions) {
          createdSessions.forEach((s) => {
            const key = `${s.kelas_id}_${s.mapel_id}_${s.kode_sesi}`;
            sessionCache.set(key, s.id);
          });
          summary.sessionsCreatedOrFound += createdSessions.length;
        }
      }
    }

    // 8. Bulk Process Grades (Nilai) in 500-item Chunks
    if (rawGradesList.length > 0) {
      const gradesToInsert = rawGradesList.map((g) => {
        let sessionId: string | null = null;
        if (g.classId) {
          const sessionKey = `${g.classId}_${g.subjectId}_${g.kodeSesi}`;
          sessionId = sessionCache.get(sessionKey) || null;
        }
        return {
          siswa_id: g.studentId,
          mapel_id: g.subjectId,
          skor: g.skor,
          sesi_id: sessionId,
          materi: `Materi Sesi ${g.urutanSesi} (${g.kodeMapel.toUpperCase()})`,
        };
      });

      // Insert in chunks of 500 to avoid HTTP request size limits
      const CHUNK_SIZE = 500;
      for (let i = 0; i < gradesToInsert.length; i += CHUNK_SIZE) {
        const chunk = gradesToInsert.slice(i, i + CHUNK_SIZE);
        const { error: gradeErr } = await supabase.from("nilai").insert(chunk);
        if (!gradeErr) {
          summary.gradesInserted += chunk.length;
        }
      }
    }

    // 9. Bulk Process UTBK & University Choices
    if (utbkGroupedByStudent.size > 0) {
      for (const utbkItem of utbkGroupedByStudent.values()) {
        const { data: newUtbk, error: utbkErr } = await supabase
          .from("tryout_utbk")
          .insert({
            siswa_id: utbkItem.studentId,
            kelas_id: utbkItem.classId || null,
            nama_tryout: "Tryout UTBK (Import Excel)",
            sumber_import: "Smart Import Excel",
          })
          .select("id");

        if (!utbkErr && newUtbk && newUtbk[0]) {
          const tryoutId = newUtbk[0].id;
          const detailRows = utbkItem.grades.map((u) => ({
            tryout_id: tryoutId,
            kode_komponen: u.kodeKomponen,
            nama_komponen: u.namaKomponen || u.kodeKomponen,
            skor: u.skor,
          }));

          await supabase.from("tryout_utbk_detail").insert(detailRows);
          summary.utbkInserted = (summary.utbkInserted || 0) + utbkItem.grades.length;
        }
      }
    }

    if (univChoicesBatch.length > 0) {
      const { error: univErr } = await supabase.from("pilihan_universitas").insert(univChoicesBatch);
      if (!univErr) summary.univChoicesInserted = univChoicesBatch.length;
    }

    summary.success = true;
    return summary;
  } catch (err: any) {
    console.error("Error executing save import pipeline:", err);
    summary.success = false;
    summary.errorMessage = err.message || String(err);
    return summary;
  }
}
