'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CameraCapture } from './CameraCapture';
import { createClient } from '@/lib/supabase/client';
import { uploadAttendancePhoto, formatTime } from '@/lib/utils/camera';
import { getCheckInStatus, isWednesday } from '@/lib/utils/attendance-utils';
import { alert } from '@/lib/utils/sweetalert';
import { Loader2 } from 'lucide-react';

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CheckInDialog({ open, onOpenChange, onSuccess }: CheckInDialogProps) {
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime] = useState(new Date());

  const [checkingStatus, setCheckingStatus] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  // VALIDASI SAAT DIALOG DIBUKA (PRE-CHECK)

  
  useEffect(() => {
    if (open) {
      checkLeaveStatus();
    }
  }, [open]);

  const checkLeaveStatus = async () => {
    setCheckingStatus(true);
    setBlockReason(null); // Reset state fresh for new check
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      
      const { data: allRequests, error } = await supabase
        .from('pengajuan_izin')
        .select('jenis, tanggal_mulai, tanggal_selesai, status')
        .eq('user_id', user.id);
        
      if (allRequests) {
         // Filter JS
         const activeLeave = allRequests.find(req => {
            const isApproved = req.status?.toLowerCase() === 'disetujui';
            const inRange = todayDate >= req.tanggal_mulai && todayDate <= req.tanggal_selesai;
            return isApproved && inRange;
         });

         if (activeLeave) {
            setBlockReason(`Anda sedang cuti/izin: ${activeLeave.jenis.toUpperCase()} (${activeLeave.tanggal_mulai} s/d ${activeLeave.tanggal_selesai})`);
         }
      }
    } catch (e) {
      console.error("Error pre-check:", e);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handlePhotoCapture = async (photoDataUrl: string) => {
    // Double check (redundant but safe)
    if (blockReason) {
       alert.error("Gagal", blockReason);
       return;
    }
    
    setIsSubmitting(true);
    // ... rest of existing logic ...

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert.error('Login diperlukan', 'Anda harus login terlebih dahulu');
        return;
      }

    // Upload photo
    const photoPath = await uploadAttendancePhoto(
      supabase,
      user.id,
      photoDataUrl,
      'check-in'
    );

      // Determine status based on day
      const today = new Date();
      const status = getCheckInStatus(today);

      // Insert absensi record (without keterangan)
      // Use Jakarta timezone for date to avoid UTC timezone issues during early morning
      const jakartaDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      
      const { error: insertError } = await supabase
        .from('absensi')
        .insert({
          user_id: user.id,
          tanggal: jakartaDate,
          check_in_time: new Date().toISOString(),
          check_in_photo_url: photoPath,
          status: status,
        });

      if (insertError) {
        // If already checked in today
        if (insertError.code === '23505') {
          alert.attendanceError('Absensi Gagal!', 'Anda sudah melakukan absen masuk hari ini.');
        } else {
          alert.attendanceError('Absensi Gagal!', 'Terjadi kesalahan saat melakukan absensi. Silakan pastikan koneksi internet stabil.');
        }
        return;
      }

      const successMessage = status === 'lembur' 
        ? 'Absensi Berhasil!' 
        : 'Absensi Berhasil!';
      
      const description = status === 'lembur'
        ? `Hari libur - Dihitung sebagai lembur. Absensi masuk tercatat pada jam <strong>${formatTime(new Date())}</strong>`
        : `Absensi masuk tercatat pada jam <strong>${formatTime(new Date())}</strong>`;

      alert.attendanceSuccess(formatTime(new Date()), description);

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Masuk error:', error);
      alert.attendanceError('Absensi Gagal!', 'Terjadi kesalahan saat melakukan absensi. Silakan pastikan koneksi internet stabil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        {checkingStatus ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <DialogTitle className="sr-only">Memeriksa Status</DialogTitle>
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="text-sm font-medium text-slate-500 animate-pulse">Tunggu Sebentar...</p>
          </div>
        ) : blockReason ? (
          <div className="relative overflow-hidden rounded-lg">
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-rose-100/50 dark:bg-rose-900/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-100/50 dark:bg-red-900/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />

             <div className="relative z-10 flex flex-col items-center text-center p-4 pt-8 pb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-900/20 rounded-full flex items-center justify-center mb-6 shadow-md border border-red-100 dark:border-red-900/30">
                  <span className="text-5xl drop-shadow-sm">🏖️</span>
                </div>

                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-2">
                  Anda sedang cuti/izin
                </DialogTitle>
                
                <DialogDescription className="text-slate-500 text-sm mb-6 max-w-[260px] mx-auto">
                  Saat ini anda sedang dalam masa cuti/izin. Absensi tidak dapat dilakukan.
                </DialogDescription>
                <button 
                   onClick={() => onOpenChange(false)}
                   className="w-32 py-3.5 bg-red-500 border border-slate-200 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.98] cursor-pointer"
                >
                   Tutup
                </button>
             </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">📸 Masuk</DialogTitle>
              <DialogDescription>
                Ambil foto selfie untuk masuk
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Wednesday Holiday Banner */}
              {isWednesday(currentTime) && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                        Hari Libur (Rabu)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Check-in hari ini akan dihitung sebagai <span className="font-semibold text-orange-600">lembur</span>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Time Display */}
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Waktu Masuk</p>
                <p className="text-2xl font-bold">{formatTime(currentTime)}</p>
              </div>

              {/* Camera Capture */}
              <CameraCapture
                onCapture={handlePhotoCapture}
                onCancel={() => onOpenChange(false)}
              />

              {isSubmitting && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan data masuk...
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
