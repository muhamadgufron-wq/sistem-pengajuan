'use client';

import { useState, useCallback } from 'react'; 
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/app/lib/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, Lock } from 'lucide-react';
import { useSubmissionStatus } from '@/hooks/use-submission-status';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function AjukanUangPage() {
    const supabase = createClient();
    const [namaBank, setNamaBank] = useState('BCA');
    const [bankLainnya, setBankLainnya] = useState('');
    const [nomorRekening, setNomorRekening] = useState('');
    const [atasNama, setAtasNama] = useState('');
    

    const [jumlahUang, setJumlahUang] = useState(''); 
    const [displayValue, setDisplayValue] = useState(''); 
    
    const [keperluan, setKeperluan] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true); 

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { 
          toast.error("Sesi berakhir, silakan login kembali."); 
          router.push('/login'); 
          setIsLoading(false);
          return; 
        }
        
        const finalBankName = namaBank === 'Lainnya' ? bankLainnya : namaBank;
        if (namaBank === 'Lainnya' && !bankLainnya) { 
          toast.error("Harap isi nama bank lainnya."); 
          setIsLoading(false);
          return; 
        }
        if (!jumlahUang || parseInt(jumlahUang) <= 0) {
          toast.error("Jumlah uang tidak valid.");
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
          toast.error("Gagal Mengirim", { description: error.message }); 
        } else {
            toast.success("Pengajuan Terkirim!");
            setNamaBank('BCA'); setBankLainnya(''); setNomorRekening('');
            setAtasNama(''); 
            setJumlahUang(''); 
            setDisplayValue(''); 
            setKeperluan('');
        }
        setIsLoading(false);
    };

    if (isStatusLoading) {
      return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
    }

    if (!isOpen) {
      return (
        <div className="min-h-screen bg-secondary/40 p-4 flex items-center justify-center">
          <Card className="max-w-md w-full text-center p-6">
              <div className="flex justify-center mb-4">
                  <div className="p-3 bg-red-100 rounded-full">
                      <Lock className="w-8 h-8 text-red-500" />
                  </div>
              </div>
              <h2 className="text-xl font-bold mb-2">Pengajuan Ditutup</h2>
              <p className="text-muted-foreground mb-6">
                  Maaf, sistem pengajuan saat ini sedang ditutup sementara oleh admin. Silakan coba lagi nanti.
              </p>
              <Button asChild variant="default">
                  <Link href="/dashboard">Kembali ke Dashboard</Link>
              </Button>
          </Card>
        </div>
      );
    }

    return (
        <div className="min-h-screen bg-secondary/40 flex items-center justify-center sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-bold">Pengajuan Uang</CardTitle>
                  </div>
                  <Button variant="ghost" asChild>
                    <Link href="/dashboard">&larr; Kembali</Link>
                  </Button>
                </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Informasi Rekening Tujuan</h3>
                            <div className="space-y-4">
                                <div><label>Nama Bank</label><Select onValueChange={setNamaBank} value={namaBank}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="BCA">BCA</SelectItem><SelectItem value="Mandiri">Mandiri</SelectItem><SelectItem value="BNI">BNI</SelectItem><SelectItem value="BRI">BRI</SelectItem><SelectItem value="Lainnya">Lainnya</SelectItem></SelectContent></Select></div>
                                {namaBank === 'Lainnya' && <div><label>Ketik Nama Bank</label><Input value={bankLainnya} onChange={(e) => setBankLainnya(e.target.value)} placeholder="Contoh: Bank Jago" required /></div>}
                                <div><label>Nomor Rekening</label><Input value={nomorRekening} onChange={(e) => setNomorRekening(e.target.value)} required /></div>
                                <div><label>Atas Nama</label><Input value={atasNama} onChange={(e) => setAtasNama(e.target.value)} required /></div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Detail Pengajuan</h3>
                            <div className="space-y-4">
                                <div>
                                  <label>Nominal (Rp)</label>
                                  <Input 
                                    type="text"
                                    inputMode="numeric"
                                    value={displayValue} 
                                    onChange={handleJumlahUangChange}
                                    placeholder="Masukan jumlah uang"
                                    required 
                                  />
                                </div>
                                <div><label>Keperluan</label><Textarea value={keperluan} onChange={(e) => setKeperluan(e.target.value)} required /></div>
                            </div>
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full !mt-8" 
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <LoaderCircle className="w-6 h-6 animate-spin" />
                          ) : (
                            "Kirim Pengajuan"
                          )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            </div>
        </div>
    );
}