'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { toast } from "sonner";
import { Users, Package, Banknote, Wallet, Settings } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [submissionOpen, setSubmissionOpen] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  
  const [statCards, setStatCards] = useState<DashboardStatCards | null>(null);
  const [chartData, setChartData] = useState<WeeklyChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch user data
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single();
            setUserName(profile?.full_name || 'Admin');
            setUserRole(profile?.role || 'Administrator');
        }

        // Fetch settings status
        const settingsRes = await fetch('/api/settings/submission-status');
        const settingsData = await settingsRes.json();
        if (settingsData.success) {
            setSubmissionOpen(settingsData.isOpen);
        }

        // Fetch dashboard data
        const [statsRes, chartRes, employeeCountRes] = await Promise.all([
            supabase.rpc('get_dashboard_stat_cards'),
            supabase.rpc('get_dashboard_overview_chart'),
            supabase.from('user_profiles_with_email')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'karyawan')
        ]);

        if (statsRes.error) throw statsRes.error;
        const statsWithEmployeeCount = {
            ...statsRes.data[0],
            total_karyawan: employeeCountRes.count ?? 0
        };
        setStatCards(statsWithEmployeeCount);
        
        if (chartRes.error) throw chartRes.error;
        setChartData(chartRes.data);

      } catch (e) {
        console.error("Failed to fetch data", e);
        toast.error("Gagal memuat data dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllData();
  }, [supabase]);

  const handleToggleSubmission = async (checked: boolean) => {
    setIsToggling(true);
    try {
        const res = await fetch('/api/settings/submission-status', {
            method: 'POST',
            body: JSON.stringify({ isOpen: checked }),
        });
        const data = await res.json();
        if (data.success) {
            setSubmissionOpen(checked);
            toast.success(checked ? "Pengajuan DIBUKA" : "Pengajuan DITUTUP");
        } else {
            toast.error("Gagal mengubah status");
        }
    } catch (e) {
        toast.error("Terjadi kesalahan sistem");
    } finally {
        setIsToggling(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center p-10">Memuat data dashboard...</div>
      </div>
    );
  }

  return (
    <div className="md:p-8 space-y-6 bg-slate-50 min-h-full">
        {/* --- P-4 for Mobile Padding, md:p-0 because parent container padding handles it on desktop? 
            Checking layout again: layout has `flex-1 overflow-y-auto` but no padding on container. 
            So padding should be here.
        */}
        <div className="p-4 md:p-0 space-y-6">

            {/* Header - Desktop */}
            <div className="hidden md:flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
                    <p className="text-slate-500 mt-1">Pantau aktivitas pengajuan dan operasional harian.</p>
                </div>
            </div>
            {/* Status Penerimaan Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="flex items-start md:items-center gap-4">
                    <div className={`p-3 rounded-xl ${submissionOpen ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        <Settings className={`h-6 w-6 ${submissionOpen ? 'text-emerald-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Status Penerimaan Pengajuan</h3>
                        <p className="text-slate-500 text-sm mt-1 max-w-lg">
                            {submissionOpen 
                             ? "Saat ini pengajuan di buka. karyawan dapat mengirimkan pengajuan baru saat ini."
                             : "Saat ini pengajuan ditutup. karyawan tidak dapat mengirimkan pengajuan baru saat ini."}
                        </p>
                    </div>
                 </div>
                 
                 <div className="flex items-center justify-between md:justify-end gap-3 bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-xl">
                    <span className="text-xs font-bold text-slate-400 md:hidden">STATUS SAAT INI</span>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-700 uppercase">
                            {submissionOpen ? "PENGAJUAN DIBUKA" : "PENGAJUAN DITUTUP"}
                        </span>
                        <Switch 
                            checked={submissionOpen}
                            onCheckedChange={handleToggleSubmission}
                            disabled={isToggling}
                            className="data-[state=checked]:bg-emerald-500"
                        />
                    </div>
                 </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Barang Minggu Ini */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm col-span-1 relative">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                        <div className="flex items-center gap-3">
                             <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                <Package className="h-6 w-6" />
                             </div>
                             <h4 className="text-sm text-slate-500 font-medium">Pengajuan Barang</h4>
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-slate-900 mt-2 md:mt-0">
                            {statCards?.barang_minggu_ini ?? 0}
                        </div>
                    </div>
                    <div className="hidden md:block text-xs text-slate-400 mt-1">Pengajuan</div>
                </div>

                {/* 2. Uang Minggu Ini */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm col-span-1 relative">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                         <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                                <Banknote className="h-6 w-6" />
                            </div>
                            <h4 className="text-sm text-slate-500 font-medium">Pengajuan Uang</h4>
                         </div>
                    </div>
                    <div>
                         <div className="text-3xl font-bold text-slate-900 mt-2 md:mt-0">
                            {statCards?.uang_minggu_ini ?? 0}
                        </div>
                    </div>
                    <div className="hidden md:block text-xs text-slate-400 mt-1">Pengajuan</div>
                </div>

                {/* 3. Total Uang Diajukan */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm col-span-2 lg:col-span-1 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <h4 className="text-sm text-slate-500 font-medium">Total Uang Diajukan</h4>
                         {/* Mobile menu dots */}
                         <div className="md:hidden text-slate-300 ml-auto">
                            <Settings className="h-5 w-5 rotate-90" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <div className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                            {formatCurrency(statCards?.jumlah_disetujui)}
                        </div>
                         <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider md:normal-case md:font-normal md:tracking-normal">
                            TOTAL PENGAJUAN MINGGU INI
                        </p>
                    </div>
                    
                    {/* Mobile Chart Decor */}
                     <div className="md:hidden absolute bottom-4 right-4 opacity-20">
                         <div className="flex items-end gap-1">
                             <div className="w-2 h-4 bg-emerald-500 rounded-t-sm"></div>
                             <div className="w-2 h-6 bg-emerald-500 rounded-t-sm"></div>
                             <div className="w-2 h-8 bg-emerald-500 rounded-t-sm"></div>
                             <div className="w-2 h-5 bg-emerald-500 rounded-t-sm"></div>
                         </div>
                     </div>
                </div>

                {/* 4. Total Karyawan */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm col-span-2 lg:col-span-1 flex flex-col justify-center relative">
                   <div className="flex items-center gap-3 mb-2">
                       <div className="hidden md:block p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                            <Users className="h-6 w-6" />
                       </div>
                       
                       {/* Mobile Icon */}
                       <div className="md:hidden p-3 bg-purple-50 text-purple-600 rounded-full w-fit mb-3">
                           <Users className="h-6 w-6" />
                       </div>

                       <h4 className="text-md text-slate-500 font-medium">Total Karyawan</h4>

                        <div className="hidden md:flex bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold ml-auto">
                            Aktif
                        </div>
                   </div>

                   <div>
                       <div className="text-3xl font-bold text-slate-900">
                           {statCards?.total_karyawan ?? 0}
                       </div>
                       <p className="text-xs text-slate-400 mt-1 hidden md:block">Personel</p>
                       <p className="text-xs text-slate-400 mt-1 md:hidden">Terdaftar</p>
                   </div>
                </div>
            </div>

            {/* Overview Mingguan Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                 <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                     <div>
                        <h3 className="text-lg font-bold text-slate-900">Overview Mingguan</h3>
                        <p className="text-slate-500 text-sm md:mt-1">
                            {window.innerWidth < 768 ? "Data 4 minggu terakhir" : "Perbandingan pengajuan Barang vs Uang bulan ini."}
                        </p>
                     </div>
                     
                     <div className="flex items-center gap-4">
                         {/* Legend */}
                         <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
                             <div className="flex items-center gap-2">
                                 <span className="w-3 h-3 rounded-full bg-blue-500"></span> Barang
                             </div>
                             <div className="flex items-center gap-2">
                                 <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Uang
                             </div>
                         </div>
                     </div>
                 </div>
                 
                 <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            stroke="#94a3b8" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            dy={10}
                        />
                         {/* Hide Y Axis on mobile to match design cleanliness, show on desktop */}
                        <YAxis 
                            stroke="#94a3b8" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => `${value}`}
                            hide={typeof window !== 'undefined' && window.innerWidth < 768}
                        />
                        <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ 
                                backgroundColor: 'white', 
                                border: 'none', 
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                            }} 
                        />
                        <Bar 
                            dataKey="barang" 
                            fill="#3b82f6" 
                            radius={[6, 6, 6, 6]} // Fully rounded bars
                            barSize={32}
                        />
                        <Bar 
                            dataKey="uang" 
                            fill="#10b981" 
                            radius={[6, 6, 6, 6]} 
                            barSize={32}
                        />
                    </BarChart>
                    </ResponsiveContainer>
                 </div>
                 
                 <p className="text-center text-xs text-slate-300 italic md:hidden mt-4">
                     Geser untuk melihat data lebih lengkap
                 </p>
            </div>

        </div>
    </div>
  );
}