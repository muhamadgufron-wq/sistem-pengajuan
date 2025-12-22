"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

interface ProofFile {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
}

interface ProofGalleryProps {
  files: ProofFile[];
  baseUrl?: string;
}

export default function ProofGallery({ files, baseUrl = "/api/bukti-reimbursement/" }: ProofGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Tidak ada bukti yang diupload
      </div>
    );
  }

  const goToPrevious = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex < files.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const getFileUrl = (filePath: string) => {
    return `${baseUrl}${filePath}`;
  };

  const isPdf = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.pdf');
  };

  const currentFile = files[selectedIndex];

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex justify-between items-start">
          <div className="text-white">
            <p className="font-medium">{currentFile.file_name}</p>
            <p className="text-sm text-gray-300">
              {(currentFile.file_size / 1024).toFixed(1)} KB • {selectedIndex + 1} / {files.length}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={() => window.open(getFileUrl(currentFile.file_path), '_blank')}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Image/PDF Content */}
      <div className="min-h-[60vh] max-h-[70vh] flex items-center justify-center p-4">
        {isPdf(currentFile.file_name) ? (
          <div className="w-full h-full">
            <iframe
              src={getFileUrl(currentFile.file_path)}
              className="w-full h-full rounded"
              title={currentFile.file_name}
            />
          </div>
        ) : (
          <img
            src={getFileUrl(currentFile.file_path)}
            alt={currentFile.file_name}
            className="max-w-full max-h-[65vh] object-contain rounded"
          />
        )}
      </div>

      {/* Navigation Arrows */}
      {files.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
            onClick={goToPrevious}
            disabled={selectedIndex === 0}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
            onClick={goToNext}
            disabled={selectedIndex === files.length - 1}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* Thumbnail Navigation at Bottom */}
      {files.length > 1 && (
        <div className="bg-black/50 p-3">
          <div className="flex gap-2 overflow-x-auto justify-center">
            {files.map((file, index) => (
              <button
                key={file.id}
                onClick={() => setSelectedIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                  index === selectedIndex 
                    ? 'border-primary scale-110' 
                    : 'border-gray-500 opacity-60 hover:opacity-100'
                }`}
              >
                {isPdf(file.file_name) ? (
                  <div className="w-full h-full flex items-center justify-center bg-red-50">
                    <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 18h12V6h-4V2H4v16zm-2 1V0h12l4 4v16H2v-1z"/>
                    </svg>
                  </div>
                ) : (
                  <img
                    src={getFileUrl(file.file_path)}
                    alt={file.file_name}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
