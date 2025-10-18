'use client';

import { useState } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { toast } from "sonner";
import { addDays, startOfMonth } from 'date-fns';

import ReportFilter from '@/components/reports/ReportFilter';
import ReportSummary from '@/components/reports/ReportSummary';
import ReportTable from '@/components/reports/ReportTable';
import ExportButtons from '@/components/reports/ExportButtons';
import { Card, CardContent } from '@/components/ui/card';

// Definisikan tipe data untuk hasil laporan
export interface ReportDetail {
    id: number;
    tipe: 'barang' | 'uang';
    judul: string;
    pengaju: string;
    kategori: string | null;
    nominal: number;
    status: string;
    tanggal: string;
}
export interface ReportSummaryData {
    total_requests: number;
    total_nominal_uang: number;
    total_item_barang: number;
}
interface ReportData {
    summary: ReportSummaryData;
    details: ReportDetail[];
}

export default function ReportsPage() {
    const supabase = createClient();
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({
        dateRange: { from: startOfMonth(new Date()), to: new Date() },
        tipe: 'semua',
    });

    const handleGenerateReport = async () => {
        setIsLoading(true);
        setReportData(null);

        const { data, error } = await supabase.rpc('get_filtered_report_data', {
            start_date: filters.dateRange.from.toISOString().split('T')[0],
            end_date: filters.dateRange.to.toISOString().split('T')[0],
            tipe_pengajuan: filters.tipe,
        });

        if (error) {
            toast.error("Gagal Membuat Laporan", { description: error.message });
        } else {
            setReportData(data);
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Laporan Pengajuan</h1>

            <Card>
                <CardContent className="pt-6">
                    <ReportFilter filters={filters} setFilters={setFilters} onGenerate={handleGenerateReport} isLoading={isLoading} />
                </CardContent>
            </Card>

            {isLoading && <p className="text-center">Membuat laporan...</p>}

            {reportData && (
                <div className="space-y-6">
                    <ReportSummary summary={reportData.summary} />
                    <div className="flex justify-end">
                        <ExportButtons reportData={reportData} filters={filters} />
                    </div>
                    <ReportTable details={reportData.details} />
                </div>
            )}
        </div>
    );
}