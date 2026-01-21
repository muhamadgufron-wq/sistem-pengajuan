
import { createClient } from '@/lib/supabase/server';
import WeeklyOverviewChart from '@/components/dashboard/WeeklyOverviewChart';

export default async function WeeklyChartSection() {
  const supabase = await createClient();

  const { data: chartData, error } = await supabase.rpc('get_dashboard_overview_chart');
  
  if (error) {
      console.error("Error fetching chart data:", error);
      return <div className="p-4 text-red-500">Gagal memuat grafik.</div>;
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                <h3 className="text-lg font-bold text-slate-900">Overview Mingguan</h3>
                <p className="text-slate-500 text-sm md:mt-1">
                    Perbandingan pengajuan Barang vs Uang bulan ini.
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
            
            <WeeklyOverviewChart data={chartData || []} />
            
            <p className="text-center text-xs text-slate-300 italic md:hidden mt-4">
                Geser untuk melihat data lebih lengkap
            </p>
    </div>
  );
}
