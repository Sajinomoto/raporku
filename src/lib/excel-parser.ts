export interface ExcelGradeRow {
  nis: string;
  tanggal: string; // "YYYY-MM-DD"
  nama_mapel: string;
  materi: string;
  skor: number;
}

export interface ParseResult {
  rows: ExcelGradeRow[];
  errors: ParseError[];
  totalRows: number;
}

export interface ParseError {
  row: number; // 1-indexed row number in Excel
  reason: string;
}

/**
 * Normalize header name: lowercase, trim, remove extra spaces
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s]/g, "");
}

/**
 * Detect column role based on header name
 */
function detectColumnRole(header: string): "nis" | "tanggal" | "mapel" | "materi" | "skor" | "unknown" {
  const h = normalizeHeader(header);

  if (["nis", "nisn", "nomor induk", "nomor induk siswa", "id siswa", "student id", "studentid"].includes(h)) {
    return "nis";
  }
  if (["tanggal", "date", "tgl", "hari", "hari/tanggal"].includes(h)) {
    return "tanggal";
  }
  if (["mata pelajaran", "mapel", "pelajaran", "subject", "nama mapel", "nama pelajaran"].includes(h)) {
    return "mapel";
  }
  if (["materi", "topic", "topik", "materi pembelajaran", "bahasan"].includes(h)) {
    return "materi";
  }
  if (["nilai", "skor", "score", "grade", "angka", "jumlah nilai"].includes(h)) {
    return "skor";
  }

  return "unknown";
}

/**
 * Parse a date value from Excel cell to "YYYY-MM-DD" format
 */
function parseDate(value: any): string | null {
  if (!value) return null;

  // If it's a number (Excel serial date)
  if (typeof value === "number") {
    // Excel serial date: days since 1900-01-01 (with the 1900 leap year bug)
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
    return null;
  }

  // If it's a string
  const str = String(value).trim();
  
  // Try common date formats
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    const [_, day, month, year] = dmy;
    const y = year.length === 2 ? `20${year}` : year;
    return `${y}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // YYYY/MM/DD or YYYY-MM-DD
  const ymd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymd) {
    const [_, year, month, day] = ymd;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Try native Date parse as last resort
  const nativeDate = new Date(str);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Parse a number value from Excel cell
 */
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  
  if (typeof value === "number") return value;
  
  // Try string conversion
  const str = String(value).trim().replace(/,/g, ".");
  const num = Number(str);
  if (!isNaN(num)) return num;
  
  return null;
}

/**
 * Parse an uploaded Excel file and extract grade data
 */
export async function parseGradeExcel(file: File): Promise<ParseResult> {
  const result: ParseResult = {
    rows: [],
    errors: [],
    totalRows: 0,
  };

  let XLSX: typeof import("xlsx");

  try {
    // Dynamic import to keep bundle size small
    XLSX = await import("xlsx");
  } catch {
    result.errors.push({ row: 0, reason: "Gagal memuat library parser Excel." });
    return result;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX!.read(data, { type: "array" });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          result.errors.push({ row: 0, reason: "File Excel tidak memiliki sheet." });
          resolve(result);
          return;
        }

        const sheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays (raw) first to detect header
        const rawData: any[][] = XLSX!.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        
        if (rawData.length < 2) {
          result.errors.push({ row: 0, reason: "File Excel kosong atau hanya berisi header." });
          resolve(result);
          return;
        }

        // First row = headers
        const headers = rawData[0].map((h: any) => String(h).trim());
        
        // Detect column mapping
        const columnMapping: { [key: number]: "nis" | "tanggal" | "mapel" | "materi" | "skor" | "unknown" } = {};
        let hasNis = false;
        let hasSkor = false;

        headers.forEach((header, idx) => {
          const role = detectColumnRole(header);
          columnMapping[idx] = role;
          if (role === "nis") hasNis = true;
          if (role === "skor") hasSkor = true;
        });

        // Validate required columns
        if (!hasNis) {
          result.errors.push({
            row: 0,
            reason: "Kolom NIS tidak ditemukan. Pastikan file memiliki kolom bernama 'NIS' atau 'NISN'.",
          });
        }
        if (!hasSkor) {
          result.errors.push({
            row: 0,
            reason: "Kolom Nilai/Skor tidak ditemukan. Pastikan file memiliki kolom bernama 'Nilai' atau 'Skor'.",
          });
        }

        // If missing critical columns, return early
        if (!hasNis || !hasSkor) {
          // But still try to parse what we can
        }

        // Parse data rows
        result.totalRows = rawData.length - 1;

        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          const rowNum = i + 1; // 1-indexed for user display
          
          // Skip completely empty rows
          if (!row || row.every((cell: any) => cell === "" || cell === null || cell === undefined)) {
            continue;
          }

          let nis = "";
          let tanggal: string | null = null;
          let nama_mapel = "";
          let materi = "";
          let skor: number | null = null;
          let rowHasData = false;

          for (let colIdx = 0; colIdx < headers.length; colIdx++) {
            const cellValue = row[colIdx];
            const role = columnMapping[colIdx];
            
            if (!role || role === "unknown") continue;

            switch (role) {
              case "nis":
                nis = String(cellValue).trim();
                if (nis) rowHasData = true;
                break;
              case "tanggal":
                tanggal = parseDate(cellValue);
                if (tanggal) rowHasData = true;
                break;
              case "mapel":
                nama_mapel = String(cellValue).trim();
                if (nama_mapel) rowHasData = true;
                break;
              case "materi":
                materi = String(cellValue).trim();
                if (materi) rowHasData = true;
                break;
              case "skor":
                skor = parseNumber(cellValue);
                if (skor !== null) rowHasData = true;
                break;
            }
          }

          // Skip completely empty rows
          if (!rowHasData) continue;

          // Validate NIS
          if (!nis) {
            result.errors.push({ row: rowNum, reason: "NIS kosong pada baris ini." });
            continue;
          }
          if (nis.length < 3) {
            result.errors.push({ row: rowNum, reason: `NIS "${nis}" tidak valid (terlalu pendek).` });
            continue;
          }

          // Validate subject name
          if (!nama_mapel) {
            result.errors.push({ row: rowNum, reason: `NIS "${nis}": Nama mata pelajaran kosong.` });
            continue;
          }

          // Validate score
          if (skor === null) {
            result.errors.push({ row: rowNum, reason: `NIS "${nis}": Nilai tidak valid atau kosong.` });
            continue;
          }
          if (skor < 0 || skor > 100) {
            result.errors.push({ row: rowNum, reason: `NIS "${nis}": Nilai ${skor} di luar rentang 0-100.` });
            continue;
          }

          // Validate date
          if (!tanggal) {
            result.errors.push({ row: rowNum, reason: `NIS "${nis}": Format tanggal tidak dikenali. Gunakan format DD/MM/YYYY atau YYYY-MM-DD.` });
            continue;
          }

          result.rows.push({
            nis,
            tanggal,
            nama_mapel,
            materi,
            skor,
          });
        }

        resolve(result);
      } catch (err) {
        result.errors.push({
          row: 0,
          reason: `Gagal membaca file Excel: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
        resolve(result);
      }
    };

    reader.onerror = () => {
      result.errors.push({ row: 0, reason: "Gagal membaca file yang diunggah." });
      resolve(result);
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate a template Excel file (client-side) and trigger download
 */
export function downloadTemplate(): void {
  // Dynamic import to keep bundle small
  import("xlsx").then((XLSX) => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["NIS", "Tanggal", "Mata Pelajaran", "Materi", "Nilai"],
      ["12345", "10/01/2026", "Matematika", "Persamaan Kuadrat", "85"],
      ["12345", "10/01/2026", "Fisika", "Hukum Newton", "90"],
      ["12346", "10/01/2026", "Matematika", "Persamaan Kuadrat", "92"],
      ["12346", "10/01/2026", "Bahasa Indonesia", "Teks Narasi", "78"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, // NIS
      { wch: 14 }, // Tanggal
      { wch: 20 }, // Mata Pelajaran
      { wch: 24 }, // Materi
      { wch: 8 },  // Nilai
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Data Nilai");
    XLSX.writeFile(wb, "Template_Import_Nilai_Raporku.xlsx");
  });
}

/**
 * Validate parsed rows against actual database records.
 * Returns mapped data with siswa_ids and mapel_ids resolved.
 */
export async function validateAndMapRows(
  rows: ExcelGradeRow[],
  supabaseClient: any,
  classId?: string
): Promise<{
  valid: Array<{
    siswa_id: string;
    mapel_id: string;
    tanggal: string;
    materi: string;
    skor: number;
  }>;
  errors: Array<{ rowIndex: number; nis: string; reason: string }>;
}> {
  const result: { valid: any[]; errors: any[] } = {
    valid: [],
    errors: [],
  };

  if (rows.length === 0) return result;

  try {
    // 1. Collect unique NIS values
    const uniqueNis = [...new Set(rows.map((r) => r.nis))];

    // 2. Fetch matching students
    let studentQuery = supabaseClient
      .from("siswa")
      .select("id, nis, kelas_id")
      .in("nis", uniqueNis);

    // If scoped to a class, filter by kelas_id too
    if (classId) {
      studentQuery = studentQuery.eq("kelas_id", classId);
    }

    const { data: students } = await studentQuery;
    const studentMap = new Map<string, string>();
    (students || []).forEach((s: any) => {
      studentMap.set(s.nis, s.id);
    });

    // 3. Collect unique subject names
    const uniqueMapel = [...new Set(rows.map((r) => r.nama_mapel))];

    // 4. Fetch matching subjects
    const { data: subjects } = await supabaseClient
      .from("mata_pelajaran")
      .select("id, nama_mapel")
      .in("nama_mapel", uniqueMapel);

    const subjectMap = new Map<string, string>();
    (subjects || []).forEach((s: any) => {
      subjectMap.set(s.nama_mapel.toLowerCase(), s.id);
    });

    // 5. Map each row
    rows.forEach((row, idx) => {
      const siswaId = studentMap.get(row.nis);
      if (!siswaId) {
        result.errors.push({
          rowIndex: idx,
          nis: row.nis,
          reason: classId
            ? `Siswa dengan NIS "${row.nis}" tidak ditemukan di kelas ini.`
            : `Siswa dengan NIS "${row.nis}" tidak ditemukan di database.`,
        });
        return;
      }

      const mapelKey = row.nama_mapel.toLowerCase();
      const mapelId = subjectMap.get(mapelKey);
      if (!mapelId) {
        result.errors.push({
          rowIndex: idx,
          nis: row.nis,
          reason: `Mata pelajaran "${row.nama_mapel}" tidak ditemukan di database.`,
        });
        return;
      }

      result.valid.push({
        siswa_id: siswaId,
        mapel_id: mapelId,
        tanggal: row.tanggal,
        materi: row.materi,
        skor: row.skor,
      });
    });
  } catch (err) {
    result.errors.push({
      rowIndex: -1,
      nis: "",
      reason: `Error validasi database: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
  }

  return result;
}

/**
 * Bulk insert validated grade data into the `nilai` table
 */
export async function bulkInsertGrades(
  supabaseClient: any,
  data: Array<{
    siswa_id: string;
    mapel_id: string;
    tanggal: string;
    materi: string;
    skor: number;
  }>,
  onProgress?: (inserted: number, total: number) => void
): Promise<{ inserted: number; errors: string[] }> {
  const result = { inserted: 0, errors: [] as string[] };
  const batchSize = 100;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const payload = batch.map((d) => ({
      siswa_id: d.siswa_id,
      mapel_id: d.mapel_id,
      skor: d.skor,
      materi: d.materi || null,
      tanggal_pembelajaran: d.tanggal || null,
    }));

    const { error } = await supabaseClient.from("nilai").insert(payload);

    if (error) {
      // Jika terjadi error unique constraint
      if (error.code === "23505" || error.message.includes("unique constraint")) {
        result.errors.push(
          "Peringatan Database: Hapus constraint unik '(siswa_id, mapel_id)' di Supabase agar 1 siswa dapat menyimpan banyak riwayat nilai untuk mata pelajaran yang sama."
        );
      } else {
        result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      }
    } else {
      result.inserted += batch.length;
    }

    if (onProgress) {
      onProgress(result.inserted, data.length);
    }
  }

  return result;
}
