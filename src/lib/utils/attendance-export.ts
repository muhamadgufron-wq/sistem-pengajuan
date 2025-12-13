// Utility functions untuk export attendance data ke PDF

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Type definitions
interface AttendanceExportData {
  full_name: string;
  tanggal: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_keterangan: string | null;
  status: string;
}

/**
 * Format time from ISO string to HH:MM
 */
function formatTime(isoString: string | null): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date from ISO string to DD/MM/YYYY
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Calculate work duration in hours and minutes
 */
function calculateDuration(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return '-';
  
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}j ${minutes}m`;
}

/**
 * Get status badge text
 */
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'hadir': 'Hadir',
    'izin': 'Izin',
    'sakit': 'Sakit',
    'alpha': 'Alpha',
    'cuti': 'Cuti'
  };
  return statusMap[status] || status;
}

/**
 * Export attendance data to PDF
 */
export function exportAttendanceToPDF(
  data: AttendanceExportData[],
  dateRange: string
): void {
  const doc = new jsPDF('landscape');

  // Add title
  doc.setFontSize(16);
  doc.text('Laporan Absensi Karyawan', 14, 15);
  
  doc.setFontSize(10);
  doc.text(`Periode: ${dateRange}`, 14, 22);
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 27);

  // Prepare table data
  const tableData = data.map((record, index) => [
    index + 1,
    record.full_name,
    formatDate(record.tanggal),
    formatTime(record.check_in_time),
    formatTime(record.check_out_time),
    calculateDuration(record.check_in_time, record.check_out_time),
    record.check_in_keterangan || '-',
    getStatusText(record.status),
  ]);

  // Add table
  autoTable(doc, {
    head: [['No', 'Nama', 'Tanggal', 'Check-in', 'Check-out', 'Durasi', 'Keterangan', 'Status']],
    body: tableData,
    startY: 32,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [68, 114, 196], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 40 },
      2: { cellWidth: 25 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 50 },
      7: { cellWidth: 20 },
    },
  });

  // Add footer with page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `Absensi_${dateRange.replace(/\s/g, '_')}_${timestamp}.pdf`;

  // Download file
  doc.save(filename);
}
