'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, X } from 'lucide-react';
import { startCamera, stopCamera, capturePhoto, isCameraSupported } from '@/lib/utils/camera';
import { alert } from '@/lib/utils/sweetalert';

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
      alert.error('Gagal Ambil Foto', 'Gagal mengambil foto');
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
    <div className="space-y-6">
      {/* Camera Preview Card */}
      <div className="relative max-w-[400px] mx-auto">
        {/* Main Camera/Photo Container */}
        <div className="relative aspect-square bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
          {!capturedPhoto ? (
            <>
              {/* Live Video Feed */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                autoPlay
                playsInline
                muted
              />
              
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-sm">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <Camera className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-white font-medium mt-4">Mengaktifkan Kamera</p>
                  <p className="text-slate-400 text-sm mt-1">Mohon tunggu sebentar...</p>
                </div>
              )}
              
              {/* Waiting State */}
              {!isLoading && !stream && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <Camera className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-white font-medium">Memuat Kamera</p>
                  <p className="text-slate-400 text-xs mt-2 text-center px-6">
                    Jika tidak muncul, periksa izin kamera Anda
                  </p>
                </div>
              )}
              
              {/* Error State */}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-red-900/95 to-red-800/95">
                  <div className="w-20 h-20 bg-red-800/50 rounded-full flex items-center justify-center mb-4">
                    <span className="text-4xl">📷</span>
                  </div>
                  <p className="text-white font-bold text-lg mb-2">Kamera Tidak Tersedia</p>
                  <p className="text-red-200 text-sm text-center px-6 max-w-xs">
                    {error}
                  </p>
                  <div className="mt-4 bg-red-800/30 px-4 py-2 rounded-lg">
                    <p className="text-red-100 text-xs text-center">
                      💡 Berikan izin akses kamera di browser
                    </p>
                  </div>
                </div>
              )}
              
              {/* Face Guide Overlay - Only show when camera is active */}
              {!capturedPhoto && !isLoading && !error && stream && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Top gradient fade */}
                  <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
                  
                  {/* Bottom gradient fade */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Face Guide Frame */}
                  <div className="relative w-48 h-52">
                    {/* Corner Markers */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-emerald-400 rounded-tl-2xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-emerald-400 rounded-tr-2xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-emerald-400 rounded-bl-2xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-emerald-400 rounded-br-2xl" />
                    
                    {/* Center dashed border */}
                    <div className="absolute inset-0 border-2 border-dashed border-emerald-400/50 rounded-3xl" />
                  </div>
                  
                  {/* Top Instruction */}
                  <div className="absolute top-6 left-0 right-0 text-center">
                    <div className="inline-block bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                      <p className="text-white text-sm font-medium">📸 Posisikan Wajah Anda</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Captured Photo */}
              <img
                src={capturedPhoto}
                alt="Foto Anda"
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              
              {/* Success Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              
              {/* Success Badge */}
              <div className="absolute top-6 left-0 right-0 flex justify-center pointer-events-none">
                <div className="bg-emerald-500 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-white font-bold text-sm">Foto Berhasil Diambil</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Instructions Message */}
      {!error && (
        <div className={`text-center p-4 rounded-xl transition-all ${
          capturedPhoto 
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
        }`}>
          {!capturedPhoto ? (
            <div className="space-y-1">
              <p className="text-blue-700 dark:text-blue-300 font-medium text-sm">
                Pastikan wajah terlihat jelas.
              </p>
              <p className="text-blue-600/70 dark:text-blue-400/70 text-xs">
                Posisikan wajah di dalam frame dan pastikan pencahayaan cukup
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-emerald-700 dark:text-emerald-300 font-medium text-sm">
                Foto terlihat bagus!
              </p>
              <p className="text-emerald-600/70 dark:text-emerald-400/70 text-xs">
                Periksa kembali foto sebelum melanjutkan
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!capturedPhoto ? (
          <>
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 h-12 border-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="mr-2 h-5 w-5" />
              <span className="font-semibold">Batal</span>
            </Button>
            <Button
              onClick={handleCapturePhoto}
              disabled={isLoading || !stream || !!error}
              className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Camera className="mr-2 h-5 w-5" />
              <span className="font-bold">Ambil Foto</span>
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={handleRetake}
              className="flex-1 h-12 border-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              <span className="font-semibold">Foto Ulang</span>
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30"
            >
              <span className="text-lg mr-2">✓</span>
              <span className="font-bold">Gunakan Foto</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
