'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CameraCapture } from './CameraCapture';
import { createClient } from '@/lib/supabase/client';
import { uploadAttendancePhoto, formatTime } from '@/lib/utils/camera';
import { getCheckInStatus, isWednesday } from '@/lib/utils/attendance-utils';
import { toast } from 'sonner';
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
        'check-in'
      );

      // Determine status based on day
      const today = new Date();
      const status = getCheckInStatus(today);

      // Insert absensi record (without keterangan)
      const { error: insertError } = await supabase
        .from('absensi')
        .insert({
          user_id: user.id,
          tanggal: new Date().toISOString().split('T')[0],
          check_in_time: new Date().toISOString(),
          check_in_photo_url: photoPath,
          status: status,
        });

      if (insertError) {
        // If already checked in today
        if (insertError.code === '23505') {
          toast.error('Anda sudah melakukan absen masuk hari ini');
        } else {
          toast.error('Gagal melakukan absen masuk: ' + insertError.message);
        }
        return;
      }

      const successMessage = status === 'lembur' 
        ? 'Absen lembur berhasil!' 
        : 'Absen masuk berhasil!';
      
      const description = status === 'lembur'
        ? `Hari libur - Dihitung sebagai lembur | Waktu: ${formatTime(new Date())}`
        : `Waktu: ${formatTime(new Date())}`;

      toast.success(successMessage, {
        description: description,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Masuk error:', error);
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
      </DialogContent>
    </Dialog>
  );
}
