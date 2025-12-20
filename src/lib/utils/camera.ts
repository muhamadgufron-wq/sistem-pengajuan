// Utility functions untuk camera dan image processing

/**
 * Request camera permission dan start video stream
 */
export async function startCamera(videoElement: HTMLVideoElement): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user', // Front camera
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    videoElement.srcObject = stream;
    
    // Handle play() errors gracefully
    try {
      await videoElement.play();
    } catch (playError) {
      // Ignore AbortError - it's harmless and occurs during re-renders
      if (playError instanceof Error && playError.name !== 'AbortError') {
        throw playError;
      }
    }

    return stream;
  } catch (error) {
    console.error('Error accessing camera:', error);
    // Re-throw the original error for better error handling
    throw error;
  }
}

/**
 * Stop camera stream
 */
export function stopCamera(stream: MediaStream | null) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Capture photo from video element
 */
export function capturePhoto(videoElement: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Cannot get canvas context');
  }

  ctx.drawImage(videoElement, 0, 0);

  // Return as base64 data URL
  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Compress image to reduce file size
 */
export async function compressImage(
  dataUrl: string,
  maxWidth: number = 800,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Cannot get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed JPEG
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataUrl;
  });
}

/**
 * Convert data URL to Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Upload photo to Supabase Storage
 */
export async function uploadAttendancePhoto(
  supabase: any,
  userId: string,
  photoDataUrl: string,
  type: 'check-in' | 'check-out'
): Promise<string> {
  try {
    // Compress image first
    const compressedDataUrl = await compressImage(photoDataUrl, 800, 0.8);

    // Convert to blob
    const blob = dataUrlToBlob(compressedDataUrl);

    // Generate filename
    const timestamp = Date.now();
    const filename = `${userId}/${type}-${timestamp}.jpg`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('foto-absensi')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error('Gagal mengupload foto: ' + error.message);
    }

    return filename;
  } catch (error) {
    console.error('Error in uploadAttendancePhoto:', error);
    throw error;
  }
}

/**
 * Check if browser supports camera
 */
export function isCameraSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Format time untuk display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date untuk display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate work duration in hours
 */
export function calculateWorkDuration(checkIn: Date, checkOut: Date): string {
  const diff = checkOut.getTime() - checkIn.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours} jam ${minutes} menit`;
}
