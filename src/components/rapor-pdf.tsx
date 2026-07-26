"use client";

import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

// ── Types ──────────────────────────────────────────
export interface RaporPDFStudent {
  id: string;
  nis: string;
  nama_lengkap: string;
  kelas_id: string | null;
  foto_url: string | null;
  semester: string;
  tahun_ajaran: string;
  asal_sekolah: string;
}

export interface RaporPDFGrade {
  id: string;
  nama_mapel: string;
  kategori: string;
  skor: number;
  materi: string | null;
  kode_tentor: string | null;
  tanggal_pembelajaran: string | null;
  jam: string | null;
}

export interface RaporPDFAttendance {
  hadir: number;
  sakit: number;
  izin: number;
  alpha: number;
  total_sesi: number;
}

export interface RaporPDFNote {
  catatan: string;
  nama_guru: string;
}

export interface RaporPDFClass {
  id: string;
  nama_kelas: string;
}

export interface RaporPDFProps {
  student: RaporPDFStudent;
  grades: RaporPDFGrade[];
  attendance: RaporPDFAttendance | null;
  note: RaporPDFNote | null;
  classes: RaporPDFClass[];
  avgGrade: number;
  attendancePercent: number;
  overallPredicate: { letter: string; desc: string };
  chartItems: { label: string; score: number }[];
  countA: number;
  countB: number;
  countC: number;
  countD: number;
}

// ── Colors ──────────────────────────────────────────
const STRONG_BLUE = "#002583";
const MUSTARD = "#FFB800";
const ZINC_800 = "#27272a";
const ZINC_700 = "#3f3f46";
const ZINC_600 = "#52525b";
const ZINC_500 = "#71717a";
const ZINC_400 = "#a1a1aa";
const ZINC_200 = "#e4e4e7";
const ZINC_100 = "#f4f4f5";
const ZINC_50 = "#fafafa";
const WHITE = "#ffffff";
const EMERALD_600 = "#059669";
const PURPLE_600 = "#9333ea";
const RED_500 = "#ef4444";
const AMBER_500 = "#f59e0b";

// ── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: ZINC_800,
    lineHeight: 1.4,
  },
  // ── Header ──
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: ZINC_200,
    paddingBottom: 12,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: MUSTARD,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 16,
    fontWeight: "black",
    color: STRONG_BLUE,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "black",
    color: STRONG_BLUE,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 8,
    color: ZINC_500,
    fontWeight: "bold",
  },
  headerRightLabel: {
    fontSize: 8,
    color: ZINC_500,
    fontWeight: "bold",
    textTransform: "uppercase" as const,
    textAlign: "right" as const,
  },
  headerRightValue: {
    fontSize: 10,
    fontWeight: "black",
    color: STRONG_BLUE,
    textAlign: "right" as const,
  },

  // ── Identity ──
  identityRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  identityPhoto: {
    width: 68,
    height: 68,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ZINC_200,
    backgroundColor: ZINC_50,
  },
  identityPhotoPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ZINC_200,
    backgroundColor: `${STRONG_BLUE}10`,
    justifyContent: "center",
    alignItems: "center",
  },
  identityPhotoPlaceholderText: {
    fontSize: 18,
    color: STRONG_BLUE,
    fontWeight: "bold",
  },
  identityInfo: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  identityItem: {
    width: "48%",
    flexDirection: "row",
    gap: 4,
    paddingVertical: 1,
    alignItems: "baseline",
  },
  identityItemFull: {
    width: "100%",
    flexDirection: "row",
    gap: 4,
    paddingVertical: 1,
    alignItems: "baseline",
  },
  identityLabel: {
    fontSize: 9,
    color: ZINC_400,
    fontWeight: "medium",
  },
  identityValue: {
    fontSize: 9,
    color: ZINC_800,
    fontWeight: "semibold",
  },

  // ── Metrics ──
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: ZINC_50,
    borderWidth: 1,
    borderColor: ZINC_200,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 7,
    color: ZINC_500,
    fontWeight: "bold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "black",
    marginTop: 2,
  },
  metricBadge: {
    fontSize: 6,
    fontWeight: "bold",
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
    marginTop: 3,
  },
  metricBadgeGreen: {
    backgroundColor: `${EMERALD_600}15`,
    color: EMERALD_600,
  },
  metricBadgeMustard: {
    backgroundColor: `${MUSTARD}25`,
    color: "#A67800",
  },
  metricBadgeZinc: {
    backgroundColor: ZINC_200,
    color: ZINC_600,
  },
  metricBadgePurple: {
    backgroundColor: `${PURPLE_600}15`,
    color: PURPLE_600,
  },

  // ── Section Title ──
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: STRONG_BLUE,
    textTransform: "uppercase" as const,
    borderBottomWidth: 1,
    borderBottomColor: ZINC_200,
    paddingBottom: 4,
    marginBottom: 6,
  },

  // ── Bar Chart ──
  barChartCard: {
    borderWidth: 1,
    borderColor: ZINC_200,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  barLabel: {
    width: 72,
    fontSize: 8,
    color: ZINC_600,
    fontWeight: "medium",
    textAlign: "right" as const,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: ZINC_100,
    borderRadius: 5,
  },
  barFill: {
    height: 10,
    backgroundColor: STRONG_BLUE,
    borderRadius: 5,
  },
  barScore: {
    width: 22,
    fontSize: 8,
    fontWeight: "bold",
    color: STRONG_BLUE,
    textAlign: "right" as const,
  },

  // ── 2-Column Charts ──
  chart2Col: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  chartCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: ZINC_200,
    borderRadius: 8,
    padding: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: ZINC_200,
    paddingBottom: 4,
    marginBottom: 2,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 7.5,
    fontWeight: "bold",
    color: ZINC_500,
  },
  tableHeaderCellRight: {
    width: 30,
    fontSize: 7.5,
    fontWeight: "bold",
    color: ZINC_500,
    textAlign: "right" as const,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: ZINC_100,
  },
  tableRowCell: {
    flex: 1,
    fontSize: 8,
    color: ZINC_700,
  },
  tableRowCellScore: {
    width: 30,
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "right" as const,
  },
  distribItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  distribDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  distribLabel: {
    flex: 1,
    fontSize: 8,
    color: ZINC_600,
    fontWeight: "medium",
  },
  distribCount: {
    fontSize: 8,
    fontWeight: "bold",
    color: ZINC_800,
  },

  // ── Detail Section ──
  detailSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  detailCol: {
    flex: 1,
  },
  detailCol2: {
    flex: 2,
  },
  tableFull: {
    width: "100%",
  },
  thRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: ZINC_200,
    paddingVertical: 4,
  },
  thCellSm: {
    fontSize: 8,
    fontWeight: "bold",
    color: ZINC_500,
    textAlign: "left" as const,
  },
  thCellRight: {
    fontSize: 8,
    fontWeight: "bold",
    color: ZINC_500,
    textAlign: "right" as const,
  },
  tdRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: ZINC_200,
    paddingVertical: 3,
  },
  tdCellSm: {
    fontSize: 8,
    color: ZINC_700,
    fontWeight: "medium",
  },
  tdCellRight: {
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "right" as const,
  },
  tdCellMapel: {
    fontSize: 8,
    color: ZINC_800,
    fontWeight: "medium",
    flex: 1,
  },
  tdCellKategori: {
    fontSize: 7,
    color: ZINC_400,
    fontWeight: "medium",
  },
  tdCellCenter: {
    fontSize: 7.5,
    color: ZINC_500,
    textAlign: "center" as const,
    width: 36,
  },
  tdCellWaktu: {
    fontSize: 7,
    color: ZINC_500,
    textAlign: "center" as const,
    width: 50,
  },
  tdSkor: {
    fontSize: 8,
    fontWeight: "bold",
    color: STRONG_BLUE,
    textAlign: "right" as const,
    width: 22,
  },

  // ── Notes ──
  noteCard: {
    backgroundColor: ZINC_50,
    borderWidth: 1,
    borderColor: ZINC_200,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  noteTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: STRONG_BLUE,
    textTransform: "uppercase" as const,
    borderBottomWidth: 1,
    borderBottomColor: ZINC_200,
    paddingBottom: 4,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 9,
    color: ZINC_700,
    fontStyle: "italic",
    lineHeight: 1.6,
  },
  noteAuthor: {
    fontSize: 8,
    color: ZINC_500,
    fontWeight: "bold",
    textAlign: "right" as const,
    marginTop: 6,
  },

  // ── Signatures ──
  signaturesRow: {
    flexDirection: "row",
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: ZINC_200,
    marginBottom: 0,
  },
  signatureCol: {
    flex: 1,
    alignItems: "center",
    gap: 24,
  },
  signatureLabel: {
    fontSize: 9,
    color: ZINC_500,
    textAlign: "center" as const,
  },
  signatureRole: {
    fontSize: 9,
    color: ZINC_800,
    fontWeight: "bold",
    textAlign: "center" as const,
    marginTop: 2,
  },
  signatureLine: {
    width: "70%",
    borderBottomWidth: 1,
    borderBottomColor: ZINC_400,
    borderStyle: "dashed",
    paddingBottom: 3,
    alignSelf: "center" as const,
  },
  signatureName: {
    fontSize: 9,
    color: ZINC_600,
    fontWeight: "semibold",
    textAlign: "center" as const,
  },

  // ── Empty State ──
  emptyState: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 8,
    color: ZINC_500,
    fontStyle: "italic",
  },
});

// ── Helpers ──────────────────────────────────────────
const getScoreColor = (score: number): string => {
  if (score >= 80) return EMERALD_600;
  if (score >= 70) return "#2563eb";
  if (score >= 60) return AMBER_500;
  return RED_500;
};

const formatDate = (dateStr: string | null, jam: string | null): string => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
    ];
    const formatted = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    return jam ? `${formatted}, ${jam}` : formatted;
  } catch {
    return dateStr;
  }
};

// ── Sub-components ──────────────────────────────────

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

// ── Main Component ──────────────────────────────────

const RaporPDF: React.FC<RaporPDFProps> = ({
  student,
  grades,
  attendance,
  note,
  classes,
  avgGrade,
  attendancePercent,
  overallPredicate,
  chartItems,
  countA,
  countB,
  countC,
  countD,
}) => {
  const hasGrades = grades.length > 0;
  const studentClass = classes.find((c) => c.id === student.kelas_id);
  const className = studentClass?.nama_kelas || "N/A";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ═══ HEADER ═══ */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>SG</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>RAPOR HASIL BELAJAR SISWA</Text>
              <Text style={styles.headerSub}>SG Cabang Nusantara</Text>
            </View>
          </View>
          <View>
            <Text style={styles.headerRightLabel}>Semester</Text>
            <Text style={styles.headerRightValue}>
              {student.semester} {student.tahun_ajaran}
            </Text>
          </View>
        </View>

        {/* ═══ IDENTITY ═══ */}
        <View style={styles.identityRow}>
          {student.foto_url ? (
            <Image
              src={student.foto_url}
              style={styles.identityPhoto}
              cache
            />
          ) : (
            <View style={styles.identityPhotoPlaceholder}>
              <Text style={styles.identityPhotoPlaceholderText}>SG</Text>
            </View>
          )}
          <View style={styles.identityInfo}>
            <View style={styles.identityItem}>
              <Text style={styles.identityLabel}>Nama</Text>
              <Text style={styles.identityValue}>{student.nama_lengkap}</Text>
            </View>
            <View style={styles.identityItem}>
              <Text style={styles.identityLabel}>NIS</Text>
              <Text style={styles.identityValue}>{student.nis}</Text>
            </View>
            <View style={styles.identityItem}>
              <Text style={styles.identityLabel}>Kelas</Text>
              <Text style={styles.identityValue}>{className}</Text>
            </View>
            <View style={styles.identityItem}>
              <Text style={styles.identityLabel}>Semester</Text>
              <Text style={styles.identityValue}>
                {student.semester} {student.tahun_ajaran}
              </Text>
            </View>
            <View style={styles.identityItemFull}>
              <Text style={styles.identityLabel}>Asal Sekolah</Text>
              <Text style={styles.identityValue}>{student.asal_sekolah}</Text>
            </View>
          </View>
        </View>

        {/* ═══ METRICS ═══ */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Rata-Rata</Text>
            <Text style={[styles.metricValue, { color: STRONG_BLUE }]}>
              {avgGrade > 0 ? avgGrade.toFixed(2) : "0.00"}
            </Text>
            <Text
              style={[
                styles.metricBadge,
                avgGrade >= 80
                  ? styles.metricBadgeGreen
                  : styles.metricBadgeMustard,
              ]}
            >
              {overallPredicate.desc}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Kehadiran</Text>
            <Text style={[styles.metricValue, { color: EMERALD_600 }]}>
              {Math.round(attendancePercent)}%
            </Text>
            <Text style={[styles.metricBadge, styles.metricBadgeGreen]}>
              {attendancePercent >= 90
                ? "Sangat Baik"
                : attendancePercent >= 75
                  ? "Baik"
                  : "Kurang"}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Hadir</Text>
            <Text style={[styles.metricValue, { color: ZINC_800 }]}>
              {attendance?.hadir || 0}
            </Text>
            <Text style={[styles.metricBadge, styles.metricBadgeZinc]}>
              {attendance?.total_sesi || 0} Sesi
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Predikat</Text>
            <Text style={[styles.metricValue, { color: PURPLE_600 }]}>
              {overallPredicate.letter}
            </Text>
            <Text style={[styles.metricBadge, styles.metricBadgePurple]}>
              {overallPredicate.desc}
            </Text>
          </View>
        </View>

        {/* ═══ BAR CHART: NILAI SETIAP MAPEL ═══ */}
        <View style={styles.barChartCard}>
          <Text style={styles.sectionTitle}>NILAI SETIAP MAPEL</Text>
          {hasGrades ? (
            chartItems.map((item, i) => (
              <View key={i} style={styles.barRow}>
                <Text style={styles.barLabel}>{item.label}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.max(8, Math.min(100, item.score || 0))}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barScore}>{item.score}</Text>
              </View>
            ))
          ) : (
            <EmptyState text="Belum ada nilai" />
          )}
        </View>

        {/* ═══ 2-COLUMN CHARTS ═══ */}
        <View style={styles.chart2Col}>
          {/* Grafik Kemampuan */}
          <View style={styles.chartCol}>
            <Text style={styles.sectionTitle}>GRAFIK KEMAMPUAN</Text>
            {hasGrades ? (
              <View>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Mata Pelajaran</Text>
                  <Text style={styles.tableHeaderCellRight}>Nilai</Text>
                </View>
                {chartItems.map((item, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.tableRowCell}>{item.label}</Text>
                    <Text
                      style={[
                        styles.tableRowCellScore,
                        { color: getScoreColor(item.score) },
                      ]}
                    >
                      {item.score}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState text="Belum ada nilai" />
            )}
          </View>

          {/* Distribusi Nilai */}
          <View style={styles.chartCol}>
            <Text style={styles.sectionTitle}>DISTRIBUSI NILAI</Text>
            {hasGrades ? (
              <View>
                {[
                  { label: "A (80-100)", count: countA, color: EMERALD_600 },
                  { label: "B (70-79)", count: countB, color: "#2563eb" },
                  { label: "C (60-69)", count: countC, color: AMBER_500 },
                  { label: "D (<60)", count: countD, color: RED_500 },
                ].map((item) => (
                  <View key={item.label} style={styles.distribItem}>
                    <View
                      style={[styles.distribDot, { backgroundColor: item.color }]}
                    />
                    <Text style={styles.distribLabel}>{item.label}</Text>
                    <Text style={styles.distribCount}>{item.count} Mapel</Text>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState text="Belum ada nilai" />
            )}
          </View>
        </View>

        {/* ═══ DETAIL TABLES ═══ */}
        <View style={styles.detailSection}>
          {/* Kehadiran */}
          <View style={styles.detailCol}>
            <Text style={styles.sectionTitle}>KEHADIRAN</Text>
            {attendance ? (
              <View style={styles.tableFull}>
                <View style={styles.thRow}>
                  <Text style={[styles.thCellSm, { flex: 1 }]}>
                    Keterangan
                  </Text>
                  <Text style={[styles.thCellRight, { width: 50 }]}>
                    Jumlah
                  </Text>
                </View>
                {[
                  { label: "Hadir", value: attendance.hadir },
                  { label: "Sakit", value: attendance.sakit },
                  { label: "Izin", value: attendance.izin },
                  { label: "Alpa", value: attendance.alpha },
                ].map((row) => (
                  <View key={row.label} style={styles.tdRow}>
                    <Text style={[styles.tdCellSm, { flex: 1 }]}>
                      {row.label}
                    </Text>
                    <Text style={[styles.tdCellRight, { width: 50 }]}>
                      {row.value} Sesi
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState text="Tidak ada data" />
            )}
          </View>

          {/* Detail Nilai */}
          <View style={styles.detailCol2}>
            <Text style={styles.sectionTitle}>DETAIL NILAI</Text>
            {hasGrades ? (
              <View style={styles.tableFull}>
                <View style={styles.thRow}>
                  <Text style={{ flex: 1, fontSize: 8, fontWeight: "bold", color: ZINC_500 }}>
                    Mata Pelajaran
                  </Text>
                  <Text style={{ width: 36, fontSize: 8, fontWeight: "bold", color: ZINC_500, textAlign: "center" }}>
                    Tentor
                  </Text>
                  <Text style={{ width: 55, fontSize: 8, fontWeight: "bold", color: ZINC_500, textAlign: "center" }}>
                    Waktu
                  </Text>
                  <Text style={{ width: 22, fontSize: 8, fontWeight: "bold", color: ZINC_500, textAlign: "right" }}>
                    Skor
                  </Text>
                </View>
                {grades.map((g) => (
                  <View key={g.id} style={styles.tdRow}>
                    <Text style={styles.tdCellMapel}>
                      {g.nama_mapel}{" "}
                      <Text style={styles.tdCellKategori}>({g.kategori})</Text>
                    </Text>
                    <Text style={styles.tdCellCenter}>
                      {g.kode_tentor || "-"}
                    </Text>
                    <Text style={styles.tdCellWaktu}>
                      {formatDate(g.tanggal_pembelajaran, g.jam)}
                    </Text>
                    <Text style={styles.tdSkor}>{g.skor}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState text="Belum ada nilai terinput" />
            )}
          </View>
        </View>

        {/* ═══ CATATAN GURU ═══ */}
        {note ? (
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>CATATAN WALI KELAS</Text>
            <Text style={styles.noteText}>&ldquo;{note.catatan}&rdquo;</Text>
            <Text style={styles.noteAuthor}>Nama Guru: {note.nama_guru}</Text>
          </View>
        ) : null}

        {/* ═══ SIGNATURES ═══ */}
        <View style={styles.signaturesRow}>
          <View style={styles.signatureCol}>
            <View>
              <Text style={styles.signatureLabel}>Dibuat Oleh,</Text>
              <Text style={styles.signatureRole}>Staf Akademik</Text>
            </View>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureName}>
                {note?.nama_guru || "Prof. Dr. Dora The Explorer"}
              </Text>
            </View>
          </View>
          <View style={styles.signatureCol}>
            <View>
              <Text style={styles.signatureLabel}>Mengetahui,</Text>
              <Text style={styles.signatureRole}>Pimpinan Cabang</Text>
            </View>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureName}>Dr. Boots M.Pd</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default RaporPDF;
