export interface InferredClassInfo {
  nama_kelas: string;
  jenjang: "SD" | "SMP" | "SMA";
  jurusan: "IPA" | "IPS" | "UMUM";
  program_tag: string | null;
}

/**
 * Infer class metadata (jenjang, jurusan, program_tag) from class placement string.
 * Example inputs:
 *  - "12 SMA IPA REG A" -> { nama_kelas: "12 SMA IPA REG A", jenjang: "SMA", jurusan: "IPA", program_tag: "Reguler" }
 *  - "06 SD REG A"      -> { nama_kelas: "06 SD REG A", jenjang: "SD", jurusan: "UMUM", program_tag: "Reguler" }
 *  - "11 SMA IPS EXC B" -> { nama_kelas: "11 SMA IPS EXC B", jenjang: "SMA", jurusan: "IPS", program_tag: "Excellent" }
 */
export function inferClassInfo(rawClassName: string): InferredClassInfo {
  const cleanName = rawClassName.trim().replaceAll(/\s+/g, " ");
  const upper = cleanName.toUpperCase();

  // Detect Jenjang
  let jenjang: "SD" | "SMP" | "SMA" = "SD";
  if (upper.includes("SMA") || upper.includes("SMK") || /\b(10|11|12|X|XI|XII)\b/.test(upper)) {
    jenjang = "SMA";
  } else if (upper.includes("SMP") || /\b(7|8|9|VII|VIII|IX)\b/.test(upper)) {
    jenjang = "SMP";
  } else if (upper.includes("SD") || /\b(1|2|3|4|5|6|I|II|III|IV|V|VI)\b/.test(upper)) {
    jenjang = "SD";
  }

  // Detect Jurusan
  let jurusan: "IPA" | "IPS" | "UMUM" = "UMUM";
  if (jenjang === "SMA") {
    if (upper.includes("IPA") || upper.includes("MIPA") || upper.includes("SAINTEK")) {
      jurusan = "IPA";
    } else if (upper.includes("IPS") || upper.includes("SOSHUM")) {
      jurusan = "IPS";
    }
  }

  // Detect Program Tag
  let program_tag: string | null = null;
  if (upper.includes("REG") || upper.includes("REGULER")) {
    program_tag = "Reguler";
  } else if (upper.includes("EXC") || upper.includes("EXCELLENT")) {
    program_tag = "Excellent";
  } else if (upper.includes("INT") || upper.includes("INTENSIF")) {
    program_tag = "Intensif";
  } else if (upper.includes("HONOR") || upper.includes("HONORS")) {
    program_tag = "Honors";
  }

  return {
    nama_kelas: cleanName,
    jenjang,
    jurusan,
    program_tag,
  };
}
