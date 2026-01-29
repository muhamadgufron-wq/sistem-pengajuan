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
import { Card } from "@/components/ui/card";
import { ChevronLeft, Info, Landmark, Receipt, Upload, Lock } from 'lucide-react';
import MultiFileUpload from '@/components/reimbursement/MultiFileUpload';
import { useSubmissionStatus } from '@/hooks/use-submission-status';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function AjukanReimbursementPage() {
    const supabase = createClient();
    const router = useRouter();
    
    // Bank info
    const [namaBank, setNamaBank] = useState('BCA');
    const [bankLainnya, setBankLainnya] = useState('');
    const [nomorRekening, setNomorRekening] = useState('');
    const [atasNama, setAtasNama] = useState('');
    
    // Reimbursement details
    const [jumlahUang, setJumlahUang] = useState('');
    const [displayValue, setDisplayValue] = useState('');
    const [keperluan, setKeperluan] = useState('');
    
    // Files
    const [files, setFiles] = useState<File[]>([]);
    
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
            // Validate user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert.error("Sesi berakhir, silakan login kembali.");
                router.push('/login');
                return;
            }

            // Validate bank
            const finalBankName = namaBank === 'Lainnya' ? bankLainnya : namaBank;
            if (namaBank === 'Lainnya' && !bankLainnya) {
                alert.error("Harap isi nama bank lainnya.");
                setIsLoading(false);
                return;
            }

            // Validate amount
            if (!jumlahUang || parseInt(jumlahUang) <= 0) {
                alert.error("Jumlah uang tidak valid.");
                setIsLoading(false);
                return;
            }

            // Validate files
            if (files.length === 0) {
                alert.error("Harap upload minimal 1 bukti pembelian/struk.");
                setIsLoading(false);
                return;
            }

            // Step 1: Create reimbursement
            const response = await fetch('/api/reimbursement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jumlah_uang: parseInt(jumlahUang),
                    keperluan,
                    nama_bank: finalBankName,
                    nomor_rekening: nomorRekening,
                    atas_nama: atasNama,
                }),
            });

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    throw new Error(error.error || 'Gagal membuat reimbursement');
                } else {
                     throw new Error('Gagal membuat reimbursement: Terjadi kesalahan server.');
                }
            }

            const { data: reimbursement } = await response.json();

            // Step 2: Upload files
            const formData = new FormData();
            formData.append('reimbursement_id', reimbursement.id.toString());
            files.forEach(file => {
                formData.append('files', file);
            });

            const uploadResponse = await fetch('/api/reimbursement/upload-bukti', {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                 const contentType = uploadResponse.headers.get('content-type');
                 if (contentType && contentType.includes('application/json')) {
                     const error = await uploadResponse.json();
                     throw new Error(error.error || 'Gagal upload bukti');
                 } else {
                     const text = await uploadResponse.text();
                     console.error('Upload failed with non-JSON response:', text);
                     // Very likely a 413 Payload Too Large or 504 Gateway Timeout if it's not JSON
                     throw new Error('Gagal upload bukti: Terjadi kesalahan server (kemungkinan ukuran file terlalu besar).');
                 }
            }

            const uploadResult = await uploadResponse.json();

            // Success
            alert.success("Reimbursement berhasil diajukan!");
            
            if (uploadResult.errors && uploadResult.errors.length > 0) {
                alert.warning(`Beberapa file gagal diupload: ${uploadResult.errors.join(', ')}`);
            }

            // Reset form
            setNamaBank('BCA');
            setBankLainnya('');
            setNomorRekening('');
            setAtasNama('');
            setJumlahUang('');
            setDisplayValue('');
            setKeperluan('');
            setFiles([]);
            
            // Redirect
            router.push('/dashboard');

        } catch (error: any) {
            console.error('Error:', error);
            alert.error(error.message || "Gagal mengajukan reimbursement");
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
                    <ChevronLeft className="w-6 h-6 text-slate-600" />
                </Link>
                <h1 className="flex-1 text-center text-base font-bold text-slate-800 -ml-4">
                    Pengajuan Reimbursement
                </h1>
            </div>

            <div className="max-w-xl mx-auto p-6 pb-40 space-y-6">
                <form onSubmit={handleSubmit}>
                    
                    {/* SECTION 1: BANK ACCOUNT INFORMATION */}
                    <div className="mb-6">
                        <h3 className="flex items-center gap-2 text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-3">
                            <Landmark className="w-3.5 h-3.5 text-emerald-500" />
                            Informasi Rekening Bank
                        </h3>
                        <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-5">
                            
                            {/* Nama Bank */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600">Nama Bank</label>
                                <Select onValueChange={setNamaBank} value={namaBank}>
                                    <SelectTrigger className="bg-white border border-gray-200 focus:border-emerald-500 rounded-xl h-10 text-xs">
                                        <SelectValue placeholder="Select Bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BCA" className="text-xs">BCA</SelectItem>
                                        <SelectItem value="Mandiri" className="text-xs">Mandiri</SelectItem>
                                        <SelectItem value="BNI" className="text-xs">BNI</SelectItem>
                                        <SelectItem value="BRI" className="text-xs">BRI</SelectItem>
                                        <SelectItem value="Lainnya" className="text-xs">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Bank Lainnya */}
                            {namaBank === 'Lainnya' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600">Nama Bank Lainnya</label>
                                    <Input 
                                        value={bankLainnya} 
                                        onChange={(e) => setBankLainnya(e.target.value)} 
                                        placeholder="Contoh: Bank Jago" 
                                        className="bg-white border border-gray-200 focus:border-emerald-500 rounded-xl h-10 text-xs"
                                        required 
                                    />
                                </div>
                            )}

                            {/* Nomor Rekening */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600">Nomor Rekening</label>
                                <Input 
                                    value={nomorRekening} 
                                    onChange={(e) => setNomorRekening(e.target.value)} 
                                    placeholder="Contoh: 1234567890"
                                    className="bg-white border border-gray-200 focus:border-emerald-500 rounded-xl h-10 placeholder:text-gray-400 text-xs"
                                    required 
                                />
                            </div>

                            {/* Nama Pemilik */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600">Nama Pemilik Rekening</label>
                                <Input 
                                    value={atasNama} 
                                    onChange={(e) => setAtasNama(e.target.value)} 
                                    placeholder="Contoh: Muhamad Gufron"
                                    className="bg-white border border-gray-200 focus:border-emerald-500 rounded-xl h-10 placeholder:text-gray-400 text-xs"
                                    required 
                                />
                            </div>

                            <div className="flex gap-2 items-start p-2.5 bg-gray-50 rounded-lg">
                                <Info className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                    Pastikan nomor rekening dan nama pemilik rekening sesuai dengan yang terdaftar di bank.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: REIMBURSEMENT DETAILS */}
                    <div className="mb-6">
                        <h3 className="flex items-center gap-2 text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-3">
                            <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                            Detail Pengajuan
                        </h3>
                        <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-5">
                            
                            {/* Amount */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600">Jumlah Uang</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">Rp</span>
                                    <Input 
                                        type="text"
                                        inputMode="numeric"
                                        value={displayValue} 
                                        onChange={handleJumlahUangChange}
                                        placeholder="0"
                                        className="bg-white border border-gray-200 focus:border-emerald-500 rounded-xl h-10 pl-10 text-sm font-bold text-slate-800"
                                        required 
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600">Keperluan</label>
                                <Textarea 
                                    value={keperluan} 
                                    onChange={(e) => setKeperluan(e.target.value)} 
                                    placeholder="Jelaskan keperluan pengajuan reimbursement..."
                                    className="bg-white border border-gray-200 focus:border-emerald-500 rounded-xl min-h-[100px] p-3 placeholder:text-gray-400 resize-none text-xs"
                                    required 
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: UPLOAD RECEIPT */}
                    <div className="mb-6">
                         <h3 className="flex items-center gap-2 text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-3">
                            <Upload className="w-3.5 h-3.5 text-emerald-500" />
                            Unggah Bukti Pengeluaran
                        </h3>
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                             <div className="p-5">
                                <MultiFileUpload 
                                    onFilesChange={setFiles}
                                    maxFiles={5}
                                    maxSizeMB={5}
                                />
                                <p className="text-[10px] text-center text-gray-400 mt-2">
                                    Support PDF, JPG, PNG (Max 5MB)
                                </p>
                             </div>
                        </div>
                    </div>

                    {/* Fixed Bottom Button */}
                        <div className="max-w-xl mx-auto">
                            <Button 
                                type="submit" 
                                className="w-full h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-emerald-200 shadow-lg translate-y-0 active:translate-y-1 transition-all"
                                disabled={isLoading}
                            >
                                {isLoading ? <LoadingSpinner className="text-white" /> : "Ajukan Reimbursement"}
                            </Button>
                        </div>
                </form>
            </div>
        </div>
    );
}
