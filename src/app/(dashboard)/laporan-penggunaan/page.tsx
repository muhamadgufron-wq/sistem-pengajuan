'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { alert } from '@/lib/utils/sweetalert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {   
  Upload,
  Camera, 
  CheckCircle2,
  ChevronLeft,
  Image as ImageIcon,
  ExternalLink,
  X 
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

// --- Interfaces ---
interface PengajuanUang {
  id: number;
  keperluan: string;
  jumlah_uang: number;
  jumlah_disetujui: number | null;
  created_at: string;
  user_id: string;
  status: string;
  has_proof?: boolean;
}

interface BuktiFile {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
}

// --- Main Component ---
export default function LaporanPenggunaanPage() {
  const supabase = createClient();
  const [view, setView] = useState<'list' | 'upload'>('list');
  const [activeTab, setActiveTab] = useState<'semua' | 'belum_diunggah' | 'menunggu'>('semua');
  
  // Data
  const [pengajuanList, setPengajuanList] = useState<PengajuanUang[]>([]);
  const [selectedPengajuan, setSelectedPengajuan] = useState<PengajuanUang | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [minLoading, setMinLoading] = useState(true);

  // Upload State
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<BuktiFile[]>([]); // Existing files from DB
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Fetch
  useEffect(() => {
    fetchData();
    const timer = setTimeout(() => {
        setMinLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch approved requests
      const { data: requests, error } = await supabase
        .from('pengajuan_uang')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'disetujui')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Check for existing proofs for each request to determine status
      // validasi: This is an N+1 query which is not ideal, but for tight deadlines valid.
      // Better: join query or fetch all proofs for these IDs.
      const requestsWithProofStatus = await Promise.all((requests || []).map(async (req) => {
        const { count } = await supabase
          .from('bukti_laporan_files') // Correct table name
          .select('*', { count: 'exact', head: true })
          .eq('pengajuan_uang_id', req.id); // Correct column name
        
        return { ...req, has_proof: (count || 0) > 0 };
      }));

      setPengajuanList(requestsWithProofStatus);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers ---

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  const handleOpenUpload = async (item: PengajuanUang) => {
    setSelectedPengajuan(item);
    setFiles([]); // Reset new files
    setPreviews([]);
    setNotes(''); // If notes are stored in DB, fetch them here
    
    // Fetch existing files for this request
    try {
      const response = await fetch(`/api/bukti-laporan/${item.id}`);
      if (response.ok) {
        const result = await response.json();
        setUploadedFiles(result.files || []);
      }
    } catch (error) {
      console.error("Error fetching existing files", error);
    }

    setView('upload');
  };

  const handleBack = () => {
    setView('list');
    setSelectedPengajuan(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // Validate types and size here if needed
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setFiles(prev => [...prev, ...newFiles]);
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveNewFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      // Revoke URL to prevent memory leaks
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUploadSubmit = async () => {
    if (!selectedPengajuan) return;
    if (files.length === 0 && uploadedFiles.length === 0) {
      alert.error('Mohon lampirkan bukti foto');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('pengajuan_id', selectedPengajuan.id.toString());
      files.forEach(file => formData.append('files', file));
      if (notes) formData.append('catatan', notes); // Needs backend support

      const response = await fetch('/api/bukti-laporan/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Upload failed');

      alert.success('Bukti berhasil diunggah');
      
      // Refresh list to update statuses
      await fetchData();
      setView('list');

    } catch (error: any) {
      alert.error('Gagal mengunggah bukti', error.message );
    } finally {
      setIsUploading(false);
    }
  };

  // --- Filtering ---
  const filteredList = pengajuanList.filter(item => {
    if (activeTab === 'semua') return true;
    if (activeTab === 'belum_diunggah') return !item.has_proof;
    if (activeTab === 'menunggu') return item.has_proof; // Assuming 'Menunggu' means uploaded but not verified
    return true;
  });

  // --- Render Helpers ---

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  // --- Views ---

  const RenderListView = () => (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-10">
        <div className="relative flex items-center justify-center mb-4 py-4 px-4">
          <Link href="/dashboard" className="absolute left-0">
            <Button variant="ghost" size="icon" className="-ml-2 text-gray-700">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Laporan Penggunaan</h1>
        </div>
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => handleTabChange('semua')}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === 'semua' 
                ? "bg-emerald-500 text-white" 
                : "bg-white border border-gray-200 text-gray-600"
            )}
          >
            Semua
          </button>
          <button
            onClick={() => handleTabChange('belum_diunggah')}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === 'belum_diunggah' 
                ? "bg-emerald-500 text-white" 
                : "bg-white border border-gray-200 text-gray-600"
            )}
          >
            Belum Laporan
          </button>
          <button
            onClick={() => handleTabChange('menunggu')}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === 'menunggu' 
                ? "bg-emerald-500 text-white" 
                : "bg-white border border-gray-200 text-gray-600"
            )}
          >
            Sudah Laporan
          </button>
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-4 flex-1">
        {isLoading || minLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Belum ada pengajuan</div>
        ) : (
          filteredList.map((item) => (
            <Card key={item.id} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-xl overflow-hidden cursor-pointer" onClick={() => handleOpenUpload(item)}>
              <CardContent className="p-4 flex justify-between items-center bg-white">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      PENGAJUAN UANG
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900">
                    {formatCurrency(item.jumlah_disetujui || item.jumlah_uang)}
                  </h3>
                  
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {item.keperluan}
                  </p>
                  
                  {item.has_proof && (
                     <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-700 hover:bg-blue-200 border-none font-normal">
                        Sudah Laporan
                     </Badge>
                  )}
                </div>

                <div>
                   {item.has_proof ? (
                      // Placeholder for thumbnail or status icon
                      <div className="h-12 w-16 bg-blue-100 rounded-md flex items-center justify-center">
                         <CheckCircle2 className="w-6 h-6 text-blue-500" />
                      </div>
                   ) : (
                      <Button 
                        size="sm" 
                        className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 shadow-lg rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenUpload(item);
                        }}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                   )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Bottom Nav Placeholder (optional if needed to match screenshot bottom bar) */}
      <div className="bg-white border-t p-4 flex justify-around text-gray-400 text-xs">
         {/* Assuming main layout handles footer, but if this page is standalone, add footer here */}
      </div>
    </div>
  );

  const RenderUploadView = () => {
     if (!selectedPengajuan) return null;

     return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col">
        
        {/* Header */}
        <div className="bg-white p-4 sticky top-0 z-10 border-b">
          <div className="relative flex items-center justify-center py-4 px-4">
             <Button variant="ghost" size="icon" onClick={handleBack} className="absolute left-0 text-gray-700">
               <ChevronLeft className="w-6 h-6" />
             </Button>
             <h1 className="text-xl font-bold text-gray-900">Upload Bukti Penggunaan</h1>
          </div>
        </div>

        <div className="p-4 space-y-6 flex-1 overflow-y-auto pb-24">
           {/* Info Card */}
           <Card className="rounded-xl border-none shadow-sm">
             <CardContent className="p-4 space-y-1">
               <div className="flex justify-between items-start py-2 border-b border-gray-100">
                 <span className="text-sm text-gray-500">Keperluan</span>
                 <span className="font-semibold text-gray-900 text-right max-w-[60%]">{selectedPengajuan.keperluan}</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-gray-100">
                 <span className="text-sm text-gray-500">Tanggal</span>
                 <span className="font-medium text-gray-900">
                    {new Date(selectedPengajuan.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                 </span>
               </div>
               <div className="flex justify-between items-center py-2">
                 <span className="text-sm text-gray-500">Nominal Disetujui</span>
                 <span className="font-semibold text-emerald-600">{formatCurrency(selectedPengajuan.jumlah_disetujui || selectedPengajuan.jumlah_uang)}</span>
               </div>
             </CardContent>
           </Card>

           {/* Upload Area */}
           <div className="border-2 border-dashed border-emerald-200 rounded-2xl p-6 bg-white text-center">
              <div className="flex justify-center gap-4 mb-4">
                 <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-emerald-600" />
                 </div>
                 <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-emerald-600" />
                 </div>
              </div>
              
              <h3 className="text-md font-bold text-gray-900 mb-1">Pilih atau Ambil Foto Bukti</h3>
              <p className="text-xs text-gray-500 mb-4">Format: JPG, PNG, PDF (Maks. 5MB)</p>
              
              <Button 
                variant="outline" 
                className="bg-emerald-50 text-emerald-600 border-none hover:bg-emerald-100 w-full rounded-xl h-10"
                onClick={() => fileInputRef.current?.click()}
              >
                Kamera atau Berkas
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileSelect}
              />
           </div>

           {/* Previews */}
           {(files.length > 0 || uploadedFiles.length > 0) && (
             <div className="grid grid-cols-2 gap-3">
               {uploadedFiles.map((file) => (
                 <div 
                  key={file.id} 
                  className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 cursor-pointer"
                  onClick={() => setViewingImage(`/api/bukti/${file.file_path}`)}
                 >
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={`/api/bukti/${file.file_path}`} alt="Bukti" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-2">
                      <span className="text-[10px] text-white truncate w-full">{file.file_name}</span>
                    </div>
                    <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5">
                       <CheckCircle2 className="w-3 h-3" />
                    </div>
                 </div>
               ))}
               {previews.map((preview, index) => (
                 <div key={`new-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={preview} alt="New Upload" className="w-full h-full object-cover" />
                   <button 
                      onClick={() => handleRemoveNewFile(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-90 hover:opacity-100"
                   >
                     <X className="w-3 h-3" />
                   </button>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Fixed Bottom Button */}
        <div className="bg-white p-4 border-t fixed bottom-0 left-0 right-0 max-w-md mx-auto z-20">
            <Button 
              className="w-full bg-gray-200 text-gray-500 hover:bg-gray-300 rounded-xl h-12 font-medium data-[active=true]:bg-emerald-600 data-[active=true]:text-white data-[active=true]:hover:bg-emerald-700"
              data-active={files.length > 0}
              onClick={handleUploadSubmit}
              disabled={isUploading}
            >
              {isUploading ? (
                <>Mengunggah...
                </>
              ) : "Unggah Bukti"}
            </Button>
        </div>
      </div>
     );
  };

  return (
    <>
      {view === 'list' && <RenderListView />}
      {view === 'upload' && <RenderUploadView />}
      
      {/* Image Viewer Dialog */}
      <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none">
          <DialogHeader className="sr-only">
             <DialogTitle>Preview Bukti</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <div className="relative flex flex-col items-center justify-center p-4 min-h-[50vh]">
               <button 
                onClick={() => setViewingImage(null)}
                className="absolute top-4 right-4 bg-white/10 p-2 rounded-full text-white hover:bg-white/20"
               >
                 <X className="w-6 h-6" />
               </button>
              <img
                src={viewingImage}
                alt="Preview"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <Button asChild variant="secondary" className="mt-4">
                <a href={viewingImage} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Buka di tab baru
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
