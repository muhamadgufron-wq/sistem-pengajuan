
import { createClient } from '@/app/lib/supabase/server';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcwIcon, FileText } from 'lucide-react';
import AttendanceTable from '@/components/absensi/AttendanceTable';
import AttendanceFilters from '@/components/absensi/AttendanceFilters';
import AttendanceStats from '@/components/absensi/AttendanceStats';
import AttendanceActions from '@/components/absensi/AttendanceActions';
import { format } from 'date-fns';

export default async function AdminAbsensiPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  
  // 1. Parse Filters
  const now = new Date();
  const dateFromStr = typeof params.from === 'string' ? params.from : format(now, 'yyyy-MM-dd');
  const dateToStr = typeof params.to === 'string' ? params.to : format(now, 'yyyy-MM-dd');
  const queryText = typeof params.q === 'string' ? params.q : '';

  // 2. Fetch Data (Parallel)
  // Query 1: Filtered Attendance (for Table)
  let query = supabase
    .from('absensi')
    .select('*')
    .gte('tanggal', dateFromStr)
    .lte('tanggal', dateToStr)
    .order('tanggal', { ascending: false })
    .order('check_in_time', { ascending: false });

  // Query 2: All Profiles (for mapping names & Alpha calculation)
  const profilesQuery = supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'karyawan');
  
  // Query 3: Today's Attendance (for Stats Cards - strictly today)
  const todayStr = format(now, 'yyyy-MM-dd');
  const todayAttendanceQuery = supabase
      .from('absensi')
      .select('status, user_id, check_in_time')
      .eq('tanggal', todayStr);

  const [attendanceRes, profilesRes, todayRes] = await Promise.all([
      query,
      profilesQuery,
      todayAttendanceQuery
  ]);

  const rawAttendance = attendanceRes.data || [];
  const profiles = profilesRes.data || [];
  const todayData = todayRes.data || [];

  // 3. Process Data
  const profileMap = new Map(profiles.map(p => [p.id, p.full_name]));
  const totalEmployees = profiles.length;

  // Filter by name (client-side filtering on the fetched set for now, or could serve-side filter if Supabase supports relational filter easily)
  // Doing it in JS here allowing search across full name which is in another table (though we fetched all profiles so we can map)
  let processedData = rawAttendance.map((item) => {
    const isWednesday = new Date(item.tanggal).getDay() === 3;
    const effectiveStatus = (isWednesday && item.status === 'hadir') ? 'lembur' : item.status;
    return {
      ...item,
      full_name: profileMap.get(item.user_id) || 'Unknown',
      status: effectiveStatus,
    };
  });

  if (queryText) {
      processedData = processedData.filter(item => 
          item.full_name.toLowerCase().includes(queryText.toLowerCase())
      );
  }

  // 4. Calculate Stats (Today)
  const uniqueAttendees = new Set(todayData.map(d => d.user_id));
  const stats = {
      total_hadir: todayData.filter(d => d.status.toLowerCase() === 'hadir').length,
      total_izin: todayData.filter(d => d.status.toLowerCase() === 'izin').length,
      total_sakit: todayData.filter(d => d.status.toLowerCase() === 'sakit').length,
      total_lembur: todayData.filter(d => d.status.toLowerCase() === 'lembur').length, // Or check wednesday logic
      total_alpha: totalEmployees - uniqueAttendees.size
  };
  
  // Enriched today data for the modal
  const enrichedTodayData = todayData.map(d => ({
      ...d,
      full_name: profileMap.get(d.user_id) || 'Unknown'
  }));

  const allEmployees = profiles.map(p => ({ id: p.id, full_name: p.full_name }));


  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="pl-4">
          <h1 className="text-2xl font-bold tracking-tight">Monitoring Absensi</h1>
          <p className="text-sm text-muted-foreground">Pantau kehadiran karyawan secara real-time</p>
        </div>
        <div className="flex items-center gap-2">
            <AttendanceActions 
                data={processedData} 
                dateFrom={dateFromStr} 
                dateTo={dateToStr} 
            />
        </div>
      </div>

      {/* Stats Overview */}
      <AttendanceStats 
        stats={stats} 
        todayData={enrichedTodayData} 
        allEmployees={allEmployees} 
      />

      <Card className="shadow-sm border-muted/60">
        <CardHeader className="p-4 border-b">
           <AttendanceFilters initialDateFrom={dateFromStr} initialDateTo={dateToStr} />
        </CardHeader>
        <CardContent className="p-0">
           <AttendanceTable data={processedData} />
        </CardContent>
      </Card>
    </div>
  );
}
