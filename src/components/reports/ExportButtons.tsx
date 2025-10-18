import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { ReportDetail, ReportSummaryData } from "@/app/(dashboard)/(admin_panel)/reports/page";

interface ExportProps {
    reportData: { summary: ReportSummaryData; details: ReportDetail[]; };
    filters: { dateRange: { from?: Date; to?: Date; }; tipe: string; };
}

export default function ExportButtons({ reportData, filters }: ExportProps) {
    const fileName = `laporan-pengajuan-${new Date().toISOString().split('T')[0]}`;

    const handleExportPDF = () => {
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
    };

    const handleExportExcel = async () => {
        try {
            // Mengambil template dari folder public
            const response = await fetch('/template_laporan.xlsx');
            const arrayBuffer = await response.arrayBuffer();

            const workbook = new ExcelJS.Workbook();
            await workbook.load(arrayBuffer);

            // --- KONFIGURASI TEMPLATE ANDA DI SINI ---
            const worksheet = workbook.getWorksheet('Laporan Pengajuan'); // Ganti dengan nama sheet Anda
            const startRow = 5; // Ganti dengan baris awal data Anda

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

                // Mengisi data ringkasan (jika ada di template)
                worksheet.getCell('B2').value = new Date(); // Contoh mengisi tanggal laporan
                worksheet.getCell('C2').value = reportData.summary.total_requests; // Contoh mengisi total pengajuan
            }

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `${fileName}.xlsx`);

        } catch (error) {
            console.error("Gagal membuat file Excel:", error);
        }
    };

    return (
        <div className="flex gap-4">
            <Button className="bg-red-500 hover:bg-red-600" onClick={handleExportPDF}>
                <FileDown className="mr-2 h-4 w-4" /> Export ke PDF
            </Button>
            <Button className="bg-green-500 hover:bg-green-600"  onClick={handleExportExcel}>
                <FileDown className="mr-2 h-4 w-4" /> Export ke Excel
            </Button>
        </div>
    );
}