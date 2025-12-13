'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, SearchIcon, FilterIcon, RefreshCcwIcon, Users, CheckCircle, XCircle, Clock, AlertCircle, LogIn, LogOut, FileText } from 'lucide-react';
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
  total_alpha: number;
}

const StatusBadge = ({ status }: { status: string }) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    hadir: { label: 'Hadir', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    izin: { label: 'Izin', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    sakit: { label: 'Sakit', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    alpha: { label: 'Alpha', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    cuti: { label: 'Cuti', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  };

  const statusInfo = statusMap[status] || statusMap.hadir;

  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}>
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

  // Dialog
  const [viewingPhoto, setViewingPhoto] = useState<{ 
    url: string; 
    type: string; 
    name: string;
    timestamp: string | null;
    date: string;
  } | null>(null);
  const [viewingDetail, setViewingDetail] = useState<AttendanceRecord | null>(null);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [todayAttendanceData, setTodayAttendanceData] = useState<AttendanceRecord[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
        router.push('/dashboard');
        return;
      }

      const dateFromStr = format(dateFrom, 'yyyy-MM-dd');
      const dateToStr = format(dateTo, 'yyyy-MM-dd');

      // Fetch attendance data for date range
      let query = supabase
        .from('absensi')
        .select('*')
        .gte('tanggal', dateFromStr)
        .lte('tanggal', dateToStr)
        .order('tanggal', { ascending: false })
        .order('check_in_time', { ascending: false });

      // Apply status filter at database level
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data: attendanceRaw, error } = await query;

      if (error) {
        console.error('Error fetching attendance:', error);
        toast.error('Gagal memuat data absensi: ' + error.message);
        return;
      }

      // Fetch user profiles (only employees with role 'karyawan')
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('role', 'karyawan');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Create a map of user_id to full_name
      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, p.full_name])
      );

      // Set total employees count (only users with role 'user')
      const totalUsers = profiles?.filter((p: any) => p.full_name).length || 0;
      setTotalEmployees(totalUsers);

      // Transform data with profile names
      const transformedData: AttendanceRecord[] = (attendanceRaw || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        full_name: profileMap.get(item.user_id) || 'Unknown',
        tanggal: item.tanggal,
        check_in_time: item.check_in_time,
        check_in_photo_url: item.check_in_photo_url,
        check_in_keterangan: item.check_in_keterangan,
        check_out_time: item.check_out_time,
        check_out_photo_url: item.check_out_photo_url,
        status: item.status,
        catatan: item.catatan,
      }));

      setRawAttendanceData(transformedData);

      // Fetch today's attendance data for stats calculation
      const today = new Date().toISOString().split('T')[0];
      const todayData = transformedData.filter(item => item.tanggal === today);
      setTodayAttendanceData(todayData);
    } catch (error) {
      console.error('Error in fetchData:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router, dateFrom, dateTo, statusFilter]); // searchQuery REMOVED from dependencies

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side filtering using useMemo
  const attendanceData = useMemo(() => {
    if (!searchQuery) {
      // No search query - return all attendance records
      return rawAttendanceData;
    }
    
    // Filter by name first
    const filteredByName = rawAttendanceData.filter((item) =>
      item.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // If no results, return empty
    if (filteredByName.length === 0) return [];

    // Get the employee info (assuming single employee when searching)
    const employeeId = filteredByName[0].user_id;
    const employeeName = filteredByName[0].full_name;

    // Generate all dates in the selected range
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    const allDates: string[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().split('T')[0]);
    }

    // Create a map of existing attendance by date
    const attendanceByDate = new Map(
      filteredByName.map(item => [item.tanggal, item])
    );

    // Generate complete attendance record for all dates
    const completeAttendance: AttendanceRecord[] = allDates.map(date => {
      const existing = attendanceByDate.get(date);
      
      if (existing) {
        // Has attendance record for this date
        return existing;
      } else {
        // No attendance record - mark as alpha (absent)
        return {
          id: 0,
          user_id: employeeId,
          full_name: employeeName,
          tanggal: date,
          check_in_time: null,
          check_in_photo_url: null,
          check_in_keterangan: null,
          check_out_time: null,
          check_out_photo_url: null,
          status: 'alpha',
          catatan: null,
        };
      }
    });

    return completeAttendance;
  }, [rawAttendanceData, searchQuery, dateFrom, dateTo]);

  // Calculate daily stats using useMemo (ONLY for today's data)
  const dailyStats = useMemo((): DailyStats => {
    // Get unique user IDs who have attendance records TODAY
    const uniqueUserIds = new Set(todayAttendanceData.map(item => item.user_id));
    const totalPresent = uniqueUserIds.size;
    const totalAbsent = totalEmployees - totalPresent;

    return {
      total_hadir: todayAttendanceData.filter((item) => item.status === 'hadir').length,
      total_izin: todayAttendanceData.filter((item) => item.status === 'izin').length,
      total_sakit: todayAttendanceData.filter((item) => item.status === 'sakit').length,
      total_alpha: totalAbsent, // Belum hadir = total karyawan - yang sudah absen hari ini
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

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = () => {
    if (attendanceData.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    setIsExporting(true);
    try {
      const dateRange = `${format(dateFrom, 'dd-MM-yyyy')} s/d ${format(dateTo, 'dd-MM-yyyy')}`;
      exportAttendanceToPDF(attendanceData, dateRange);
      toast.success('Data berhasil diekspor ke PDF');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor data');
    } finally {
      setIsExporting(false);
    }
  };

  const calculateWorkDuration = (checkIn: string | null, checkOut: string | null): string => {
    if (!checkIn || !checkOut) return '-';

    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}j ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data absensi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Panel Absensi</h1>
        <p className="text-muted-foreground mt-1">
          Kelola dan pantau kehadiran karyawan
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          📊 Statistik menampilkan data <span className="font-semibold">hari ini</span> | 📋 Tabel menampilkan data sesuai rentang tanggal
        </p>
      </div>

      {/* Stats Cards */}
      {dailyStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hadir</p>
                  <p className="text-3xl font-bold text-green-600">{dailyStats.total_hadir}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Izin</p>
                  <p className="text-3xl font-bold text-blue-600">{dailyStats.total_izin}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sakit</p>
                  <p className="text-3xl font-bold text-yellow-600">{dailyStats.total_sakit}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Belum Hadir</p>
                  <p className="text-3xl font-bold text-red-600">{dailyStats.total_alpha}</p>
                </div>
                <Users className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Attendance Table - Combined */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Filter Absensi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama karyawan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)} value={statusFilter || 'all'}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="hadir">Hadir</SelectItem>
                <SelectItem value="izin">Izin</SelectItem>
                <SelectItem value="sakit">Sakit</SelectItem>
                <SelectItem value="alpha">Alpha</SelectItem>
                <SelectItem value="cuti">Cuti</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Pickers */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(dateFrom, 'dd MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={(date) => date && setDateFrom(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground">s/d</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(dateTo, 'dd MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={(date) => date && setDateTo(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Reset Button */}
            <Button onClick={handleFilterReset} variant="outline">
              <RefreshCcwIcon className="mr-2 h-4 w-4" />
              Reset
            </Button>

            {/* Export PDF Button */}
            <Button 
              onClick={handleExportPDF} 
              disabled={isExporting || attendanceData.length === 0}
              className="bg-red-600 hover:bg-red-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              {isExporting ? 'Mengekspor...' : 'Export PDF'}
            </Button>
          </div>
        </CardContent>

        {/* Separator */}
        <div className="px-6">
          <div className="border-t" />
        </div>

        {/* Attendance Table */}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Daftar Absensi - {format(dateFrom, 'dd MMM yyyy')} s/d {format(dateTo, 'dd MMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Durasi</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Tidak ada data absensi untuk tanggal ini
                  </TableCell>
                </TableRow>
              ) : (
                attendanceData.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.full_name}</TableCell>
                    <TableCell>
                      {record.check_in_time ? (
                        <div>
                          <p className="font-medium">{formatTime(new Date(record.check_in_time))}</p>
                          {record.check_in_photo_url && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => handleViewPhoto(
                                `/api/foto-absensi/${record.check_in_photo_url}`,
                                'Check-in',
                                record.full_name,
                                record.check_in_time,
                                record.tanggal
                              )}
                            >
                              Lihat Foto
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.check_out_time ? (
                        <div>
                          <p className="font-medium">{formatTime(new Date(record.check_out_time))}</p>
                          {record.check_out_photo_url && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => handleViewPhoto(
                                `/api/foto-absensi/${record.check_out_photo_url}`,
                                'Check-out',
                                record.full_name,
                                record.check_out_time,
                                record.tanggal
                              )}
                            >
                              Lihat Foto
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {calculateWorkDuration(record.check_in_time, record.check_out_time)}
                    </TableCell>
                    <TableCell>
                      {record.check_in_keterangan || '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={record.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-muted-foreground">
                        {new Date(record.tanggal).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Photo Dialog */}
      <Dialog open={!!viewingPhoto} onOpenChange={(open) => !open && setViewingPhoto(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Foto {viewingPhoto?.type}</DialogTitle>
            <DialogDescription className="text-xs">
              {viewingPhoto?.name}
            </DialogDescription>
          </DialogHeader>
          
          {/* Timestamp Info */}
          {viewingPhoto?.timestamp && (
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tanggal:</span>
                <span className="font-medium">
                  {new Date(viewingPhoto.date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Waktu {viewingPhoto.type}:</span>
                <span className="font-medium">{formatTime(new Date(viewingPhoto.timestamp))}</span>
              </div>
            </div>
          )}

          <div className="py-2">
            {viewingPhoto && (
              <img
                src={viewingPhoto.url}
                alt={`${viewingPhoto.type} ${viewingPhoto.name}`}
                className="w-full h-auto max-h-80 object-contain rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23ddd" width="300" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EFoto tidak tersedia%3C/text%3E%3C/svg%3E';
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setViewingPhoto(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!viewingDetail} onOpenChange={(open) => !open && setViewingDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Absensi</DialogTitle>
            <DialogDescription>
              {viewingDetail?.full_name} - {viewingDetail?.tanggal && new Date(viewingDetail.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </DialogDescription>
          </DialogHeader>
          
          {viewingDetail && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Status</span>
                <StatusBadge status={viewingDetail.status} />
              </div>

              {/* Check-in Info */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Check-in
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Waktu</p>
                    <p className="font-medium">
                      {viewingDetail.check_in_time ? formatTime(new Date(viewingDetail.check_in_time)) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Keterangan</p>
                    <p className="font-medium">{viewingDetail.check_in_keterangan || '-'}</p>
                  </div>
                </div>
                {viewingDetail.check_in_photo_url && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-2">Foto Check-in</p>
                    <img
                      src={`/api/foto-absensi/${viewingDetail.check_in_photo_url}`}
                      alt="Check-in"
                      className="w-32 h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                      onClick={() => handleViewPhoto(
                        `/api/foto-absensi/${viewingDetail.check_in_photo_url}`,
                        'Check-in',
                        viewingDetail.full_name,
                        viewingDetail.check_in_time,
                        viewingDetail.tanggal
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Check-out Info */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Check-out
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Waktu</p>
                    <p className="font-medium">
                      {viewingDetail.check_out_time ? formatTime(new Date(viewingDetail.check_out_time)) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Durasi Kerja</p>
                    <p className="font-medium">
                      {calculateWorkDuration(viewingDetail.check_in_time, viewingDetail.check_out_time)}
                    </p>
                  </div>
                </div>
                {viewingDetail.check_out_photo_url && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-2">Foto Check-out</p>
                    <img
                      src={`/api/foto-absensi/${viewingDetail.check_out_photo_url}`}
                      alt="Check-out"
                      className="w-32 h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                      onClick={() => handleViewPhoto(
                        `/api/foto-absensi/${viewingDetail.check_out_photo_url}`,
                        'Check-out',
                        viewingDetail.full_name,
                        viewingDetail.check_out_time,
                        viewingDetail.tanggal
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Catatan */}
              {viewingDetail.catatan && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2">Catatan</h4>
                  <p className="text-sm text-muted-foreground">{viewingDetail.catatan}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDetail(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
