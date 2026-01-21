
import { createClient } from '@/app/lib/supabase/server';
import { Users, Package, Banknote, Wallet, Settings } from 'lucide-react';

interface DashboardStatCards {
  barang_minggu_ini: number;
  uang_minggu_ini: number;
  jumlah_disetujui: number;
  total_karyawan: number;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (!value && value !== 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default async function StatsCards() {
  const supabase = await createClient();

  const [statsRes, employeeCountRes] = await Promise.all([
      supabase.rpc('get_dashboard_stat_cards'),
      supabase.from('user_profiles_with_email')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'karyawan')
  ]);

  const statCards: DashboardStatCards = {
      ...(statsRes.data?.[0] || { barang_minggu_ini: 0, uang_minggu_ini: 0, jumlah_disetujui: 0 }),
      total_karyawan: employeeCountRes.count ?? 0
  };

  return (
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
                    {statCards.barang_minggu_ini}
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
                    {statCards.uang_minggu_ini}
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
                    {formatCurrency(statCards.jumlah_disetujui)}
                </div>
                    <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider md:normal-case md:font-normal md:tracking-normal">
                    Total Pengajuan Minggu Ini
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
                    {statCards.total_karyawan}
                </div>
                <p className="text-xs text-slate-400 mt-1 hidden md:block"> Karyawan</p>
                <p className="text-xs text-slate-400 mt-1 md:hidden">Karyawan</p>
            </div>
        </div>
    </div>
  );
}
