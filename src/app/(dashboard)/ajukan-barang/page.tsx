'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, CloudUpload, Lock, Minus, Plus } from 'lucide-react';
import { useSubmissionStatus } from '@/hooks/use-submission-status';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Card } from "@/components/ui/card";

export default function AjukanBarangPage() {
  const supabase = createClient();
  const router = useRouter();
  
  // State for single item submission
  const [namaBarang, setNamaBarang] = useState('');
  const [jumlah, setJumlah] = useState(1);
  const [alasan, setAlasan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { isOpen, isLoading: isStatusLoading } = useSubmissionStatus();

  // Helper to increment/decrement
  const handleIncrement = () => setJumlah(prev => prev + 1);
  const handleDecrement = () => setJumlah(prev => (prev > 1 ? prev - 1 : 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sesi berakhir, silakan login kembali.");
        router.push('/login');
        return;
      }

      if (!namaBarang.trim()) {
        toast.error("Nama barang wajib diisi");
        setIsLoading(false);
        return;
      }

      if (!alasan.trim()) {
        toast.error("Alasan pengajuan wajib diisi");
        setIsLoading(false);
        return;
      }

      // Logic stays the same: insert into 'pengajuan_barang'
      // Even though UI is single item, we follow the table structure
      const itemToInsert = {
        user_id: user.id,
        nama_barang: namaBarang,
        jumlah: jumlah,
        alasan: alasan,
      };

      const { error } = await supabase.from('pengajuan_barang').insert([itemToInsert]);

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Pengajuan Berhasil Dikirim!");
      
      // Reset form
      setNamaBarang('');
      setJumlah(1);
      setAlasan('');
      
      // Optional: Redirect to status page or dashboard if desired, 
      // but keeping it on page allows consecutive submissions as per "Submit Request" flow.
      router.push('/dashboard'); 

    } catch (error: any) {
      toast.error("Gagal Mengajukan", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isStatusLoading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (!isOpen) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-6 border-none shadow-sm bg-white rounded-3xl">
            <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-50 rounded-full">
                    <Lock className="w-8 h-8 text-red-500" />
                </div>
            </div>
            <h2 className="text-xl font-bold mb-2 text-slate-800">Pengajuan Ditutup</h2>
            <p className="text-slate-500 mb-6 text-sm">
                Maaf, sistem pengajuan saat ini sedang ditutup sementara oleh admin. Silakan coba lagi nanti.
            </p>
            <Button asChild className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white">
                <Link href="/dashboard">Kembali ke Dashboard</Link>
            </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100/50 px-4 h-16 flex items-center">
        <Link href="/dashboard" className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </Link>
        <h1 className="flex-1 text-center text-lg font-bold text-slate-800 -ml-4">
          Pengajuan Barang
        </h1>
      </div>

      <div className="max-w-xl mx-auto p-6 pb-24 space-y-8">
        <form onSubmit={handleSubmit}>
            
            {/* Nama Barang */}
            <div className="space-y-3 mb-6">
                <label className="text-sm font-bold text-slate-800">
                    Nama Barang
                </label>
                <Input 
                    placeholder="Contoh: Kursi Kantor, Mouse, dll"
                    value={namaBarang}
                    onChange={(e) => setNamaBarang(e.target.value)}
                    className="bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-0 rounded-2xl h-14 px-4 text-slate-700 placeholder:text-gray-400 transition-all font-medium"
                />
            </div>

            {/* Jumlah */}
            <div className="space-y-3 mb-6">
                <label className="text-sm font-bold text-slate-800">
                    Jumlah
                </label>
                <div className="flex items-center justify-between bg-gray-50 rounded-2xl h-14 px-2">
                    <button 
                        type="button"
                        onClick={handleDecrement}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-200 text-slate-600 hover:bg-gray-300 transition-colors disabled:opacity-50"
                        disabled={jumlah <= 1}
                    >
                        <Minus className="w-5 h-5" />
                    </button>
                    <span className="text-lg font-bold text-slate-800 w-16 text-center">
                        {jumlah}
                    </span>
                    <button 
                        type="button"
                        onClick={handleIncrement}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-200 text-slate-600 hover:bg-gray-300 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Alasan Pengajuan */}
            <div className="space-y-3 mb-6">
                <label className="text-sm font-bold text-slate-800">
                    Detail Pengajuan
                </label>
                <Textarea 
                    placeholder="Jelaskan mengapa barang ini dibutuhkan..."
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                    className="bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-0 rounded-2xl min-h-[140px] p-4 text-slate-700 placeholder:text-gray-400 resize-none transition-all font-medium"
                />
            </div>
            {/* Submit Button */}
            <Button 
                type="submit" 
                className="w-full h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg shadow-emerald-200 shadow-lg translate-y-0 active:translate-y-1 transition-all mt-12"
                disabled={isLoading}
            >
                {isLoading ? <LoadingSpinner className="text-white" /> : "Ajukan Barang"}
            </Button>

        </form>
      </div>
    </div>
  );
}