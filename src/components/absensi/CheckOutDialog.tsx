'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CameraCapture } from './CameraCapture';
import { createClient } from '@/app/lib/supabase/client';
import { uploadAttendancePhoto, formatTime, calculateWorkDuration } from '@/lib/utils/camera';
import { toast } from 'sonner';
import { Loader2, Clock } from 'lucide-react';

interface CheckOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  checkInTime: string; // ISO string
}

export function CheckOutDialog({ open, onOpenChange, onSuccess, checkInTime }: CheckOutDialogProps) {
  const supabase = createClient();
  const [step, setStep] = useState<'keterangan' | 'camera'>('keterangan');
  const [keterangan, setKeterangan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime] = useState(new Date());
  const checkInDate = new Date(checkInTime);

  const workDuration = calculateWorkDuration(checkInDate, currentTime);

  const handleNext = () => {
    if (!keterangan.trim()) {
      toast.error('Mohon isi keterangan kegiatan hari ini');
      return;
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

      // Update absensi record with keterangan
      const { error: updateError } = await supabase
        .from('absensi')
        .update({
          check_out_time: new Date().toISOString(),
          check_out_photo_url: photoPath,
          check_in_keterangan: keterangan, // Save keterangan here
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('tanggal', new Date().toISOString().split('T')[0]);

      if (updateError) {
        toast.error('Gagal melakukan check-out: ' + updateError.message);
        return;
      }

      toast.success('Check-out berhasil!', {
        description: `Durasi kerja: ${workDuration}`,
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset state
      setStep('keterangan');
      setKeterangan('');
    } catch (error) {
      console.error('Check-out error:', error);
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
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">📸 Check-out</DialogTitle>
          <DialogDescription>
            {step === 'keterangan' ? 'Isi keterangan kegiatan hari ini' : 'Ambil foto selfie untuk check-out'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Work Duration Display */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Check-in</span>
              <span className="font-medium">{formatTime(checkInDate)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Check-out</span>
              <span className="font-medium">{formatTime(currentTime)}</span>
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
              {/* Keterangan Input */}
              <div className="space-y-2">
                <Label htmlFor="keterangan">Keterangan Kegiatan Hari Ini</Label>
                <Textarea
                  id="keterangan"
                  placeholder="Contoh: Menyelesaikan laporan bulanan, meeting dengan klien, dll..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Jelaskan kegiatan atau pekerjaan yang telah Anda lakukan hari ini
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
                  Menyimpan check-out...
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
