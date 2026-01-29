'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { alert } from "@/lib/utils/sweetalert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, Upload, X, CloudUpload } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import LoadingSpinner from '@/components/ui/loading-spinner';

type User = { id: string; };

export default function AjukanIzinPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [jenis, setJenis] = useState<string>('');
  const [tanggalMulai, setTanggalMulai] = useState<Date>();
  const [tanggalSelesai, setTanggalSelesai] = useState<Date>();
  const [alasan, setAlasan] = useState('');
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [minLoading, setMinLoading] = useState(true);

  // Minimum loading timer
  useEffect(() => {
    const timer = setTimeout(() => {
        setMinLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { 
        router.push('/login'); 
      } else { 
        setUser(user as User); 
      }
      setIsPageLoading(false);
    };
    checkUser();
  }, [router, supabase.auth]);

  const calculateDays = (start: Date, end: Date): number => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end date
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert.error('Ukuran file maksimal 5 MB');
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert.error('Format file harus JPG, PNG, atau PDF');
        return;
      }
      setBuktiFile(file);
    }
  };

  const uploadBukti = async (userId: string): Promise<string | null> => {
    if (!buktiFile) return null;

    const fileExt = buktiFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('bukti-izin')
      .upload(fileName, buktiFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Gagal mengupload bukti');
    }

    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert.error("Sesi berakhir, silakan login kembali.");
      router.push('/login');
      return;
    }

    if (!jenis) {
      alert.error("Pilih jenis izin");
      return;
    }

    if (!tanggalMulai || !tanggalSelesai) {
      alert.error("Pilih tanggal mulai dan selesai");
      return;
    }

    if (tanggalSelesai < tanggalMulai) {
      alert.error("Tanggal selesai harus setelah atau sama dengan tanggal mulai");
      return;
    }

    setIsSubmitting(true);

    try {
      let buktiUrl: string | null = null;
      if (buktiFile) {
        buktiUrl = await uploadBukti(user.id);
      }

      const jumlahHari = calculateDays(tanggalMulai, tanggalSelesai);

      const { error } = await supabase
        .from('pengajuan_izin')
        .insert({
          user_id: user.id,
          jenis,
          tanggal_mulai: format(tanggalMulai, 'yyyy-MM-dd'),
          tanggal_selesai: format(tanggalSelesai, 'yyyy-MM-dd'),
          jumlah_hari: jumlahHari,
          alasan,
          bukti_url: buktiUrl,
          status: 'pending'
        });

      if (error) {
        alert.error("Gagal Mengajukan", error.message );
      } else {
        alert.success("Pengajuan Izin Berhasil Dikirim!");
        setJenis('');
        setTanggalMulai(undefined);
        setTanggalSelesai(undefined);
        setAlasan('');
        setBuktiFile(null);
        router.push('/dashboard');
      }
    } catch (error: any) {
      alert.error("Terjadi kesalahan", error.message );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPageLoading || minLoading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100/50 px-4 h-16 flex items-center">
        <Link href="/dashboard" className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </Link>
        <h1 className="flex-1 text-center text-lg font-bold text-slate-800 -ml-4">
          Pengajuan Izin
        </h1>
      </div>

      <div className="max-w-xl mx-auto p-6 pb-40 space-y-6">
        <form onSubmit={handleSubmit}>
          
          {/* Main Card: Details */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6 space-y-6">
            
            {/* Jenis Izin */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800">Jenis Izin</label>
              <Select value={jenis} onValueChange={setJenis} required>
                <SelectTrigger className="bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-xl h-12">
                  <SelectValue placeholder="Pilih jenis izin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="izin">Izin</SelectItem>
                  <SelectItem value="sakit">Sakit</SelectItem>
                  <SelectItem value="cuti">Cuti</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Periode Izin */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800">Periode Izin</label>
              <div className="grid grid-cols-2 gap-4">
                
                {/* Tanggal Mulai */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Tanggal Mulai</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-xl h-12 px-4"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                        {tanggalMulai ? format(tanggalMulai, 'dd/MM/yyyy') : <span className="text-gray-400">dd/mm/yyyy</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={tanggalMulai}
                        onSelect={setTanggalMulai}
                        initialFocus
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Tanggal Selesai */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Tanggal Selesai</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-xl h-12 px-4"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                        {tanggalSelesai ? format(tanggalSelesai, 'dd/MM/yyyy') : <span className="text-gray-400">dd/mm/yyyy</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={tanggalSelesai}
                        onSelect={setTanggalSelesai}
                        initialFocus
                        disabled={(date) => {
                          const today = new Date(new Date().setHours(0, 0, 0, 0));
                          if (date < today) return true;
                          if (tanggalMulai && date < tanggalMulai) return true;
                          return false;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

              </div>
            </div>

            {/* Alasan */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800">Alasan</label>
              <Textarea
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Jelaskan alasan pengajuan izin Anda..."
                className="bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-xl min-h-[120px] p-4 placeholder:text-gray-400 resize-none"
                required
              />
            </div>

          </div>

          {/* Dokumen Pendukung */}
          <div className="mb-6">
            <label className="text-sm font-bold text-slate-800 block mb-2">Dokumen Pendukung</label>
            <div 
              className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                buktiFile ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/50'
              }`}
              onClick={() => document.getElementById('bukti')?.click()}
            >
              <Input
                id="bukti"
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {buktiFile ? (
                <div className="flex flex-col items-center">
                   <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                     <span className="text-2xl">📄</span>
                   </div>
                   <p className="text-sm font-bold text-slate-700">{buktiFile.name}</p>
                   <p className="text-xs text-slate-500 mt-1">{(buktiFile.size / 1024 / 1024).toFixed(2)} MB</p>
                   <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={(e) => { e.stopPropagation(); setBuktiFile(null); }}
                      className="mt-2 text-red-500 hover:text-red-600 hover:bg-red-50 px-3 h-8 text-xs font-bold"
                   >
                     Hapus File
                   </Button>
                </div>
              ) : (
                <>
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <CloudUpload className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h4 className="text-emerald-500 font-bold mb-1">Unggah Dokumen</h4>
                  <p className="text-slate-400 text-xs text-center max-w-[200px]">
                    Format PDF atau JPG (Maks. 5MB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Fixed Bottom Button */}
            <div className="max-w-xl mx-auto">
              <Button 
                type="submit" 
                className="w-full h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg shadow-emerald-200 shadow-lg translate-y-0 active:translate-y-1 transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoadingSpinner className="text-white" /> : "Ajukan Izin"}
              </Button>
            </div>
        </form>
      </div>
    </div>
  );
}
