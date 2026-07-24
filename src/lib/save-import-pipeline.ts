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
 * Saves all confirmed candidates and import rows to Supabase database
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
  };

  try {
    // Step 1: Insert Candidate Classes
    if (resolvedData.candidateClasses.length > 0) {
      for (const cls of resolvedData.candidateClasses) {
        // Check existing by name
        const { data: existing } = await supabase
          .from("kelas")
          .select("id")
          .ilike("nama_kelas", cls.nama_kelas.trim())
          .limit(1);

        if (!existing || existing.length === 0) {
          const { error: insErr } = await supabase.from("kelas").insert({
            nama_kelas: cls.nama_kelas,
            jenjang: cls.jenjang,
            jurusan: cls.jurusan,
            program_tag: cls.program_tag,
            tahun_ajaran: cls.tahun_ajaran || options.tahunAjaran,
            deskripsi: "Dibuat otomatis dari Smart Import Excel",
          });

          if (insErr) throw insErr;
          summary.classesCreated++;
        }
      }
    }

    // Step 2: Insert Candidate Subjects
    if (resolvedData.candidateSubjects.length > 0) {
      for (const subj of resolvedData.candidateSubjects) {
        const { data: existing } = await supabase
          .from("mata_pelajaran")
          .select("id")
          .eq("jenjang", subj.jenjang)
          .eq("jurusan", subj.jurusan)
          .eq("kode_mapel", subj.kode_mapel)
          .limit(1);

        if (!existing || existing.length === 0) {
          const { error: insSubjErr } = await supabase.from("mata_pelajaran").insert({
            nama_mapel: subj.nama_mapel,
            kode_mapel: subj.kode_mapel,
            jenjang: subj.jenjang,
            jurusan: subj.jurusan,
            kategori: subj.kategori || "Peminatan",
            aktif: true,
          });

          if (insSubjErr) throw insSubjErr;
          summary.subjectsCreated++;
        }
      }
    }

    // Fetch refreshed master tables
    const [{ data: freshClasses }, { data: freshSubjects }] = await Promise.all([
      supabase.from("kelas").select("*"),
      supabase.from("mata_pelajaran").select("*"),
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

    // Step 3: Insert Candidate Students
    if (resolvedData.candidateStudents.length > 0) {
      for (const std of resolvedData.candidateStudents) {
        const lowerNis = std.nis.trim().toLowerCase();
        const { data: existingStd } = await supabase
          .from("siswa")
          .select("id")
          .eq("nis", std.nis)
          .limit(1);

        if (!existingStd || existingStd.length === 0) {
          const targetClassId = classMapByName.get(std.kelas_nama.trim().toLowerCase()) || null;

          const { error: stdInsErr } = await supabase.from("siswa").insert({
            nis: std.nis,
            nama_lengkap: std.nama_lengkap,
            kelas_id: targetClassId,
            asal_sekolah: std.asal_sekolah || "Import Excel",
            status_siswa: std.status_siswa || "Aktif",
            program_tag: std.program_tag || null,
            semester: options.semester,
            tahun_ajaran: options.tahunAjaran,
          });

          if (stdInsErr) throw stdInsErr;
          summary.studentsCreated++;
        }
      }
    }

    // Fetch refreshed student table
    const { data: freshStudents } = await supabase.from("siswa").select("id, nis");
    const studentMapByNis = new Map<string, string>();
    (freshStudents || []).forEach((s) => studentMapByNis.set(s.nis.trim().toLowerCase(), s.id));

    // Session cache map: key: `${classId}_${subjectId}_${kodeSesi}` -> sessionId
    const sessionCache = new Map<string, string>();

    // Step 4: Process Rows (Kehadiran, Catatan, Sesi & Nilai)
    for (const sheet of parseResult.sheetResults) {
      const classId = classMapByName.get(sheet.inferredClass.nama_kelas.trim().toLowerCase());

      for (const row of sheet.rows) {
        const studentId = studentMapByNis.get(row.nis.trim().toLowerCase());
        if (!studentId) continue; // Skip if student not found in DB

        // Presensi
        if (row.attendance) {
          const { error: attErr } = await supabase.from("kehadiran").upsert(
            {
              siswa_id: studentId,
              hadir: row.attendance.hadir,
              sakit: row.attendance.sakit,
              izin: row.attendance.izin,
              alpha: row.attendance.alpha,
              total_sesi: row.attendance.totalSesi,
            },
            { onConflict: "siswa_id" }
          );

          if (!attErr) summary.attendanceUpserted++;
        }

        // Catatan Guru
        if (row.catatan) {
          const { error: noteErr } = await supabase.from("catatan_guru").upsert(
            {
              siswa_id: studentId,
              catatan: row.catatan,
              nama_guru: "Guru Akademik (Import Excel)",
            },
            { onConflict: "siswa_id" }
          );

          if (!noteErr) summary.notesUpserted++;
        }

        // Nilai Regular Mapel
        for (const grade of row.grades) {
          const subjectKey = `${sheet.inferredClass.jenjang.toUpperCase()}_${sheet.inferredClass.jurusan.toUpperCase()}_${grade.kodeMapel.toLowerCase()}`;
          const fallbackKey = `${sheet.inferredClass.jenjang.toUpperCase()}_UMUM_${grade.kodeMapel.toLowerCase()}`;

          const subjectId = subjectMapByKey.get(subjectKey) || subjectMapByKey.get(fallbackKey);
          if (!subjectId) continue;

          // Sesi Pembelajaran resolve
          let sessionId: string | null = null;
          if (classId) {
            const kodeSesi = `${grade.kodeMapel}${grade.urutanSesi}`;
            const sessionKey = `${classId}_${subjectId}_${kodeSesi}`;

            if (sessionCache.has(sessionKey)) {
              sessionId = sessionCache.get(sessionKey)!;
            } else {
              // Lookup or insert sesi_pembelajaran
              const { data: existingSesi } = await supabase
                .from("sesi_pembelajaran")
                .select("id")
                .eq("kelas_id", classId)
                .eq("mapel_id", subjectId)
                .eq("kode_sesi", kodeSesi)
                .limit(1);

              if (existingSesi && existingSesi.length > 0) {
                sessionId = existingSesi[0].id;
              } else {
                const { data: newSesi } = await supabase
                  .from("sesi_pembelajaran")
                  .insert({
                    kelas_id: classId,
                    mapel_id: subjectId,
                    kode_sesi: kodeSesi,
                    urutan_sesi: grade.urutanSesi,
                    sumber_import: "Smart Import Excel",
                  })
                  .select("id");

                if (newSesi && newSesi[0]) {
                  sessionId = newSesi[0].id;
                  summary.sessionsCreatedOrFound++;
                }
              }

              if (sessionId) {
                sessionCache.set(sessionKey, sessionId);
              }
            }
          }

          // Insert into nilai
          const { error: gradeErr } = await supabase.from("nilai").insert({
            siswa_id: studentId,
            mapel_id: subjectId,
            skor: grade.skor,
            sesi_id: sessionId,
            materi: `Materi Sesi ${grade.urutanSesi} (${grade.kodeMapel.toUpperCase()})`,
          });

          if (!gradeErr) summary.gradesInserted++;
        }

        // Tryout UTBK (SMA)
        if (row.utbkGrades && row.utbkGrades.length > 0) {
          const { data: newUtbk, error: utbkErr } = await supabase
            .from("tryout_utbk")
            .insert({
              siswa_id: studentId,
              kelas_id: classId || null,
              nama_tryout: "Tryout UTBK (Import Excel)",
              sumber_import: "Smart Import Excel",
            })
            .select("id");

          if (!utbkErr && newUtbk && newUtbk[0]) {
            const tryoutId = newUtbk[0].id;
            const detailRows = row.utbkGrades.map((u) => ({
              tryout_id: tryoutId,
              kode_komponen: u.kodeKomponen,
              nama_komponen: u.namaKomponen || u.kodeKomponen,
              skor: u.skor,
            }));

            await supabase.from("tryout_utbk_detail").insert(detailRows);
            summary.utbkInserted = (summary.utbkInserted || 0) + row.utbkGrades.length;
          }
        }

        // Pilihan Universitas (SMA)
        if (row.universityChoices && row.universityChoices.length > 0) {
          for (const univ of row.universityChoices) {
            if (!univ.universitas) continue;
            await supabase.from("pilihan_universitas").insert({
              siswa_id: studentId,
              pilihan_ke: univ.pilihanKe,
              universitas: univ.universitas,
              jurusan: univ.jurusan || "Umum",
              status: univ.status || null,
              sumber_import: "Smart Import Excel",
            });
            summary.univChoicesInserted = (summary.univChoicesInserted || 0) + 1;
          }
        }
      }
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
