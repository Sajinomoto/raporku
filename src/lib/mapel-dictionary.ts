export interface SubjectMetadata {
  kode: string;
  nama_mapel: string;
  defaultKategori: "Wajib" | "Peminatan" | "Muatan Lokal";
  aliases: string[];
}

export const MAPEL_DICTIONARY: Record<string, SubjectMetadata> = {
  mtk: {
    kode: "mtk",
    nama_mapel: "Matematika",
    defaultKategori: "Wajib",
    aliases: ["mtk", "math", "matematika"],
  },
  ipa: {
    kode: "ipa",
    nama_mapel: "IPA",
    defaultKategori: "Wajib",
    aliases: ["ipa", "science"],
  },
  ips: {
    kode: "ips",
    nama_mapel: "IPS",
    defaultKategori: "Wajib",
    aliases: ["ips", "social"],
  },
  bind: {
    kode: "bind",
    nama_mapel: "Bahasa Indonesia",
    defaultKategori: "Wajib",
    aliases: ["bind", "bindo", "b.indo", "b_indo", "indonesia"],
  },
  bing: {
    kode: "bing",
    nama_mapel: "Bahasa Inggris",
    defaultKategori: "Wajib",
    aliases: ["bing", "bingg", "b.ingg", "b_ingg", "b.ing", "inggris", "english"],
  },
  kim: {
    kode: "kim",
    nama_mapel: "Kimia",
    defaultKategori: "Peminatan",
    aliases: ["kim", "kimia"],
  },
  fis: {
    kode: "fis",
    nama_mapel: "Fisika",
    defaultKategori: "Peminatan",
    aliases: ["fis", "fisika"],
  },
  bio: {
    kode: "bio",
    nama_mapel: "Biologi",
    defaultKategori: "Peminatan",
    aliases: ["bio", "biologi"],
  },
  sos: {
    kode: "sos",
    nama_mapel: "Sosiologi",
    defaultKategori: "Peminatan",
    aliases: ["sos", "sosiologi"],
  },
  sej: {
    kode: "sej",
    nama_mapel: "Sejarah",
    defaultKategori: "Peminatan",
    aliases: ["sej", "sejarah"],
  },
  geo: {
    kode: "geo",
    nama_mapel: "Geografi",
    defaultKategori: "Peminatan",
    aliases: ["geo", "geografi"],
  },
  eko: {
    kode: "eko",
    nama_mapel: "Ekonomi",
    defaultKategori: "Peminatan",
    aliases: ["eko", "ekonomi"],
  },
  tps: {
    kode: "tps",
    nama_mapel: "TPS",
    defaultKategori: "Peminatan",
    aliases: ["tps"],
  },
};

/**
 * Normalizes subject alias (e.g., 'b.ingg' -> 'bing', 'kimia' -> 'kim')
 */
export function canonicalizeSubjectCode(rawCode: string): string | null {
  const clean = rawCode.toLowerCase().replace(/[\s._-]+/g, "");
  for (const [key, meta] of Object.entries(MAPEL_DICTIONARY)) {
    if (meta.aliases.some((alias) => alias.replace(/[\s._-]+/g, "") === clean)) {
      return key;
    }
  }
  return null;
}

/**
 * Parses header like 'kim1', 'fis2', 'mtk10' into canonical subject code and session index.
 * Returns null if not matching standard subject grade header format.
 */
export function parseSubjectGradeHeader(header: string): { kode: string; urutan: number; rawKode: string } | null {
  const cleanHeader = header.trim();
  const match = cleanHeader.match(/^([a-zA-Z._-]+)(\d+)$/);
  if (!match) return null;

  const rawKode = match[1];
  const urutan = parseInt(match[2], 10);
  const canonicalKode = canonicalizeSubjectCode(rawKode);

  if (!canonicalKode) return null;

  return {
    kode: canonicalKode,
    urutan,
    rawKode,
  };
}

/**
 * Checks if a subject code is known in dictionary
 */
export function isValidSubjectCode(code: string): boolean {
  return canonicalizeSubjectCode(code) !== null;
}
