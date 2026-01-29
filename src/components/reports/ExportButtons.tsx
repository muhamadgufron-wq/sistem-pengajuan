"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { ReportDetail, ReportSummaryData } from "@/app/(dashboard)/(admin_panel)/reports/page";
import { alert } from "@/lib/utils/sweetalert";

interface ExportProps {
    reportData: { summary: ReportSummaryData; details: ReportDetail[]; };
    filters: { dateRange: { from?: Date; to?: Date; }; tipe: string; };
}

export default function ExportButtons({ reportData, filters }: ExportProps) {
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [isExcelLoading, setIsExcelLoading] = useState(false);
    const fileName = `laporan-pengajuan-${new Date().toISOString().split('T')[0]}`;

    const handleExportPDF = async () => {
        setIsPdfLoading(true);
        try {
            const jsPDF = (await import("jspdf")).default;
            const autoTable = (await import("jspdf-autotable")).default;

            const doc = new jsPDF();
            doc.text("Laporan Pengajuan", 14, 22);
            
            const tableColumn = ["ID", "Tipe", "Judul", "Pengaju", "Kategori", "Nominal/Jumlah", "Status", "Tanggal"];
            const tableRows: (string | number)[][] = [];

            reportData.details.forEach(item => {
                const itemData = [
                    item.id,
                    item.tipe,
                    item.judul,
                    item.pengaju,
                    item.kategori || '-',
                    item.tipe === 'uang' ? `Rp ${item.nominal.toLocaleString('id-ID')}` : item.nominal,
                    item.status,
                    new Date(item.tanggal).toLocaleDateString('id-ID'),
                ];
                tableRows.push(itemData);
            });

            autoTable(doc, { head: [tableColumn], body: tableRows, startY: 30 });
            doc.save(`${fileName}.pdf`);
            alert.success("Laporan PDF Tersimpan", "Laporan PDF berhasil diunduh");
        } catch (error) {
            console.error("Gagal export PDF:", error);
            alert.error("Export Gagal", "Gagal mengunduh laporan PDF");
        } finally {
            setIsPdfLoading(false);
        }
    };

    const handleExportExcel = async () => {
        setIsExcelLoading(true);
        try {
            const ExcelJS = (await import("exceljs")).default;
            const { saveAs } = await import("file-saver");

            const workbook = new ExcelJS.Workbook();
            
            // Load template
            const worksheet = await (async () => {
                try {
                    const response = await fetch('/template_laporan.xlsx');
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        await workbook.xlsx.load(arrayBuffer);
                        const ws = workbook.getWorksheet('Laporan Pengajuan');
                        if (ws) {
                            return ws;
                        }
                    }
                } catch (e) {
                    console.warn("Template tidak ditemukan:", e);
                }

                // Jika template tidak ada, buat file sederhana
                const ws = workbook.addWorksheet('Laporan Pengajuan');
                ws.columns = [
                    { header: 'No', key: 'no', width: 5 },
                    { header: 'Tipe', key: 'tipe', width: 10 },
                    { header: 'Judul / Keperluan', key: 'judul', width: 30 },
                    { header: 'Pengaju', key: 'pengaju', width: 20 },
                    { header: 'Kategori', key: 'kategori', width: 15 },
                    { header: 'Nominal / Jumlah', key: 'nominal', width: 20 },
                    { header: 'Status', key: 'status', width: 15 },
                    { header: 'Tanggal', key: 'tanggal', width: 15 },
                ];
                ws.getRow(1).font = { bold: true };
                
                // Fill simple data
                reportData.details.forEach((item, index) => {
                    const row = ws.getRow(index + 2);
                    row.getCell(1).value = index + 1;
                    row.getCell(2).value = item.tipe;
                    row.getCell(3).value = item.judul;
                    row.getCell(4).value = item.pengaju;
                    row.getCell(5).value = item.kategori || '-';
                    row.getCell(6).value = item.nominal;
                    row.getCell(7).value = item.status;
                    row.getCell(8).value = new Date(item.tanggal);
                    row.getCell(6).numFmt = item.tipe === 'uang' ? '"Rp "#,##0' : '0';
                    row.getCell(8).numFmt = 'dd mmmm yyyy';
                });
                
                return ws;
            })();

            if (worksheet && worksheet.name === 'Laporan Pengajuan' && worksheet.rowCount >= 40) {
                // Template ditemukan - isi sesuai struktur template
                
                // 1. ISI HEADER INFO (Rows 3-5)
                const today = new Date();
                const monthYear = today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
                
                worksheet.getCell('B3').value = ': PT. Wedding Organizer'; // Bisa diganti sesuai kebutuhan
                worksheet.getCell('B4').value = `: ${reportData.summary.total_requests}`;
                worksheet.getCell('B5').value = `: ${monthYear}`;
                
                // 2. PISAHKAN DATA BERDASARKAN TIPE
                const dataUang = reportData.details.filter(d => d.tipe === 'uang');
                const dataBarang = reportData.details.filter(d => d.tipe === 'barang');
                
                // 3. ISI PERMINTAAN DANA (Rows 12-36)
                // Kategorisasi: VENDOR (A-C), KASBON (D-F), OPERASIONAL (G-I)
                const vendorData = dataUang.filter(d => d.kategori?.toLowerCase() === 'vendor');
                const kasbonData = dataUang.filter(d => d.kategori?.toLowerCase() === 'kasbon');
                const operasionalData = dataUang.filter(d => d.kategori?.toLowerCase() === 'operasional');
                
                let currentRow = 12;
                const maxDanaRows = 25; // Rows 12-36
                
                // Helper function to fill money data
                const fillMoneyData = (data: typeof dataUang, startCol: number) => {
                    let rowIndex = 12;
                    data.slice(0, maxDanaRows).forEach(item => {
                        const row = worksheet.getRow(rowIndex);
                        row.getCell(startCol).value = item.judul; // ITEM
                        row.getCell(startCol + 1).value = item.nominal; // NOMINAL
                        row.getCell(startCol + 1).numFmt = '"Rp "#,##0';
                        rowIndex++;
                    });
                };
                
                fillMoneyData(vendorData, 1); // Column A-B (VENDOR)
                fillMoneyData(kasbonData, 4); // Column D-E (KASBON)
                fillMoneyData(operasionalData, 7); // Column G-H (OPERASIONAL)
                
                // 4. ISI PERMINTAAN BARANG (Rows 42-56)
                // Kategorisasi: KANTOR (A-C), GUDANG (D-F), STUDIO (G-I)
                const kantorData = dataBarang.filter(d => d.kategori?.toLowerCase() === 'kantor');
                const gudangData = dataBarang.filter(d => d.kategori?.toLowerCase() === 'gudang');
                const studioData = dataBarang.filter(d => d.kategori?.toLowerCase() === 'studio');
                
                // Helper function to fill item data
                const fillItemData = (data: typeof dataBarang, startCol: number, startRow: number, maxRows: number) => {
                    let rowIndex = startRow;
                    data.slice(0, maxRows).forEach(item => {
                        const row = worksheet.getRow(rowIndex);
                        row.getCell(startCol).value = item.judul; // ITEM
                        row.getCell(startCol + 1).value = item.nominal; // JUMLAH
                        row.getCell(startCol + 1).numFmt = '0';
                        rowIndex++;
                    });
                };
                
                fillItemData(kantorData, 1, 42, 15); // Column A-B (KANTOR) rows 42-56
                fillItemData(gudangData, 4, 42, 15); // Column D-E (GUDANG) rows 42-56
                fillItemData(studioData, 7, 57, 19); // Column G-H (STUDIO) rows 57-75
                
                // Note: Formula di row 37 dan 76 sudah ada di template, akan auto-calculate
            }

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `${fileName}.xlsx`);
            alert.success("Laporan Excel Tersimpan", "Laporan Excel berhasil diunduh");

        } catch (error) {
            console.error("Gagal membuat file Excel:", error);
            alert.error("Export Gagal", "Gagal mengunduh laporan Excel");
        } finally {
            setIsExcelLoading(false);
        }
    };

    return (
        <div className="flex gap-4">
            <Button 
                className="bg-red-500 hover:bg-red-600" 
                onClick={handleExportPDF}
                disabled={isPdfLoading}
            >
                {isPdfLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                )}
                Export ke PDF
            </Button>
            <Button 
                className="bg-green-500 hover:bg-green-600"  
                onClick={handleExportExcel}
                disabled={isExcelLoading}
            >
                {isExcelLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                )}
                Export ke Excel
            </Button>
        </div>
    );
}