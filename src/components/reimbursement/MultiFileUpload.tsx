"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, FileImage, File as FileIcon } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/utils/image-compression";

interface MultiFileUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export default function MultiFileUpload({
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 5,
  acceptedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"],
}: MultiFileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File ${file.name}: Tipe file tidak didukung. Hanya JPG, PNG, dan PDF.`;
    }
    if (file.size > maxSizeBytes) {
      return `File ${file.name}: Ukuran file melebihi ${maxSizeMB}MB.`;
    }
    return null;
  };

  const generatePreview = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      } else {
        resolve(null);
      }
    });
  };

  const handleFiles = async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    if (files.length + fileArray.length > maxFiles) {
      toast.error(`Maksimal ${maxFiles} file`);
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: { [key: string]: string } = { ...previews };

    for (const file of fileArray) {
      let fileToProcess = file;
      
      // Compress if image
      if (file.type.startsWith('image/')) {
        try {
          const loadingToast = toast.loading(`Mengompres gambar ${file.name}...`);
          fileToProcess = await compressImage(file);
          toast.dismiss(loadingToast);
        } catch (error) {
          console.error("Compression failed:", error);
          toast.error(`Gagal mengompres ${file.name}, menggunakan file asli.`);
        }
      }

      const error = validateFile(fileToProcess);
      if (error) {
        toast.error(error);
        continue;
      }

      validFiles.push(fileToProcess);

      // Generate preview for images
      const preview = await generatePreview(fileToProcess);
      if (preview) {
        newPreviews[fileToProcess.name] = preview;
      }
    }

    const updatedFiles = [...files, ...validFiles];
    setFiles(updatedFiles);
    setPreviews(newPreviews);
    onFilesChange(updatedFiles);
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    const updatedFiles = files.filter((_, i) => i !== index);
    
    // Remove preview
    const updatedPreviews = { ...previews };
    delete updatedPreviews[fileToRemove.name];
    
    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onFilesChange(updatedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging 
            ? "border-primary bg-primary/5" 
            : "border-gray-300 hover:border-primary hover:bg-gray-50"
          }
        `}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-semibold text-primary">Klik untuk upload</span> atau drag & drop
        </p>
        <p className="text-xs text-gray-500">
          JPG, PNG, atau PDF (max. {maxSizeMB}MB per file, max. {maxFiles} files)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            File terpilih ({files.length}/{maxFiles})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-3 border rounded-lg bg-white"
              >
                {/* Preview or Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                  {previews[file.name] ? (
                    <img
                      src={previews[file.name]}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : file.type === "application/pdf" ? (
                    <FileIcon className="w-6 h-6 text-red-500" />
                  ) : (
                    <FileImage className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
