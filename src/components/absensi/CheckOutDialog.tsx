'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CameraCapture } from './CameraCapture';
import { createClient } from '@/app/lib/supabase/client';
import { uploadAttendancePhoto, formatTime, calculateWorkDuration } from '@/lib/utils/camera';
import { toast } from 'sonner';
import { Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface CheckOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  checkInTime: string; // ISO string
  attendanceDate?: string; // YYYY-MM-DD, optional for past checkout
}

export function CheckOutDialog({ open, onOpenChange, onSuccess, checkInTime, attendanceDate }: CheckOutDialogProps) {
  const supabase = createClient();
  const [step, setStep] = useState<'keterangan' | 'camera'>('keterangan');
  const [keterangan, setKeterangan] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Calculate checkout date/time
  // If attendanceDate is provided, we are fixing a past record.
  const isPastCheckout = !!attendanceDate;
  
  const checkInDate = new Date(checkInTime);

  // Update current time for display only if NOT manual mode
  useEffect(() => {
    if (!isPastCheckout) {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isPastCheckout]);

  // Derived effective checkout time for display/calculation
  const getEffectiveCheckoutTime = () => {
    if (isPastCheckout && manualTime) {
      const [hours, minutes] = manualTime.split(':').map(Number);
      const date = new Date(attendanceDate!);
      date.setHours(hours, minutes);
      return date;
    }
    return currentTime;
  };

  const effectiveCheckoutTime = getEffectiveCheckoutTime();
  const workDuration = calculateWorkDuration(checkInDate, effectiveCheckoutTime);

  const handleNext = () => {
    if (!keterangan.trim()) {
      toast.error('Mohon isi keterangan kegiatan hari ini');
      return;
    }

    if (isPastCheckout) {
      if (!manualTime) {
        toast.error('Mohon isi jam pulang');
        return;
      }
      
      // Validate time
      const [hours, minutes] = manualTime.split(':').map(Number);
      const checkoutDate = new Date(attendanceDate!);
      checkoutDate.setHours(hours, minutes);
      
      if (checkoutDate <= checkInDate) {
        toast.error('Jam pulang harus lebih besar dari jam masuk (' + formatTime(checkInDate) + ')');
        return;
      }
    }

    setStep('camera');
  };

  const handleBack = () => {
    setStep('keterangan');
  };

  const handlePhotoCapture = async (photoDataUrl: string) => {
    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      // Upload photo
      const photoPath = await uploadAttendancePhoto(
        supabase,
        user.id,
        photoDataUrl,
        'check-out'
      );

      // Determine checkout time to save
      let finalCheckOutTime = new Date().toISOString();
      if (isPastCheckout && manualTime) {
        const [hours, minutes] = manualTime.split(':').map(Number);
        const date = new Date(attendanceDate!);
        date.setHours(hours, minutes);
        finalCheckOutTime = date.toISOString();
      }

      // Updated fields
      const updates = {
        check_out_time: finalCheckOutTime,
        check_out_photo_url: photoPath,
        check_in_keterangan: keterangan,
        updated_at: new Date().toISOString(),
      };

      // Determine date to update
      const targetDate = attendanceDate || new Date().toISOString().split('T')[0];

      const { error: updateError } = await supabase
        .from('absensi')
        .update(updates)
        .eq('user_id', user.id)
        .eq('tanggal', targetDate);

      if (updateError) {
        toast.error('Gagal melakukan absen pulang: ' + updateError.message);
        return;
      }

      toast.success(isPastCheckout ? 'Absen pulang susulan berhasil!' : 'Absen pulang berhasil!', {
        description: `Durasi kerja: ${workDuration}`,
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset state
      setStep('keterangan');
      setKeterangan('');
      setManualTime('');
    } catch (error) {
      console.error('Pulang error:', error);
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (step === 'camera') {
      handleBack();
    } else {
      onOpenChange(false);
      setStep('keterangan');
      setKeterangan('');
      setManualTime('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isPastCheckout ? '🕒 Absen Pulang Susulan' : '📸 Pulang'}
          </DialogTitle>
          <DialogDescription>
            {isPastCheckout 
              ? `Lengkapi data pulang untuk tanggal ${format(new Date(attendanceDate!), 'dd MMMM yyyy', { locale: id })}`
              : step === 'keterangan' ? 'Isi keterangan kegiatan hari ini' : 'Ambil foto selfie untuk pulang'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Work Duration Display */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Masuk</span>
              <span className="font-medium flex items-center gap-2">
                {formatTime(checkInDate)}
                {isPastCheckout && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({format(checkInDate, 'dd MMM')})
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pulang</span>
              <span className="font-medium">
                {isPastCheckout && !manualTime ? '--:--' : formatTime(effectiveCheckoutTime)}
              </span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Durasi Kerja
                </span>
                <span className="text-lg font-bold text-primary">{workDuration}</span>
              </div>
            </div>
          </div>

          {step === 'keterangan' ? (
            <>
              {isPastCheckout && (
                <div className="space-y-2">
                  <Label htmlFor="manual-time" className="text-orange-600 dark:text-orange-400 font-medium">
                    Jam Berapa Anda Pulang?
                  </Label>
                  <Input
                    id="manual-time"
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="text-lg font-bold"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: HH:MM (Contoh: 17:30)
                  </p>
                </div>
              )}

              {/* Keterangan Input */}
              <div className="space-y-2">
                <Label htmlFor="keterangan">Keterangan Kegiatan</Label>
                <Textarea
                  id="keterangan"
                  placeholder="Contoh: Menyelesaikan laporan bulanan, meeting dengan klien, dll..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Jelaskan kegiatan atau pekerjaan yang telah Anda lakukan
                </p>
              </div>

              {/* Next Button */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Lanjut ke Foto →
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Camera Capture */}
              <CameraCapture
                onCapture={handlePhotoCapture}
                onCancel={handleCancel}
              />

              {isSubmitting && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan data pulang...
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
