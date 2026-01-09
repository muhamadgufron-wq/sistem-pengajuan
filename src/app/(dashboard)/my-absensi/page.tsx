'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckInDialog } from '@/components/absensi/CheckInDialog';
import { CheckOutDialog } from '@/components/absensi/CheckOutDialog';
import { toast } from 'sonner';
import { Calendar, Clock, LogIn, LogOut, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils/camera';
import { isWednesday } from '@/lib/utils/attendance-utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const getTodayDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

interface TodayAttendance {
  id: number;
  tanggal: string;
  check_in_time: string | null;
  check_in_photo_url: string | null;
  check_in_keterangan: string | null;
  check_out_time: string | null;
  check_out_photo_url: string | null;
  status: string;
}

interface AttendanceStats {
  total_hadir: number;
  total_izin: number;
  total_sakit: number;
  total_alpha: number;
  total_cuti: number;
}

interface AttendanceHistory {
  tanggal: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  check_in_keterangan: string | null;
}

interface ApprovedLeave {
  id: number;
  jenis: string; // 'izin', 'sakit', 'cuti'
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan: string;
  jumlah_hari: number;
}

export default function AbsensiPage() {
  const supabase = createClient();
  const router = useRouter();

  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [incompleteAttendance, setIncompleteAttendance] = useState<TodayAttendance | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [history, setHistory] = useState<AttendanceHistory[]>([]);
  const [approvedLeave, setApprovedLeave] = useState<ApprovedLeave | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

      // Check for incomplete past attendance (YESTERDAY ONLY)
      const { data: incompleteData } = await supabase
        .from('absensi')
        .select('*')
        .eq('user_id', user.id)
        .is('check_out_time', null)
        .eq('tanggal', yesterdayStr)
        .single();

      if (incompleteData) {
        setIncompleteAttendance(incompleteData);
        // If incomplete exists, we don't necessarily need today's data immediately for check-in purposes,
        // but fetching it handles edge cases where they might have somehow checked in today already.
      } else {
        setIncompleteAttendance(null);
      }

      // Fetch today's attendance
      const { data: todayData, error: todayError } = await supabase
        .from('absensi')
        .select('*')
        .eq('user_id', user.id)
        .eq('tanggal', getTodayDate())
        .single();

      if (todayError && todayError.code !== 'PGRST116') {
        console.error('Error fetching today attendance:', todayError);
      } else {
        setTodayAttendance(todayData);
      }

      // Fetch monthly stats
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data: statsData, error: statsError } = await supabase
        .rpc('get_attendance_stats', {
          p_user_id: user.id,
          p_month: currentMonth,
          p_year: currentYear,
        });

      if (statsError) {
        console.error('Error fetching stats:', statsError);
      } else if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // Fetch recent history (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: historyData, error: historyError } = await supabase
        .from('absensi')
        .select('tanggal, check_in_time, check_out_time, status, check_in_keterangan')
        .eq('user_id', user.id)
        .gte('tanggal', sevenDaysAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }))
        .order('tanggal', { ascending: false })
        .limit(7);

      if (historyError) {
        console.error('Error fetching history:', historyError);
      } else {
        setHistory(historyData || []);
      }

      // Check if user has approved leave for today
      const { data: leaveData, error: leaveError } = await supabase
        .rpc('check_approved_leave_for_date', {
          p_user_id: user.id,
          p_date: getTodayDate(),
        });

      if (leaveError) {
        console.error('Error checking approved leave:', leaveError);
      } else if (leaveData && leaveData.length > 0) {
        setApprovedLeave(leaveData[0]);
      } else {
        setApprovedLeave(null);
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
      toast.error('Gagal memuat data absensi');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckInSuccess = () => {
    fetchData();
  };

  const handleCheckOutSuccess = () => {
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      hadir: { label: 'Hadir', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      izin: { label: 'Izin', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      sakit: { label: 'Sakit', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      alpha: { label: 'Alpha', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      cuti: { label: 'Cuti', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    };

    const statusInfo = statusMap[status] || statusMap.hadir;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
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

  const hasCheckedIn = todayAttendance?.check_in_time;
  const hasCheckedOut = todayAttendance?.check_out_time;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-center mt-2">Absensi</h1>
        <p className="text-muted-foreground text-center mt-2">
          {formatDate(currentTime)}
        </p>
      </div>

      {/* Wednesday Holiday Banner */}
      {isWednesday(currentTime) && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-700 dark:text-orange-300 mb-1">
                  Hari Libur (Rabu)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Anda tidak wajib masuk hari ini. Jika Anda melakukan masuk, akan dihitung sebagai{' '}
                  <span className="font-semibold text-orange-600">lembur</span>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incomplete Attendance Warning */}
      {incompleteAttendance && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
                  Absen Pulang Belum Selesai!
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Anda belum melakukan absen pulang untuk tanggal{' '}
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {format(new Date(incompleteAttendance.tanggal), 'EEEE, d MMMM yyyy', { locale: id })}
                  </span>
                  . Silakan lengkapi absen pulang terlebih dahulu sebelum melakukan absen hari ini.
                </p>
                <Button 
                  onClick={() => setShowCheckOutDialog(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Input Jam Pulang
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Today's Attendance Card - Only Show if NO Incomplete Attendance */}
      {!incompleteAttendance && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Absensi Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Time */}
          <div className="text-center py-6 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Waktu Sekarang</p>
            <p className="text-4xl font-bold">{formatTime(currentTime)}</p>
          </div>

          {/* Check-in/out Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <LogIn className="h-4 w-4" />
                Masuk
              </div>
              {hasCheckedIn ? (
                <>
                  <p className="text-2xl font-bold text-green-600">
                    {formatTime(new Date(todayAttendance.check_in_time!))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {todayAttendance.check_in_keterangan}
                  </p>
                </>
              ) : (
                <p className="text-lg text-muted-foreground">Belum masuk</p>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <LogOut className="h-4 w-4" />
                Pulang
              </div>
              {hasCheckedOut ? (
                <p className="text-2xl font-bold text-blue-600">
                  {formatTime(new Date(todayAttendance.check_out_time!))}
                </p>
              ) : (
                <p className="text-lg text-muted-foreground">Belum pulang</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {approvedLeave ? (
              // Show leave information if user has approved leave
              <div className="flex-1 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {approvedLeave.jenis === 'izin' && <span className="text-2xl">📋</span>}
                    {approvedLeave.jenis === 'sakit' && <span className="text-2xl">🤒</span>}
                    {approvedLeave.jenis === 'cuti' && <span className="text-2xl">🏖️</span>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        approvedLeave.jenis === 'izin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        approvedLeave.jenis === 'sakit' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      }`}>
                        {approvedLeave.jenis.charAt(0).toUpperCase() + approvedLeave.jenis.slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(approvedLeave.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        {approvedLeave.jumlah_hari > 1 && 
                          ` - ${new Date(approvedLeave.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                        }
                        {' '}({approvedLeave.jumlah_hari} hari)
                      </span>
                    </div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                      Anda sedang {approvedLeave.jenis}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {approvedLeave.alasan}
                    </p>
                  </div>
                </div>
              </div>
            ) : !hasCheckedIn ? (
              <Button
                onClick={() => setShowCheckInDialog(true)}
                className="flex-1 bg-green-500 hover:bg-green-600"
                size="lg"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Masuk
              </Button>
            ) : !hasCheckedOut ? (
              <Button
                onClick={() => setShowCheckOutDialog(true)}
                className="flex-1 bg-red-500 hover:bg-red-600"
                size="lg"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Pulang
              </Button>
            ) : (
              <div className="flex-1 text-center py-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-green-700 dark:text-green-300 font-medium">
                  ✅ Absensi hari ini sudah lengkap
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}  {/* Monthly Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Statistik Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{stats.total_hadir}</p>
                <p className="text-sm text-muted-foreground mt-1">Hadir</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{stats.total_izin}</p>
                <p className="text-sm text-muted-foreground mt-1">Izin</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-3xl font-bold text-yellow-600">{stats.total_sakit}</p>
                <p className="text-sm text-muted-foreground mt-1">Sakit</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{stats.total_alpha}</p>
                <p className="text-sm text-muted-foreground mt-1">Alpha</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">{stats.total_cuti}</p>
                <p className="text-sm text-muted-foreground mt-1">Cuti</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Riwayat 7 Hari Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Belum ada riwayat absensi
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.tanggal}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(item.tanggal).toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    {item.check_in_time && (
                      <p className="text-sm text-muted-foreground">
                        {formatTime(new Date(item.check_in_time))}
                        {item.check_out_time && ` - ${formatTime(new Date(item.check_out_time))}`}
                        {item.check_in_keterangan && ` • ${item.check_in_keterangan}`}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CheckInDialog
        open={showCheckInDialog}
        onOpenChange={setShowCheckInDialog}
        onSuccess={handleCheckInSuccess}
      />

      {((hasCheckedIn && todayAttendance?.check_in_time) || incompleteAttendance) && (
        <CheckOutDialog
          open={showCheckOutDialog}
          onOpenChange={setShowCheckOutDialog}
          onSuccess={handleCheckOutSuccess}
          checkInTime={
            incompleteAttendance 
              ? (incompleteAttendance.check_in_time || new Date(incompleteAttendance.tanggal).toISOString())
              : (todayAttendance?.check_in_time || new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
          }
          attendanceDate={incompleteAttendance?.tanggal}
        />
      )}
    </div>
  );
}
