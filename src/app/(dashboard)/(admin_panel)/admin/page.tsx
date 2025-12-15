'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, Banknote, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

// Tipe untuk data 4 kartu di atas
interface DashboardStatCards {
  barang_minggu_ini: number;
  uang_minggu_ini: number;
  jumlah_disetujui: number;
  total_karyawan: number;
}

// Tipe untuk data chart mingguan
interface WeeklyChartData {
  name: string; // 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'
  barang: number;
  uang: number;
}

// Tipe untuk data transaksi terbaru
interface RecentTransaction {
  id: string;
  full_name: string;
  tipe_pengajuan: string;
  total_estimasi_biaya: number;
  status: string;
}

// Helper function untuk format currency
const formatCurrency = (value: number | null | undefined): string => {
  if (!value && value !== 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Komponen Kartu Statistik (didesain ulang)
const StatCard = ({ title, value, percentage, icon }: {
  title: string;
  value: string;
  percentage: string;
  icon: React.ReactNode;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <div className="flex justify-between items-start">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {percentage.startsWith('-') ? (
          <TrendingDown className="h-3 w-3 text-red-500" />
        ) : (
          <TrendingUp className="h-3 w-3 text-emerald-500" />
        )}
        {percentage}
      </p>
    </CardContent>
  </Card>
);

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [statCards, setStatCards] = useState<DashboardStatCards | null>(null);
  const [chartData, setChartData] = useState<WeeklyChartData[]>([]);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      
      // Kita panggil 3 fungsi RPC secara bersamaan
      const [statsRes, chartRes] = await Promise.all([
        supabase.rpc('get_dashboard_stat_cards'),
        supabase.rpc('get_dashboard_overview_chart'),
      ]);

      // 1. Set data Stat Cards
      if (statsRes.error) {
        toast.error("Gagal mengambil data kartu", { description: statsRes.error.message });
      } else {
        setStatCards(statsRes.data[0]); // Ambil baris pertama
      }
      
      // 2. Set data Chart
      if (chartRes.error) {
        toast.error("Gagal mengambil data chart", { description: chartRes.error.message });
      } else {
        setChartData(chartRes.data);
      }
      setIsLoading(false);
    };
    
    fetchAllData();
  }, [supabase]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center p-10">Memuat data dashboard...</div>
      </div>
    );
  }

  return (
    // Kita gunakan padding `p-6` atau `p-8` seperti di desain
    <div className="p-6 md:p-8 space-y-6">
      
      {/* Grid untuk 4 Kartu Statistik */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Pengajuan Barang Minggu Ini"
          value={statCards?.barang_minggu_ini?.toString() ?? '0'}
          percentage="+20% vs mgg lalu" // Ganti dengan data % jika ada
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard 
          title="Pengajuan Uang Minggu Ini"
          value={statCards?.uang_minggu_ini?.toString() ?? '0'}
          percentage="+5% vs mgg lalu"
          icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard 
          title="Total Uang Diajukan"
          value={formatCurrency(statCards?.jumlah_disetujui)}
          percentage="Total pengajuan minggu ini"
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
        />
         <StatCard 
          title="Total Karyawan"
          value={statCards?.total_karyawan?.toString() ?? '0'}
          percentage="Jumlah user terdaftar"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </div>
      
      {/* Grid untuk Chart & Transaksi */}
        <div className="grid gap-4 lg:grid-cols-2">
        
        {/* Kolom Kiri: Overview Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overview Mingguan</CardTitle>
            <CardDescription>Grafik pengajuan barang dan uang untuk 4 minggu terakhir.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} 
                />
                <Legend />
                <Bar dataKey="barang" name="Barang" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="uang" name="Uang" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}