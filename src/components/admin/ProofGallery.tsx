'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BuktiFile {
  id: string;
  file_path: string;
  file_name: string;
}

interface ProofGalleryProps {
  pengajuanId: number;
}

export default function ProofGallery({ pengajuanId }: ProofGalleryProps) {
  const [files, setFiles] = useState<BuktiFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, [pengajuanId]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/bukti-laporan/${pengajuanId}`);
      const result = await response.json();
      if (response.ok) {
        setFiles(result.files || []);
      }
    } catch (err) {
      console.error('Error loading files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % files.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + files.length) % files.length);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Memuat...</div>;
  }

  if (files.length === 0) {
    return <div className="text-center py-8 text-gray-500">Belum ada bukti</div>;
  }

  const currentFile = files[currentIndex];
  const imageUrl = `/api/bukti/${currentFile.file_path}`;

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        <img
          src={imageUrl}
          alt="Bukti"
          className="w-full h-auto max-h-[50vh] object-contain"
        />

        {/* Navigation */}
        {files.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              {currentIndex + 1} / {files.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {files.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {files.map((file, index) => (
            <button
              key={file.id}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                index === currentIndex ? 'border-primary' : 'border-gray-300'
              }`}
            >
              <img
                src={`/api/bukti/${file.file_path}`}
                alt={`${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Action */}
      <Button asChild variant="outline" size="sm" className="w-full">
        <a href={imageUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-3 w-3" />
          Buka di tab baru
        </a>
      </Button>
    </div>
  );
}
