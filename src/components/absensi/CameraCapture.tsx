'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, X } from 'lucide-react';
import { startCamera, stopCamera, capturePhoto, isCameraSupported } from '@/lib/utils/camera';
import { toast } from 'sonner';

interface CameraCaptureProps {
  onCapture: (photoDataUrl: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check camera support
    if (!isCameraSupported()) {
      setError('Browser Anda tidak mendukung akses kamera');
      return;
    }

    // Start camera on mount
    handleStartCamera();

    // Cleanup on unmount
    return () => {
      if (stream) {
        stopCamera(stream);
      }
    };
  }, []);

  // Restart camera when photo is cleared (retake)
  useEffect(() => {
    if (capturedPhoto === null && videoRef.current && !stream) {
      handleStartCamera();
    }
  }, [capturedPhoto]);

  const handleStartCamera = async () => {
    if (!videoRef.current) return;

    setIsLoading(true);
    setError(null);
    try {
      const mediaStream = await startCamera(videoRef.current);
      setStream(mediaStream);
    } catch (err) {
      console.error('Camera error:', err);
      setError(err instanceof Error ? err.message : 'Gagal mengakses kamera. Pastikan izin diberikan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    try {
      const photoDataUrl = capturePhoto(videoRef.current);
      setCapturedPhoto(photoDataUrl);

      // Stop camera after capture
      if (stream) {
        stopCamera(stream);
        setStream(null);
      }
    } catch (error) {
      toast.error('Gagal mengambil foto');
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-4">
           {error}
           <div className="mt-2 text-xs text-red-500">
               Pastikan Anda memberikan izin akses kamera di browser.
           </div>
        </div>
      )}

      {/* Camera Preview or Captured Photo */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {!capturedPhoto ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              autoPlay
              playsInline
              muted
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-white">Membuka kamera...</div>
              </div>
            )}
             {!isLoading && !stream && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                   <div className="text-white text-sm text-center px-4">
                     Menunggu kamera...<br/>
                     <span className="text-xs text-gray-400">Jika tidak muncul, muat ulang halaman.</span>
                   </div>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                   <div className="text-red-400 text-3xl font-bold">📷🚫</div>
                </div>
            )}
          </>
        ) : (
          <img
            src={capturedPhoto}
            alt="Captured"
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}

        {/* Camera Guide Overlay */}
        {!capturedPhoto && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white/50 rounded-full w-48 h-48" />
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-muted-foreground">
        {!capturedPhoto && !error ? (
          <p>📸 Posisikan wajah Anda di dalam lingkaran</p>
        ) : capturedPhoto ? (
          <p>✅ Foto berhasil diambil. Periksa kembali sebelum melanjutkan.</p>
        ) : null}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!capturedPhoto ? (
          <>
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              Batal
            </Button>
            <Button
              onClick={handleCapturePhoto}
              disabled={isLoading || !stream || !!error}
              className="flex-1"
            >
              <Camera className="mr-2 h-4 w-4" />
              Ambil Foto
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={handleRetake}
              className="flex-1"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Ambil Ulang
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              ✓ Gunakan Foto Ini
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
