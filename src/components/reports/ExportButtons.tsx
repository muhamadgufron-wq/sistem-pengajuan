"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { ReportDetail, ReportSummaryData } from "@/app/(dashboard)/(admin_panel)/reports/page";
import { toast } from "sonner";

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
            toast.success("Laporan PDF berhasil diunduh");
        } catch (error) {
            console.error("Gagal export PDF:", error);
            toast.error("Gagal mengunduh laporan PDF");
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
            
            // Menggunakan IIFE untuk inisialisasi worksheet dan startRow sebagai const
            const { worksheet, startRow } = await (async () => {
                try {
                    // Coba ambil template
                    const response = await fetch('/template_laporan.xlsx');
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        await workbook.xlsx.load(arrayBuffer);
                        const ws = workbook.getWorksheet('Laporan Pengajuan');
                        if (ws) {
                            return { worksheet: ws, startRow: 5 };
                        }
                    }
                } catch (e) {
                    console.warn("Template tidak ditemukan, membuat file baru...");
                }

                // Jika template tidak ada atau gagal load, buat baru
                const ws = workbook.addWorksheet('Laporan Pengajuan');

                // Setup Header
                ws.columns = [
                    { header: 'No', key: 'no', width: 5 },
                    { header: 'Judul / Keperluan', key: 'judul', width: 30 },
                    { header: 'Pengaju', key: 'pengaju', width: 20 },
                    { header: 'Kategori', key: 'kategori', width: 15 },
                    { header: 'Nominal / Jumlah', key: 'nominal', width: 20 },
                    { header: 'Status', key: 'status', width: 15 },
                    { header: 'Tanggal', key: 'tanggal', width: 15 },
                ];
                
                // Style header
                ws.getRow(1).font = { bold: true };
                
                return { worksheet: ws, startRow: 2 };
            })();

            if (worksheet) {
                 // Mengisi data detail
                reportData.details.forEach((item, index) => {
                    const row = worksheet.getRow(startRow + index);
                    row.getCell(1).value = index + 1; // No
                    row.getCell(2).value = item.judul; // Judul / Keperluan
                    row.getCell(3).value = item.pengaju; // Pengaju
                    row.getCell(4).value = item.kategori || '-'; // Kategori
                    row.getCell(5).value = item.nominal; // Nominal / Jumlah
                    row.getCell(6).value = item.status; // Status
                    row.getCell(7).value = new Date(item.tanggal); // Tanggal
                    
                    // Format cell jika perlu (misal: number, date)
                    row.getCell(5).numFmt = item.tipe === 'uang' ? '"Rp "#,##0' : '0';
                    row.getCell(7).numFmt = 'dd mmmm yyyy';
                });

                // Mengisi data ringkasan (jika ada di template dan bukan file baru)
                if (startRow === 5) {
                    worksheet.getCell('B2').value = new Date(); 
                    worksheet.getCell('C2').value = reportData.summary.total_requests; 
                }
            }

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `${fileName}.xlsx`);
            toast.success("Laporan Excel berhasil diunduh");

        } catch (error) {
            console.error("Gagal membuat file Excel:", error);
            toast.error("Gagal mengunduh laporan Excel");
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