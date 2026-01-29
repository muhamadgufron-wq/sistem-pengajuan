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
import { ChevronLeft, Lock } from 'lucide-react';
import { useSubmissionStatus } from '@/hooks/use-submission-status';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Card } from "@/components/ui/card";

export default function AjukanUangPage() {
    const supabase = createClient();
    const router = useRouter();

    const [namaBank, setNamaBank] = useState('BCA');
    const [bankLainnya, setBankLainnya] = useState('');
    const [nomorRekening, setNomorRekening] = useState('');
    const [atasNama, setAtasNama] = useState('');
    
    const [jumlahUang, setJumlahUang] = useState(''); 
    const [displayValue, setDisplayValue] = useState(''); 
    
    const [keperluan, setKeperluan] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [minLoading, setMinLoading] = useState(true);

    const { isOpen, isLoading: isStatusLoading } = useSubmissionStatus();

    const formatNumber = (value: string) => {
      const rawValue = value.replace(/[^0-9]/g, '');
      if (rawValue === '') return '';
      return new Intl.NumberFormat('id-ID').format(Number(rawValue));
    };

    const handleJumlahUangChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      const rawValue = value.replace(/[^0-9]/g, '');
      setJumlahUang(rawValue);

      const formattedValue = formatNumber(rawValue);
      setDisplayValue(formattedValue);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setMinLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true); 

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { 
              alert.error("Sesi berakhir, silakan login kembali."); 
              router.push('/login'); 
              return; 
            }
            
            const finalBankName = namaBank === 'Lainnya' ? bankLainnya : namaBank;
            if (namaBank === 'Lainnya' && !bankLainnya) { 
              alert.error("Harap isi nama bank lainnya."); 
              setIsLoading(false);
              return; 
            }
            if (!jumlahUang || parseInt(jumlahUang) <= 0) {
              alert.error("Jumlah uang tidak valid.");
              setIsLoading(false);
              return;
            }
    
            const { error } = await supabase.from('pengajuan_uang').insert({
                jumlah_uang: parseInt(jumlahUang), 
                keperluan: keperluan,
                nama_bank: finalBankName,
                nomor_rekening: nomorRekening,
                atas_nama: atasNama,
                user_id: user.id
            });
    
            if (error) { 
               throw new Error(error.message);
            } 
            
            alert.success("Pengajuan Terkirim!");
            // Reset form
            setNamaBank('BCA'); setBankLainnya(''); setNomorRekening('');
            setAtasNama(''); 
            setJumlahUang(''); 
            setDisplayValue(''); 
            setKeperluan('');
            
            // Optional: Redirect
            router.push('/dashboard');

        } catch (error: any) {
            alert.error("Gagal Mengirim", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    if (isStatusLoading || minLoading) {
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
                    <ChevronLeft className="w-6 h-6 text-slate-500" />
                </Link>
                <h1 className="flex-1 text-center text-lg font-bold text-slate-800 -ml-4">
                    Pengajuan Uang
                </h1>
            </div>

            <div className="max-w-xl mx-auto p-6 pb-40 space-y-8">
                <form onSubmit={handleSubmit}>
                    
                    {/* SECTION 1: REKENING BANK TUJUAN */}
                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                            Rekening Bank Tujuan
                        </h3>
                        <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
                            
                            {/* Nama Bank */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-800">Nama Bank</label>
                                <Select onValueChange={setNamaBank} value={namaBank}>
                                    <SelectTrigger className="bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl h-12">
                                        <SelectValue placeholder="Pilih Bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BCA">BCA</SelectItem>
                                        <SelectItem value="Mandiri">Mandiri</SelectItem>
                                        <SelectItem value="BNI">BNI</SelectItem>
                                        <SelectItem value="BRI">BRI</SelectItem>
                                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Bank Lainnya (Conditional) */}
                            {namaBank === 'Lainnya' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-800">Ketik Nama Bank</label>
                                    <Input 
                                        value={bankLainnya} 
                                        onChange={(e) => setBankLainnya(e.target.value)} 
                                        placeholder="Contoh: Bank Jago" 
                                        className="bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl h-12"
                                        required 
                                    />
                                </div>
                            )}

                            {/* Nomor Rekening */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-800">Nomor Rekening</label>
                                <Input 
                                    value={nomorRekening} 
                                    onChange={(e) => setNomorRekening(e.target.value)} 
                                    placeholder="Masukkan nomor rekening"
                                    className="bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl h-12 placeholder:text-gray-400"
                                    required 
                                />
                            </div>

                            {/* Nama Pemilik */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-800">Nama Pemilik Rekening</label>
                                <Input 
                                    value={atasNama} 
                                    onChange={(e) => setAtasNama(e.target.value)} 
                                    placeholder="Sesuai buku tabungan"
                                    className="bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl h-12 placeholder:text-gray-400"
                                    required 
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: DETAIL PENGAJUAN */}
                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                            Detail Pengajuan
                        </h3>
                        <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
                            
                            {/* Jumlah Dana */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-800">Jumlah Dana</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                                    <Input 
                                        type="text"
                                        inputMode="numeric"
                                        value={displayValue} 
                                        onChange={handleJumlahUangChange}
                                        placeholder="0"
                                        className="bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl h-12 pl-12 text-lg font-bold text-slate-800"
                                        required 
                                    />
                                </div>
                            </div>

                            {/* Alasan Pengajuan */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-800">Alasan Pengajuan</label>
                                <Textarea 
                                    value={keperluan} 
                                    onChange={(e) => setKeperluan(e.target.value)} 
                                    placeholder="Jelaskan rincian keperluan penggunaan dana ini..."
                                    className="bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl min-h-[120px] p-4 placeholder:text-gray-400 resize-none"
                                    required 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fixed Bottom Button */}
                        <div className="max-w-xl mx-auto flex flex-col items-center">
                            <Button 
                                type="submit" 
                                className="w-full h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg shadow-emerald-200 shadow-lg translate-y-0 active:translate-y-1 transition-all"
                                disabled={isLoading}
                            >
                                {isLoading ? <LoadingSpinner className="text-white" /> : "Ajukan Uang"}
                            </Button>
                        </div>
                </form>
            </div>
        </div>
    );
}