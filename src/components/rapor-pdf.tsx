"use client";

import React from "react";
import type { StyleSheet } from "@react-pdf/renderer";
import type { ComponentType } from "react";

// ── Types ──
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

// ── Colors ──
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
const EMERALD_600 = "#059669";
const PURPLE_600 = "#9333ea";
const RED_500 = "#ef4444";
const AMBER_500 = "#f59e0b";

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

// ── Factory: terima @react-pdf/renderer modules sebagai parameter ──
// (menghindari static import yang gagal di Vercel build)
export function createRaporPDF(modules: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Document: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Page: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  View: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Text: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Image: ComponentType<any>;
  StyleSheet: typeof StyleSheet;
}, props: RaporPDFProps) {
  const { Document, Page, View, Text, Image, StyleSheet } = modules;
  const { student, grades, attendance, note, classes, avgGrade, attendancePercent, overallPredicate, chartItems, countA, countB, countC, countD } = props;

  const styles = StyleSheet.create({
    page: {
      padding: 36,
      fontFamily: "Helvetica",
      fontSize: 10,
      color: ZINC_800,
      lineHeight: 1.4,
    },
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
    signaturesRow: {
      flexDirection: "row",
      gap: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: ZINC_200,
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

  const hasGrades = grades.length > 0;
  const studentClass = classes.find((c: RaporPDFClass) => c.id === student.kelas_id);
  const className = studentClass?.nama_kelas || "N/A";

  const DistribItems = [
    { label: "A (80-100)", count: countA, color: EMERALD_600 },
    { label: "B (70-79)", count: countB, color: "#2563eb" },
    { label: "C (60-69)", count: countC, color: AMBER_500 },
    { label: "D (<60)", count: countD, color: RED_500 },
  ];

  const AttendanceRows = [
    { label: "Hadir", value: attendance?.hadir || 0 },
    { label: "Sakit", value: attendance?.sakit || 0 },
    { label: "Izin", value: attendance?.izin || 0 },
    { label: "Alpa", value: attendance?.alpha || 0 },
  ];

  return React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: styles.page },
      // ═══ HEADER ═══
      React.createElement(View, { style: styles.headerRow },
        React.createElement(View, { style: styles.headerLeft },
          React.createElement(View, { style: styles.logoBox },
            React.createElement(Text, { style: styles.logoText }, "SG")
          ),
          React.createElement(View, null,
            React.createElement(Text, { style: styles.headerTitle }, "RAPOR HASIL BELAJAR SISWA"),
            React.createElement(Text, { style: styles.headerSub }, "SG Cabang Nusantara"),
          ),
        ),
        React.createElement(View, null,
          React.createElement(Text, { style: styles.headerRightLabel }, "Semester"),
          React.createElement(Text, { style: styles.headerRightValue }, `${student.semester} ${student.tahun_ajaran}`),
        ),
      ),

      // ═══ IDENTITY ═══
      React.createElement(View, { style: styles.identityRow },
        student.foto_url
          ? React.createElement(Image, { src: student.foto_url, style: styles.identityPhoto, cache: true })
          : React.createElement(View, { style: styles.identityPhotoPlaceholder },
              React.createElement(Text, { style: styles.identityPhotoPlaceholderText }, "SG"),
            ),
        React.createElement(View, { style: styles.identityInfo },
          React.createElement(View, { style: styles.identityItem },
            React.createElement(Text, { style: styles.identityLabel }, "Nama"),
            React.createElement(Text, { style: styles.identityValue }, student.nama_lengkap),
          ),
          React.createElement(View, { style: styles.identityItem },
            React.createElement(Text, { style: styles.identityLabel }, "NIS"),
            React.createElement(Text, { style: styles.identityValue }, student.nis),
          ),
          React.createElement(View, { style: styles.identityItem },
            React.createElement(Text, { style: styles.identityLabel }, "Kelas"),
            React.createElement(Text, { style: styles.identityValue }, className),
          ),
          React.createElement(View, { style: styles.identityItem },
            React.createElement(Text, { style: styles.identityLabel }, "Semester"),
            React.createElement(Text, { style: styles.identityValue }, `${student.semester} ${student.tahun_ajaran}`),
          ),
          React.createElement(View, { style: styles.identityItemFull },
            React.createElement(Text, { style: styles.identityLabel }, "Asal Sekolah"),
            React.createElement(Text, { style: styles.identityValue }, student.asal_sekolah),
          ),
        ),
      ),

      // ═══ METRICS ═══
      React.createElement(View, { style: styles.metricsRow },
        ...[
          { label: "Rata-Rata", value: avgGrade > 0 ? avgGrade.toFixed(2) : "0.00", color: STRONG_BLUE, badge: overallPredicate.desc, badgeStyle: avgGrade >= 80 ? styles.metricBadgeGreen : styles.metricBadgeMustard },
          { label: "Kehadiran", value: `${Math.round(attendancePercent)}%`, color: EMERALD_600, badge: attendancePercent >= 90 ? "Sangat Baik" : attendancePercent >= 75 ? "Baik" : "Kurang", badgeStyle: styles.metricBadgeGreen },
          { label: "Total Hadir", value: `${attendance?.hadir || 0}`, color: ZINC_800, badge: `${attendance?.total_sesi || 0} Sesi`, badgeStyle: styles.metricBadgeZinc },
          { label: "Predikat", value: overallPredicate.letter, color: PURPLE_600, badge: overallPredicate.desc, badgeStyle: styles.metricBadgePurple },
        ].map(m =>
          React.createElement(View, { key: m.label, style: styles.metricCard },
            React.createElement(Text, { style: styles.metricLabel }, m.label),
            React.createElement(Text, { style: [styles.metricValue, { color: m.color }] }, String(m.value)),
            React.createElement(Text, { style: [styles.metricBadge, m.badgeStyle] }, m.badge),
          )
        ),
      ),

      // ═══ BAR CHART ═══
      React.createElement(View, { style: styles.barChartCard },
        React.createElement(Text, { style: styles.sectionTitle }, "NILAI SETIAP MAPEL"),
        ...(hasGrades
          ? chartItems.map((item, i) =>
              React.createElement(View, { key: i, style: styles.barRow },
                React.createElement(Text, { style: styles.barLabel }, item.label),
                React.createElement(View, { style: styles.barTrack },
                  React.createElement(View, { style: [styles.barFill, { width: `${Math.max(8, Math.min(100, item.score || 0))}%` }] })
                ),
                React.createElement(Text, { style: styles.barScore }, String(item.score)),
              )
            )
          : [React.createElement(View, { key: "empty", style: styles.emptyState },
              React.createElement(Text, { style: styles.emptyText }, "Belum ada nilai"),
            )]
        ),
      ),

      // ═══ 2-COLUMN CHARTS ═══
      React.createElement(View, { style: styles.chart2Col },
        // Grafik Kemampuan
        React.createElement(View, { style: styles.chartCol },
          React.createElement(Text, { style: styles.sectionTitle }, "GRAFIK KEMAMPUAN"),
          ...(hasGrades
            ? [
                React.createElement(View, { key: "h", style: styles.tableHeader },
                  React.createElement(Text, { style: styles.tableHeaderCell }, "Mata Pelajaran"),
                  React.createElement(Text, { style: styles.tableHeaderCellRight }, "Nilai"),
                ),
                ...chartItems.map((item, i) =>
                  React.createElement(View, { key: i, style: styles.tableRow },
                    React.createElement(Text, { style: styles.tableRowCell }, item.label),
                    React.createElement(Text, { style: [styles.tableRowCellScore, { color: getScoreColor(item.score) }] }, String(item.score)),
                  )
                ),
              ]
            : [React.createElement(View, { key: "empty", style: styles.emptyState },
                React.createElement(Text, { style: styles.emptyText }, "Belum ada nilai"),
              )]
          ),
        ),
        // Distribusi
        React.createElement(View, { style: styles.chartCol },
          React.createElement(Text, { style: styles.sectionTitle }, "DISTRIBUSI NILAI"),
          ...(hasGrades
            ? DistribItems.map((item) =>
                React.createElement(View, { key: item.label, style: styles.distribItem },
                  React.createElement(View, { style: [styles.distribDot, { backgroundColor: item.color }] }),
                  React.createElement(Text, { style: styles.distribLabel }, item.label),
                  React.createElement(Text, { style: styles.distribCount }, `${item.count} Mapel`),
                )
              )
            : [React.createElement(View, { key: "empty", style: styles.emptyState },
                React.createElement(Text, { style: styles.emptyText }, "Belum ada nilai"),
              )]
          ),
        ),
      ),

      // ═══ DETAIL ═══
      React.createElement(View, { style: styles.detailSection },
        // Kehadiran
        React.createElement(View, { style: styles.detailCol },
          React.createElement(Text, { style: styles.sectionTitle }, "KEHADIRAN"),
          ...(attendance
            ? [
                React.createElement(View, { key: "h", style: styles.thRow },
                  React.createElement(Text, { style: [styles.thCellSm, { flex: 1 }] }, "Keterangan"),
                  React.createElement(Text, { style: [styles.thCellRight, { width: 50 }] }, "Jumlah"),
                ),
                ...AttendanceRows.map((row) =>
                  React.createElement(View, { key: row.label, style: styles.tdRow },
                    React.createElement(Text, { style: [styles.tdCellSm, { flex: 1 }] }, row.label),
                    React.createElement(Text, { style: [styles.tdCellRight, { width: 50 }] }, `${row.value} Sesi`),
                  )
                ),
              ]
            : [React.createElement(View, { key: "empty", style: styles.emptyState },
                React.createElement(Text, { style: styles.emptyText }, "Tidak ada data"),
              )]
          ),
        ),
        // Detail Nilai
        React.createElement(View, { style: styles.detailCol2 },
          React.createElement(Text, { style: styles.sectionTitle }, "DETAIL NILAI"),
          ...(hasGrades
            ? [
                React.createElement(View, { key: "h", style: styles.thRow },
                  React.createElement(Text, { style: { flex: 1, fontSize: 8, fontWeight: "bold", color: ZINC_500 } }, "Mata Pelajaran"),
                  React.createElement(Text, { style: { width: 36, fontSize: 8, fontWeight: "bold", color: ZINC_500, textAlign: "center" as const } }, "Tentor"),
                  React.createElement(Text, { style: { width: 55, fontSize: 8, fontWeight: "bold", color: ZINC_500, textAlign: "center" as const } }, "Waktu"),
                  React.createElement(Text, { style: { width: 22, fontSize: 8, fontWeight: "bold", color: ZINC_500, textAlign: "right" as const } }, "Skor"),
                ),
                ...grades.map((g) =>
                  React.createElement(View, { key: g.id, style: styles.tdRow },
                    React.createElement(Text, { style: styles.tdCellMapel },
                      g.nama_mapel,
                      React.createElement(Text, { style: styles.tdCellKategori }, ` (${g.kategori})`),
                    ),
                    React.createElement(Text, { style: styles.tdCellCenter }, g.kode_tentor || "-"),
                    React.createElement(Text, { style: styles.tdCellWaktu }, formatDate(g.tanggal_pembelajaran, g.jam)),
                    React.createElement(Text, { style: styles.tdSkor }, String(g.skor)),
                  )
                ),
              ]
            : [React.createElement(View, { key: "empty", style: styles.emptyState },
                React.createElement(Text, { style: styles.emptyText }, "Belum ada nilai terinput"),
              )]
          ),
        ),
      ),

      // ═══ CATATAN ═══
      ...(note
        ? [React.createElement(View, { key: "note", style: styles.noteCard },
            React.createElement(Text, { style: styles.noteTitle }, "CATATAN WALI KELAS"),
            React.createElement(Text, { style: styles.noteText }, `\u201c${note.catatan}\u201d`),
            React.createElement(Text, { style: styles.noteAuthor }, `Nama Guru: ${note.nama_guru}`),
          )]
        : []
      ),

      // ═══ SIGNATURES ═══
      React.createElement(View, { style: styles.signaturesRow },
        React.createElement(View, { style: styles.signatureCol },
          React.createElement(View, null,
            React.createElement(Text, { style: styles.signatureLabel }, "Dibuat Oleh,"),
            React.createElement(Text, { style: styles.signatureRole }, "Staf Akademik"),
          ),
          React.createElement(View, { style: styles.signatureLine },
            React.createElement(Text, { style: styles.signatureName }, note?.nama_guru || "Prof. Dr. Dora The Explorer"),
          ),
        ),
        React.createElement(View, { style: styles.signatureCol },
          React.createElement(View, null,
            React.createElement(Text, { style: styles.signatureLabel }, "Mengetahui,"),
            React.createElement(Text, { style: styles.signatureRole }, "Pimpinan Cabang"),
          ),
          React.createElement(View, { style: styles.signatureLine },
            React.createElement(Text, { style: styles.signatureName }, "Dr. Boots M.Pd"),
          ),
        ),
      ),
    ),
  );
}
