'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CameraCapture } from './CameraCapture';
import { createClient } from '@/app/lib/supabase/client';
import { uploadAttendancePhoto, formatTime } from '@/lib/utils/camera';
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

      // Insert absensi record (without keterangan)
      const { error: insertError } = await supabase
        .from('absensi')
        .insert({
          user_id: user.id,
          tanggal: new Date().toISOString().split('T')[0],
          check_in_time: new Date().toISOString(),
          check_in_photo_url: photoPath,
          status: 'hadir',
        });

      if (insertError) {
        // If already checked in today
        if (insertError.code === '23505') {
          toast.error('Anda sudah melakukan check-in hari ini');
        } else {
          toast.error('Gagal melakukan check-in: ' + insertError.message);
        }
        return;
      }

      toast.success('Check-in berhasil!', {
        description: `Waktu: ${formatTime(new Date())}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">📸 Check-in</DialogTitle>
          <DialogDescription>
            Ambil foto selfie untuk check-in
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Time Display */}
          <div className="bg-muted p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Waktu Check-in</p>
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
              Menyimpan check-in...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
