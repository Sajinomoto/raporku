export interface Kelas {
  id: string;
  nama_kelas: string;
  tahun_ajaran: string;
  jenjang: string;
  deskripsi?: string | null;
  jurusan?: string;
  program_tag?: string | null;
  created_at?: string;
}

export interface MataPelajaran {
  id: string;
  nama_mapel: string;
  kategori: string;
  jenjang: string;
  kode_mapel?: string | null;
  jurusan?: string;
  aktif?: boolean;
}

export interface Siswa {
  id: string;
  nis: string;
  nama_lengkap: string;
  kelas_id: string | null;
  foto_url: string | null;
  semester: string;
  tahun_ajaran: string;
  asal_sekolah: string;
  jenjang?: string;
  status_siswa?: string;
  program_tag?: string | null;
  created_at?: string;
}

export interface SesiPembelajaran {
  id: string;
  kelas_id: string;
  mapel_id: string;
  kode_sesi: string;
  urutan_sesi: number;
  tanggal?: string | null;
  materi?: string | null;
  jam?: string | null;
  kode_tentor?: string | null;
  sumber_import?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Nilai {
  id: string;
  siswa_id: string;
  mapel_id: string;
  skor: number;
  materi?: string | null;
  kode_tentor?: string | null;
  tanggal_pembelajaran?: string | null;
  jam?: string | null;
  sesi_id?: string | null;
}

export interface Kehadiran {
  id?: string;
  siswa_id: string;
  hadir: number;
  sakit: number;
  izin: number;
  alpha: number;
  total_sesi: number;
}

export interface CatatanGuru {
  id?: string;
  siswa_id: string;
  catatan: string;
  nama_guru?: string | null;
}

export interface TryoutUTBK {
  id: string;
  siswa_id: string;
  kelas_id?: string | null;
  nama_tryout: string;
  tanggal_tryout?: string | null;
  sumber_import?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TryoutUTBKDetail {
  id: string;
  tryout_id: string;
  kode_komponen: string;
  nama_komponen?: string | null;
  skor: number;
  created_at?: string;
}

export interface PilihanUniversitas {
  id: string;
  siswa_id: string;
  pilihan_ke: number;
  universitas: string;
  jurusan: string;
  status?: string | null;
  skor_acuan?: number | null;
  sumber_import?: string | null;
  created_at?: string;
  updated_at?: string;
}
