'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { alert } from '@/lib/utils/sweetalert';
import { Upload, X, FileImage, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface UploadedFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  preview?: string;
}

interface MultiFileUploadProps {
  pengajuanId: number;
  existingFiles?: UploadedFile[];
  onUploadComplete?: () => void;
}

export default function MultiFileUpload({ 
  pengajuanId, 
  existingFiles = [],
  onUploadComplete 
}: MultiFileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate total file count
    const totalFiles = files.length + existingFiles.length + acceptedFiles.length;
    if (totalFiles > MAX_FILES) {
      alert.error(
        `Maksimal ${MAX_FILES} file`,
        `Anda sudah memiliki ${existingFiles.length} file. Hanya bisa upload ${MAX_FILES - existingFiles.length - files.length} file lagi.`
      );
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    const filePreviews: string[] = [];

    acceptedFiles.forEach(file => {
      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert.error(
          `File ${file.name} ditolak`,
          'Hanya file gambar (JPG, PNG, WebP) yang diperbolehkan'
        );
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        alert.error(
          `File ${file.name} terlalu besar`,
          `Ukuran maksimal 5MB. File ini ${(file.size / 1024 / 1024).toFixed(2)}MB`
        );
        return;
      }

      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        filePreviews.push(reader.result as string);
        if (filePreviews.length === validFiles.length) {
          setPreviews(prev => [...prev, ...filePreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setFiles(prev => [...prev, ...validFiles]);
  }, [files, existingFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: MAX_FILES,
    disabled: isUploading
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert.error('Pilih file terlebih dahulu');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('pengajuan_id', pengajuanId.toString());
      
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/bukti-laporan/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      alert.success(
        'Upload berhasil!',
        result.message
      );

      // Show errors if any
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err: any) => {
          alert.error(`${err.fileName}: ${err.error}`);
        });
      }

      // Clear files
      setFiles([]);
      setPreviews([]);
      setUploadProgress(100);

      // Callback
      if (onUploadComplete) {
        onUploadComplete();
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      alert.error(
        'Upload gagal',
        error.message
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-sm text-primary font-medium">Lepaskan file di sini...</p>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Klik atau drag & drop file di sini
            </p>
            <p className="text-xs text-gray-500">
              Maksimal {MAX_FILES} file, masing-masing max 5MB (JPG, PNG, WebP)
            </p>
            <p className="text-xs text-gray-400 mt-2">
              File yang sudah ada: {existingFiles.length} | Tersisa: {MAX_FILES - existingFiles.length - files.length}
            </p>
          </div>
        )}
      </div>

      {/* File Previews */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">File yang akan diupload ({files.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {files.map((file, index) => (
              <Card key={index} className="relative p-2">
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </button>
                {previews[index] ? (
                  <img
                    src={previews[index]}
                    alt={file.name}
                    className="w-full h-32 object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                    <FileImage className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-2 truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(file.size)}
                </p>
              </Card>
            ))}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-center text-gray-500">Mengupload...</p>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengupload...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {files.length} File
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
