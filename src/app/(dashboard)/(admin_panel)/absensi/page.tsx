'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { Card, CardContent, CardHeader} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, SearchIcon, RefreshCcwIcon, Users, CheckCircle, XCircle, Clock, AlertCircle, LogIn, LogOut, FileText, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatTime } from '@/lib/utils/camera';
import { exportAttendanceToPDF } from '@/lib/utils/attendance-export';

interface AttendanceRecord {
  id: number;
  user_id: string;
  full_name: string;
  tanggal: string;
  check_in_time: string | null;
  check_in_photo_url: string | null;
  check_in_keterangan: string | null;
  check_out_time: string | null;
  check_out_photo_url: string | null;
  status: string;
  catatan: string | null;
}

interface DailyStats {
  total_hadir: number;
  total_izin: number;
  total_sakit: number;
  total_lembur: number;
  total_alpha: number;
}

const StatusBadge = ({ status }: { status: string }) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    hadir: { label: 'Hadir', className: 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' },
    izin: { label: 'Izin', className: 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
    sakit: { label: 'Sakit', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' },
    alpha: { label: 'Alpha', className: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
    cuti: { label: 'Cuti', className: 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' },
    libur: { label: 'Libur', className: 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800' },
    lembur: { label: 'Lembur', className: 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' },
  };

  const statusInfo = statusMap[status] || statusMap.hadir;

  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusInfo.className}`}>
      {statusInfo.label}
    </span>
  );
};

export default function AdminAbsensiPage() {
  const supabase = createClient();
  const router = useRouter();

  const [rawAttendanceData, setRawAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());

  // Dialogs
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; type: string; name: string; timestamp: string | null; date: string; } | null>(null);
  const [viewingDetail, setViewingDetail] = useState<AttendanceRecord | null>(null);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [todayAttendanceData, setTodayAttendanceData] = useState<AttendanceRecord[]>([]);
  const [viewingStatusList, setViewingStatusList] = useState<{ status: string; employees: { name: string; time?: string }[] } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (!profile || !['admin', 'superadmin'].includes(profile.role)) { router.push('/dashboard'); return; }

      const dateFromStr = format(dateFrom, 'yyyy-MM-dd');
      const dateToStr = format(dateTo, 'yyyy-MM-dd');

      let query = supabase.from('absensi').select('*').gte('tanggal', dateFromStr).lte('tanggal', dateToStr).order('tanggal', { ascending: false }).order('check_in_time', { ascending: false });
      if (statusFilter) query = query.eq('status', statusFilter);

      const { data: attendanceRaw, error } = await query;
      if (error) throw error;

      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, full_name, role').eq('role', 'karyawan');
      if (profilesError) console.error('Error fetching profiles:', profilesError);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
      setTotalEmployees(profiles?.filter((p: any) => p.full_name).length || 0);

      const transformedData: AttendanceRecord[] = (attendanceRaw || []).map((item: any) => {
        const isWednesday = new Date(item.tanggal).getDay() === 3;
        // If it's Wednesday and they are present (hadir), consider it 'lembur'
        const effectiveStatus = (isWednesday && item.status === 'hadir') ? 'lembur' : item.status;
        
        return {
          id: item.id,
          user_id: item.user_id,
          full_name: profileMap.get(item.user_id) || 'Unknown',
          tanggal: item.tanggal,
          check_in_time: item.check_in_time,
          check_in_photo_url: item.check_in_photo_url,
          check_in_keterangan: item.check_in_keterangan,
          check_out_time: item.check_out_time,
          check_out_photo_url: item.check_out_photo_url,
          status: effectiveStatus,
          catatan: item.catatan,
        };
      });

      setRawAttendanceData(transformedData);

      const today = new Date().toISOString().split('T')[0];
      setTodayAttendanceData(transformedData.filter(item => item.tanggal === today));
    } catch (error: any) {
      console.error('Error in fetchData:', error);
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router, dateFrom, dateTo, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const attendanceData = useMemo(() => {
    if (!searchQuery) return rawAttendanceData;
    const filteredByName = rawAttendanceData.filter((item) => item.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filteredByName.length === 0) return [];
    
    // Logic to fill empty dates for searched employee
    const employeeId = filteredByName[0].user_id;
    const employeeName = filteredByName[0].full_name;
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    const allDates: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().split('T')[0]);
    }
    const attendanceByDate = new Map(filteredByName.map(item => [item.tanggal, item]));
    
    return allDates.map(date => {
      const existing = attendanceByDate.get(date);
      if (existing) return existing;
      
      const isWednesday = new Date(date).getDay() === 3; // 3 is Wednesday
      return {
        id: 0, user_id: employeeId, full_name: employeeName, tanggal: date,
        check_in_time: null, check_in_photo_url: null, check_in_keterangan: null,
        check_out_time: null, check_out_photo_url: null, status: isWednesday ? 'libur' : 'alpha', catatan: null,
      };
    });
  }, [rawAttendanceData, searchQuery, dateFrom, dateTo]);

  const dailyStats = useMemo((): DailyStats => {
    const uniqueUserIds = new Set(todayAttendanceData.map(item => item.user_id));
    const totalPresent = uniqueUserIds.size;
    
    return {
      total_hadir: todayAttendanceData.filter((item) => item.status === 'hadir').length,
      total_izin: todayAttendanceData.filter((item) => item.status === 'izin').length,
      total_sakit: todayAttendanceData.filter((item) => item.status === 'sakit').length,
      total_lembur: todayAttendanceData.filter((item) => item.status === 'lembur').length,
      total_alpha: totalEmployees - totalPresent,
    };
  }, [todayAttendanceData, totalEmployees]);

  const handleFilterReset = () => {
    setSearchQuery('');
    setStatusFilter('');
    const today = new Date();
    setDateFrom(today);
    setDateTo(today);
  };

  const handleViewPhoto = (url: string, type: string, name: string, timestamp: string | null, date: string) => {
    setViewingPhoto({ url, type, name, timestamp, date });
  };

  const handleExportPDF = () => {
    if (attendanceData.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }
    setIsExporting(true);
    try {
      exportAttendanceToPDF(attendanceData, `${format(dateFrom, 'dd-MM-yyyy')} s/d ${format(dateTo, 'dd-MM-yyyy')}`);
      toast.success('Berhasil ekspor ke PDF');
    } catch (error) { toast.error('Gagal mengekspor data'); } 
    finally { setIsExporting(false); }
  };

  const calculateWorkDuration = (checkIn: string | null, checkOut: string | null): string => {
    if (!checkIn || !checkOut) return '-';
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}j ${minutes}m`;
  };

  const handleStatusCardClick = async (status: string) => {
    const employees = todayAttendanceData.filter(record => record.status === status)
      .map(record => ({ name: record.full_name, time: record.check_in_time ? formatTime(new Date(record.check_in_time)) : undefined }));

    if (status === 'alpha') {
      try {
        const { data: allProfiles } = await supabase.from('profiles').select('id, full_name').eq('role', 'karyawan');
        const attendedUserIds = new Set(todayAttendanceData.map(r => r.user_id));
        const absentEmployees = (allProfiles || []).filter((p: any) => !attendedUserIds.has(p.id)).map((p: any) => ({ name: p.full_name }));
        setViewingStatusList({ status, employees: absentEmployees });
      } catch (error) { console.error('Error fetching absent employees:', error); }
    } else {
      setViewingStatusList({ status, employees });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="pl-4">
          <h1 className="text-2xl font-bold tracking-tight">Monitoring Absensi</h1>
          <p className="text-sm text-muted-foreground">Pantau kehadiran karyawan secara real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCcwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExportPDF} disabled={isExporting} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
             <FileText className="h-4 w-4 mr-2" />
             {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Hadir', count: dailyStats.total_hadir, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', status: 'hadir' },
          { label: 'Izin', count: dailyStats.total_izin, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', status: 'izin' },
          { label: 'Sakit', count: dailyStats.total_sakit, icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', status: 'sakit' },
          { label: 'Alpha', count: dailyStats.total_alpha, icon: Users, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', status: 'alpha' },
        ].map((stat) => (
          <Card key={stat.label} className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-all ${stat.bg}`} onClick={() => handleStatusCardClick(stat.status)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className={`text-2xl font-bold ${stat.color}`}>{stat.count}</h3>
              </div>
              <stat.icon className={`h-8 w-8 opacity-80 ${stat.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border-muted/60">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">Log Kehadiran</h3>
             </div>
             
             <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Cari karyawan..." 
                    className="pl-9 h-9 w-[180px] bg-background" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center bg-background rounded-md border shadow-sm">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-9 px-3 hover:bg-transparent">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{format(dateFrom, 'dd MMM')}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent mode="single" selected={dateFrom} onSelect={(date) => date && setDateFrom(date)} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground text-xs px-1">-</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-9 px-3 hover:bg-transparent">
                        <span className="text-sm">{format(dateTo, 'dd MMM')}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent mode="single" selected={dateTo} onSelect={(date) => date && setDateTo(date)} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                {(searchQuery || dateFrom.toDateString() !== new Date().toDateString()) && (
                  <Button variant="ghost" size="icon" onClick={handleFilterReset} className="h-9 w-9">
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[20%]">Karyawan</TableHead>
                <TableHead className="w-[15%]">Tanggal</TableHead>
                <TableHead className="w-[15%]">Masuk</TableHead>
                <TableHead className="w-[15%]">Pulang</TableHead>
                <TableHead className="w-[10%]">Durasi</TableHead>
                <TableHead className="w-[15%]">Keterangan</TableHead>
                <TableHead className="w-[10%] text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Tidak ada data ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                attendanceData.map((record) => (
                  <TableRow key={`${record.user_id}-${record.tanggal}`} onClick={() => setViewingDetail(record)} className="cursor-pointer hover:bg-muted/50 [&_td]:py-4">
                    <TableCell className="font-medium">{record.full_name}</TableCell>
                    <TableCell>
                       {new Date(record.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      {record.check_in_time ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatTime(new Date(record.check_in_time))}</span>
                          {record.check_in_photo_url && (
                             <div 
                               className="h-1.5 w-1.5 rounded-full bg-blue-500" 
                               title="Ada foto"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleViewPhoto(`/api/foto-absensi/${record.check_in_photo_url}`, 'Masuk', record.full_name, record.check_in_time, record.tanggal);
                               }}
                             />
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {record.check_out_time ? (
                        <div className="flex items-center gap-2">
                           <span className="font-medium">{formatTime(new Date(record.check_out_time))}</span>
                           {record.check_out_photo_url && (
                              <div 
                                className="h-1.5 w-1.5 rounded-full bg-blue-500" 
                                title="Ada foto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewPhoto(`/api/foto-absensi/${record.check_out_photo_url}`, 'Pulang', record.full_name, record.check_out_time, record.tanggal);
                                }}
                              />
                           )}
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                       {calculateWorkDuration(record.check_in_time, record.check_out_time)}
                    </TableCell>
                    <TableCell className="truncate max-w-[150px]" title={record.check_in_keterangan || ''}>
                       {record.check_in_keterangan || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={record.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs - Kept logic mostly same but cleaned up JSX */}
      <Dialog open={!!viewingPhoto} onOpenChange={(open) => !open && setViewingPhoto(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black/95 text-white border-0">
          <DialogTitle className="sr-only">Foto Absensi</DialogTitle>
          <div className="relative flex items-center justify-center p-4 bg-muted/10 h-[60vh]">
             {viewingPhoto && (
                <img 
                  src={viewingPhoto.url} 
                  alt="Attendance Evidence" 
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Foto+Tidak+Tersedia'; }}
                />
             )}
          </div>
          <div className="p-4 bg-background text-foreground">
             <div className="flex justify-between items-start">
               <div>
                  <h3 className="font-semibold text-lg">{viewingPhoto?.type} - {viewingPhoto?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewingPhoto?.date && new Date(viewingPhoto?.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    {' • '}
                    {viewingPhoto?.timestamp && formatTime(new Date(viewingPhoto?.timestamp))}
                  </p>
               </div>
               <Button variant="destructive" size="sm" onClick={() => setViewingPhoto(null)}>Tutup</Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingDetail} onOpenChange={(open) => !open && setViewingDetail(null)}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Detail Absensi</DialogTitle>
               <DialogDescription>Informasi lengkap kehadiran karyawan.</DialogDescription>
            </DialogHeader>
            {viewingDetail && (
               <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                     <div>
                        <p className="font-semibold">{viewingDetail.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                           {new Date(viewingDetail.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                     </div>
                     <StatusBadge status={viewingDetail.status} />
                  </div>
                  
                  {/* Photos Section */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2 border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                           <LogIn className="h-4 w-4 text-green-600" />
                           <span className="font-medium text-sm">Masuk</span>
                        </div>
                        <div className="space-y-2">
                           <p className="text-2xl font-bold">{viewingDetail.check_in_time ? formatTime(new Date(viewingDetail.check_in_time)) : '--:--'}</p>
                           {viewingDetail.check_in_photo_url ? (
                              <div className="aspect-square relative rounded-md overflow-hidden bg-muted">
                                <img
                                  src={`/api/foto-absensi/${viewingDetail.check_in_photo_url}`}
                                  alt="Foto Masuk"
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => handleViewPhoto(`/api/foto-absensi/${viewingDetail.check_in_photo_url}`, 'Masuk', viewingDetail.full_name, viewingDetail.check_in_time, viewingDetail.tanggal)}
                                />
                              </div>
                           ) : (
                              <div className="aspect-square flex items-center justify-center bg-muted text-muted-foreground text-xs text-center rounded-md p-2">
                                Tidak ada foto
                              </div>
                           )}
                        </div>
                     </div>
                     
                     <div className="space-y-2 border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                           <LogOut className="h-4 w-4 text-orange-600" />
                           <span className="font-medium text-sm">Pulang</span>
                        </div>
                        <div className="space-y-2">
                           <p className="text-2xl font-bold">{viewingDetail.check_out_time ? formatTime(new Date(viewingDetail.check_out_time)) : '--:--'}</p>
                           {viewingDetail.check_out_photo_url ? (
                              <div className="aspect-square relative rounded-md overflow-hidden bg-muted">
                                <img
                                  src={`/api/foto-absensi/${viewingDetail.check_out_photo_url}`}
                                  alt="Foto Pulang"
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => handleViewPhoto(`/api/foto-absensi/${viewingDetail.check_out_photo_url}`, 'Pulang', viewingDetail.full_name, viewingDetail.check_out_time, viewingDetail.tanggal)}
                                />
                              </div>
                           ) : (
                              <div className="aspect-square flex items-center justify-center bg-muted text-muted-foreground text-xs text-center rounded-md p-2">
                                Tidak ada foto
                              </div>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Duration Section */}
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <span className="text-sm font-medium">Durasi Kerja</span>
                    <span className="font-bold text-lg">{calculateWorkDuration(viewingDetail.check_in_time, viewingDetail.check_out_time)}</span>
                  </div>

                  {/* Keterangan & Catatan Section */}
                  <div className="space-y-3">
                    {/* Keterangan Masuk */}
                    <div className="border rounded-lg p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Keterangan</p>
                      <p className="text-sm">{viewingDetail.check_in_keterangan || '-'}</p>
                    </div>

                    {/* Catatan Tambahan (if any) */}
                    {viewingDetail.catatan && (
                       <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
                          <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-400 mb-1">Catatan Tambahan</p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">{viewingDetail.catatan}</p>
                       </div>
                    )}
                  </div>
               </div>
            )}
            <DialogFooter>
               <Button  variant="destructive" onClick={() => setViewingDetail(null)}>Tutup</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
      
      <Dialog open={!!viewingStatusList} onOpenChange={(open) => !open && setViewingStatusList(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
             <DialogTitle>Daftar Karyawan ({viewingStatusList?.status})</DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
             {viewingStatusList?.employees.length ? (
                viewingStatusList.employees.map((emp, i) => (
                   <div key={i} className="flex justify-between items-center p-2.5 rounded-md bg-muted/50 text-sm">
                      <span className="font-medium">{emp.name}</span>
                      {emp.time && <span className="text-xs px-2 py-0.5 bg-background rounded border">{emp.time}</span>}
                   </div>
                ))
             ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">Tidak ada data.</div>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
