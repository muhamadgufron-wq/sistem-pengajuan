'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckInDialog } from '@/components/absensi/CheckInDialog';
import { CheckOutDialog } from '@/components/absensi/CheckOutDialog';
import { toast } from 'sonner';
import { Calendar, Clock, LogIn, LogOut, TrendingUp, AlertTriangle, ChevronLeft, MapPin } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils/camera';
import { isWednesday } from '@/lib/utils/attendance-utils';
import { format, differenceInMinutes } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';

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
      hadir: { label: 'Hadir', className: 'bg-green-100 text-green-700' },
      izin: { label: 'Izin', className: 'bg-blue-100 text-blue-700' },
      sakit: { label: 'Sakit', className: 'bg-yellow-100 text-yellow-700' },
      alpha: { label: 'Alpha', className: 'bg-red-100 text-red-700' },
      cuti: { label: 'Cuti', className: 'bg-purple-100 text-purple-700' },
    };

    const statusInfo = statusMap[status] || statusMap.hadir;

    return (
      <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusInfo.className}`}>
        {statusInfo.label.toUpperCase()}
      </span>
    );
  };

  // Helper to calculate duration
  const calculateDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return "-- : --";
    const diff = differenceInMinutes(new Date(end), new Date(start));
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
             <p className="text-gray-500">Memuat data absensi...</p>
        </div>
      </div>
    );
  }

  const hasCheckedIn = todayAttendance?.check_in_time;
  const hasCheckedOut = todayAttendance?.check_out_time;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* 1. Header Minimalis */}
      <div className="px-6 py-6 flex items-center">
        <Link href="/dashboard" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-6 h-6 text-slate-800" />
        </Link>
      </div>

      {/* 2. Hero Section: Clock & Status */}
      <div className="text-center px-6 mb-8">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight font-mono mb-1">
            {formatTime(currentTime)}
        </h1>
        <p className="text-slate-500 font-medium text-sm mb-6">
            {format(currentTime, 'EEEE, d MMMM yyyy', { locale: id })}
        </p>

        {/* Status Pill */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide
            ${hasCheckedOut ? 'bg-gray-100 text-gray-500' : hasCheckedIn ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'}
        `}>
             <span className={`w-2 h-2 rounded-full ${hasCheckedOut ? 'bg-gray-400' : hasCheckedIn ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
             {hasCheckedOut ? 'Sudah Pulang' : hasCheckedIn ? 'Sudah Masuk' : 'Belum Masuk'}
        </div>
      </div>

      {/* 3. Work Summary Card (Mobile Style) */}
      <div className="px-6 mb-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
             <div className="flex justify-between divide-x divide-gray-100">
                <div className="text-center px-2 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Masuk</p>
                    <p className="text-lg font-bold text-slate-800">
                       {hasCheckedIn ? formatTime(new Date(todayAttendance!.check_in_time!)).slice(0, 5) : "--:--"}
                    </p>
                </div>
                <div className="text-center px-2 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Pulang</p>
                    <p className="text-lg font-bold text-slate-800">
                       {hasCheckedOut ? formatTime(new Date(todayAttendance!.check_out_time!)).slice(0, 5) : "--:--"}
                    </p>
                </div>
                <div className="text-center px-2 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Total Jam</p>
                    <p className="text-lg font-bold text-emerald-600">
                       {calculateDuration(todayAttendance?.check_in_time || null, todayAttendance?.check_out_time || null)}
                    </p>
                </div>
             </div>

             {todayAttendance?.check_in_keterangan && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Keterangan</p>
                    <p className="text-sm font-medium text-slate-700 italic">" {todayAttendance.check_in_keterangan} "</p>
                </div>
             )}
          </div>
      </div>

      {/* 4. Big Circular Action Button */}
      <div className="flex justify-center mb-10 relative">
          {/* Background Decor Circles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-gray-100 rounded-full animate-[pulse_3s_ease-in-out_infinite]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 border border-blue-50/50 rounded-full"></div>

          {/* Warning for Wednesday/Incomplete */}
          {isWednesday(currentTime) && (
             <div className="absolute -top-12 z-20 bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-xs font-bold border border-orange-200">
                 ⚠️ Hari Libur
             </div>
          )}
          {incompleteAttendance && (
               <div className="absolute -top-12 z-20 bg-red-100 text-red-700 px-4 py-1 rounded-full text-xs font-bold border border-red-200 animate-bounce">
                  ⚠️ Selesaikan Absen Kemarin
               </div>
          )}

          {/* Button Logic */}
          <button
            onClick={() => {
                if (incompleteAttendance) {
                   setShowCheckOutDialog(true);
                } else if (!hasCheckedIn) {
                   setShowCheckInDialog(true);
                } else if (!hasCheckedOut) {
                   setShowCheckOutDialog(true);
                }
            }}
            disabled={!!(hasCheckedIn && hasCheckedOut)}
            className={`
                relative w-48 h-48 rounded-full shadow-2xl flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95
                ${incompleteAttendance ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-200' :
                  !hasCheckedIn ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-200' : 
                  !hasCheckedOut ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-200' : 
                  'bg-gray-100 text-gray-300 shadow-none cursor-not-allowed'}
            `}
          >
             {hasCheckedOut ? (
                 <>
                    <Calendar className="w-12 h-12 mb-2 text-gray-300" />
                    <span className="text-sm font-bold tracking-widest text-gray-400">SELESAI</span>
                 </>
             ) : (
                <>
                {incompleteAttendance ? <LogOut className="w-12 h-12 text-white mb-2" /> :
                  !hasCheckedIn ? <LogIn className="w-12 h-12 text-white mb-2" /> :
                    <LogOut className="w-12 h-12 text-white mb-2" />}
                <span className="text-md font-bold tracking-widest text-white uppercase">
                  {incompleteAttendance ? 'PULANG (KEMARIN)' : !hasCheckedIn ? 'MASUK' : 'PULANG'}
                </span>
                <span className="text-[10px] text-white/80 mt-1 font-medium">Klik untuk absen</span>
              </>
            )}
          </button>
      </div>
      {/* Monthly Statistics - Compact */}
      {stats && (
        <div className="px-6 mb-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">Statistik Bulan Ini</h3>
            <div className="grid grid-cols-5 gap-2">
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100/50">
                <p className="text-xl font-bold text-green-600">{stats.total_hadir}</p>
                <p className="text-[10px] font-medium text-green-600/80 mt-0.5">Hadir</p>
              </div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100/50">
                <p className="text-xl font-bold text-blue-600">{stats.total_izin}</p>
                <p className="text-[10px] font-medium text-blue-600/80 mt-0.5">Izin</p>
              </div>
              <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100/50">
                <p className="text-xl font-bold text-yellow-600">{stats.total_sakit}</p>
                <p className="text-[10px] font-medium text-yellow-600/80 mt-0.5">Sakit</p>
              </div>
              <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100/50">
                <p className="text-xl font-bold text-red-600">{stats.total_alpha}</p>
                <p className="text-[10px] font-medium text-red-600/80 mt-0.5">Alpha</p>
              </div>
              <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100/50">
                <p className="text-xl font-bold text-purple-600">{stats.total_cuti}</p>
                <p className="text-[10px] font-medium text-purple-600/80 mt-0.5">Cuti</p>
              </div>
            </div>
        </div>
      )}

      {/* Recent History - Compact */}
      <div className="px-6 pb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-slate-800">Riwayat Terakhir</h3>
          </div>
          
          <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
              <p className="text-xs text-gray-400">Belum ada riwayat absensi</p>
            </div>
          ) : (
             history.map((item, idx) => (
                <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-50 flex flex-col items-center justify-center border border-slate-100">
                                <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">
                                    {format(new Date(item.tanggal), 'MMM')}
                                </span>
                                <span className="text-sm font-bold text-slate-700 leading-none">
                                    {format(new Date(item.tanggal), 'dd')}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-800">
                                    {format(new Date(item.tanggal), 'EEEE', { locale: id })}
                                </p>
                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                    {item.check_in_time ? formatTime(new Date(item.check_in_time)) : '-'} - {item.check_out_time ? formatTime(new Date(item.check_out_time)) : '-'}
                                </p>
                            </div>
                        </div>
                        {getStatusBadge(item.status)}
                    </div>
                    {item.check_in_keterangan && (
                        <div className="pl-[52px]">
                            <p className="text-[10px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                                "{item.check_in_keterangan}"
                            </p>
                        </div>
                    )}
                </div>
             ))
          )}
          </div>
      </div>

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
