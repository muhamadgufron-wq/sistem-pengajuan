"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { alert } from "@/lib/utils/sweetalert";
import { startOfMonth } from "date-fns";

import ReportFilter from "@/components/reports/ReportFilter";
import ReportSummary from "@/components/reports/ReportSummary";
import ReportTable from "@/components/reports/ReportTable";
import ExportButtons from "@/components/reports/ExportButtons";
import { Card, CardContent } from "@/components/ui/card";

// Definisikan tipe data untuk hasil laporan
export interface ReportDetail {
  id: number;
  tipe: "barang" | "uang";
  judul: string;
  pengaju: string;
  kategori: string | null;
  nominal: number;
  nominal_disetujui?: number;
  nominal_pengajuan?: number;
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
    tipe: "semua",
  });

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReportData(null);

    try {
      // Use toLocaleDateString with 'en-CA' locale to get YYYY-MM-DD format in local timezone
      // This prevents timezone conversion issues where toISOString() would shift dates to UTC
      const startDate = filters.dateRange.from.toLocaleDateString('en-CA');
      const endDate = filters.dateRange.to.toLocaleDateString('en-CA');

      const barangQuery = supabase
        .from("pengajuan_barang")
        .select(
          "id, nama_barang, jumlah, jumlah_disetujui, status, created_at, user_id, kategori"
        )
        .gte("created_at", `${startDate} 00:00:00`)
        .lte("created_at", `${endDate} 23:59:59`);

      const uangQuery = supabase
        .from("pengajuan_uang")
        .select(
          "id, keperluan, jumlah_uang, jumlah_disetujui, status, created_at, user_id, kategori"
        )
        .gte("created_at", `${startDate} 00:00:00`)
        .lte("created_at", `${endDate} 23:59:59`);

      const reimbursementQuery = supabase
        .from("pengajuan_reimbursement")
        .select(
          "id, keperluan, jumlah_uang, jumlah_disetujui, status, created_at, user_id, kategori"
        )
        .gte("created_at", `${startDate} 00:00:00`)
        .lte("created_at", `${endDate} 23:59:59`);

      const [barangResult, uangResult, reimbursementResult] = await Promise.all([
        filters.tipe === "semua" || filters.tipe === "barang"
          ? barangQuery
          : Promise.resolve({ data: [], error: null }),
        filters.tipe === "semua" || filters.tipe === "uang"
          ? uangQuery
          : Promise.resolve({ data: [], error: null }),
        filters.tipe === "semua"
          ? reimbursementQuery
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (barangResult.error) throw barangResult.error;
      if (uangResult.error) throw uangResult.error;
      if (reimbursementResult.error) throw reimbursementResult.error;

      const barangData = barangResult.data || [];
      const uangData = uangResult.data || [];
      const reimbursementData = reimbursementResult.data || [];

      // Collect all user IDs
      const userIds = new Set<string>();
      barangData.forEach((item) => {
        if (item.user_id) userIds.add(item.user_id);
      });
      uangData.forEach((item) => {
        if (item.user_id) userIds.add(item.user_id);
      });
      reimbursementData.forEach((item) => {
        if (item.user_id) userIds.add(item.user_id);
      });

      // Fetch profiles manually
      const profilesMap = new Map<string, string>();
      if (userIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", Array.from(userIds));

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
        } else {
          profiles?.forEach((p) => profilesMap.set(p.id, p.full_name));
        }
      }

      const details: ReportDetail[] = [];

      // Process Barang
      barangData.forEach((item) => {
        const isApproved = item.status.toLowerCase() === "disetujui";
        // If approved, use jumlah_disetujui if available, otherwise jumlah
        // If not approved, use jumlah (requested)
        const nominal = isApproved
          ? item.jumlah_disetujui ?? item.jumlah
          : item.jumlah;

        details.push({
          id: item.id,
          tipe: "barang",
          judul: item.nama_barang,
          pengaju: profilesMap.get(item.user_id) || "Unknown",
          kategori: item.kategori,
          nominal: nominal,
          nominal_disetujui: item.jumlah_disetujui,
          nominal_pengajuan: item.jumlah,
          status: item.status,
          tanggal: item.created_at,
        });
      });

      // Process Uang
      uangData.forEach((item) => {
        const isApproved = item.status.toLowerCase() === "disetujui";
        // If approved, use jumlah_disetujui if available, otherwise jumlah_uang
        // If not approved, use jumlah_uang (requested)
        const nominal = isApproved
          ? item.jumlah_disetujui ?? item.jumlah_uang
          : item.jumlah_uang;

        details.push({
          id: item.id,
          tipe: "uang",
          judul: item.keperluan,
          pengaju: profilesMap.get(item.user_id) || "Unknown",
          kategori: item.kategori,
          nominal: nominal,
          nominal_disetujui: item.jumlah_disetujui,
          nominal_pengajuan: item.jumlah_uang,
          status: item.status,
          tanggal: item.created_at,
        });
      });

      // Process Reimbursement (treat as Uang with kategori from database)
      reimbursementData.forEach((item) => {
        const isApproved = item.status.toLowerCase() === "disetujui";
        const nominal = isApproved
          ? item.jumlah_disetujui ?? item.jumlah_uang
          : item.jumlah_uang;

        details.push({
          id: item.id,
          tipe: "uang", // Treat as uang for Excel export
          judul: item.keperluan, // No prefix
          pengaju: profilesMap.get(item.user_id) || "Unknown",
          kategori: item.kategori, // Use kategori from database (can be null)
          nominal: nominal,
          nominal_disetujui: item.jumlah_disetujui,
          nominal_pengajuan: item.jumlah_uang,
          status: item.status,
          tanggal: item.created_at,
        });
      });

      // Sort by date descending
      details.sort(
        (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
      );

      // Calculate Summary
      const total_requests = details.length;
      const total_item_barang = details
        .filter(
          (d) => d.tipe === "barang" && d.status.toLowerCase() === "disetujui"
        )
        .reduce((acc, curr) => acc + curr.nominal, 0);

      const total_nominal_uang = details
        .filter(
          (d) => d.tipe === "uang" && d.status.toLowerCase() === "disetujui"
        )
        .reduce((acc, curr) => acc + curr.nominal, 0);

      setReportData({
        summary: {
          total_requests,
          total_nominal_uang,
          total_item_barang,
        },
        details,
      });
    } catch (error: any) {
      alert.error("Gagal Membuat Laporan", error.message );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan Pengajuan</h1>

      <Card>
        <CardContent className="pt-6">
          <ReportFilter
            filters={filters}
            setFilters={setFilters}
            onGenerate={handleGenerateReport}
            isLoading={isLoading}
          />
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
