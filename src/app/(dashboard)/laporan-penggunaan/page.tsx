'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/app/lib/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Upload, FileImage, Trash2, ExternalLink } from 'lucide-react';
import MultiFileUpload from '@/components/laporan/MultiFileUpload';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface PengajuanUang {
  id: number;
  keperluan: string;
  jumlah_uang: number;
  jumlah_disetujui: number | null;
  created_at: string;
  status: string;
}

interface BuktiFile {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
}

export default function LaporanPenggunaanPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [pengajuanList, setPengajuanList] = useState<PengajuanUang[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPengajuan, setSelectedPengajuan] = useState<PengajuanUang | null>(null);
  const [buktiFiles, setBuktiFiles] = useState<BuktiFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  /* State untuk Submission Status */
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(true);

  useEffect(() => {
    fetchApprovedPengajuan();
    fetchSubmissionStatus();
  }, []);

  const fetchSubmissionStatus = async () => {
    try {
        const res = await fetch('/api/settings/submission-status');
        const data = await res.json();
        if (data.success) {
            setIsSubmissionOpen(data.isOpen);
        }
    } catch (error) {
        console.error("Failed to fetch settings", error);
    }
  };

  const fetchApprovedPengajuan = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Handle unauthenticated state if necessary
        return;
      }

      const { data, error } = await supabase
        .from('pengajuan_uang')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved_keuangan')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Gagal mengambil data pengajuan');
        console.error(error);
      } else {
        setPengajuanList(data || []);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const openUploadDialog = async (pengajuan: PengajuanUang) => {
    setSelectedPengajuan(pengajuan);
    await fetchBuktiFiles(pengajuan.id);
  };

  const fetchBuktiFiles = async (pengajuanId: number) => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch(`/api/bukti-laporan/${pengajuanId}`);
      const result = await response.json();

      if (response.ok) {
        setBuktiFiles(result.files || []);
      } else {
        toast.error('Gagal memuat bukti', { description: result.error });
      }
    } catch (error: any) {
      toast.error('Terjadi kesalahan', { description: error.message });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleDeleteFile = async (fileId: string, pengajuanId: number) => {
    if (!confirm('Yakin ingin menghapus file ini?')) return;

    try {
      const response = await fetch(`/api/bukti-laporan/${pengajuanId}?fileId=${fileId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('File berhasil dihapus');
        await fetchBuktiFiles(pengajuanId);
      } else {
        toast.error('Gagal menghapus file', { description: result.error });
      }
    } catch (error: any) {
      toast.error('Terjadi kesalahan', { description: error.message });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laporan Penggunaan Uang</h1>
            <p className="text-sm text-gray-600 mt-1">
              Upload bukti penggunaan untuk pengajuan yang telah disetujui
            </p>
          </div>
          <div className="flex gap-2">
            {!isSubmissionOpen && (
                <div className="bg-red-100 text-red-700 px-4 py-2 rounded-md text-sm font-medium flex items-center">
                    Pengajuan sedang ditutup sementara.
                </div>
            )}
            <Link href={isSubmissionOpen ? "/laporan-penggunaan/buat" : "#"}>
              <Button disabled={!isSubmissionOpen}>
                <Upload className="mr-2 h-4 w-4" />
                Buat Laporan
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
              </Button>
            </Link>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-12">
            <LoadingSpinner />
          </div>
        ) : pengajuanList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Belum ada pengajuan yang disetujui
              </h3>
              <p className="text-sm text-gray-500">
                Pengajuan uang yang telah disetujui akan muncul di sini
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pengajuanList.map((pengajuan) => (
              <Card key={pengajuan.id} className="hover:shadow-md transition-shadow flex flex-col h-full">
                <CardHeader className="flex-1">
                  <div className="flex flex-col h-full justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg line-clamp-2" title={pengajuan.keperluan}>
                        {pengajuan.keperluan}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            Rp {Number(pengajuan.jumlah_disetujui || pengajuan.jumlah_uang).toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs">
                            Disetujui: {formatDate(pengajuan.created_at)}
                          </p>
                        </div>
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => openUploadDialog(pengajuan)}
                      size="sm"
                      className="w-full mt-auto"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Bukti
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={!!selectedPengajuan} onOpenChange={(open) => !open && setSelectedPengajuan(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Bukti Laporan</DialogTitle>
              <DialogDescription>
                {selectedPengajuan?.keperluan} - Rp {Number(selectedPengajuan?.jumlah_disetujui || selectedPengajuan?.jumlah_uang).toLocaleString('id-ID')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Existing Files */}
              {isLoadingFiles ? (
                <p className="text-sm text-gray-500 text-center">Memuat bukti...</p>
              ) : buktiFiles.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Bukti yang sudah diupload ({buktiFiles.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {buktiFiles.map((file) => (
                      <Card key={file.id} className="relative p-2">
                        <button
                          onClick={() => handleDeleteFile(file.id, selectedPengajuan!.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
                          title="Hapus file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div
                          className="cursor-pointer"
                          onClick={() => setViewingImage(`/api/bukti/${file.file_path}`)}
                        >
                          <img
                            src={`/api/bukti/${file.file_path}`}
                            alt={file.file_name}
                            className="w-full h-32 object-cover rounded"
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-2 truncate" title={file.file_name}>
                          {file.file_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatFileSize(file.file_size)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(file.uploaded_at)}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Belum ada bukti yang diupload
                </p>
              )}

              {/* Upload Component */}
              {selectedPengajuan && buktiFiles.length < 5 && (
                <div className="border-t pt-6">
                  <MultiFileUpload
                    pengajuanId={selectedPengajuan.id}
                    existingFiles={buktiFiles.map(f => ({
                      id: f.id,
                      fileName: f.file_name,
                      filePath: f.file_path,
                      fileSize: f.file_size
                    }))}
                    onUploadComplete={() => fetchBuktiFiles(selectedPengajuan.id)}
                  />
                </div>
              )}

              {buktiFiles.length >= 5 && (
                <p className="text-sm text-amber-600 text-center py-4">
                  Maksimal 5 file sudah tercapai. Hapus file yang ada untuk upload yang baru.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Viewer Dialog */}
        <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Preview Bukti</DialogTitle>
            </DialogHeader>
            {viewingImage && (
              <div className="space-y-4">
                <img
                  src={viewingImage}
                  alt="Preview"
                  className="w-full h-auto max-h-[70vh] object-contain rounded"
                />
                <Button asChild variant="outline" className="w-full">
                  <a href={viewingImage} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Buka di tab baru
                  </a>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
