'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/app/lib/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle } from 'lucide-react';
import MultiFileUpload from '@/components/reimbursement/MultiFileUpload';

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

        try {
            // Validate user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Sesi berakhir, silakan login kembali.");
                router.push('/login');
                return;
            }

            // Validate bank
            const finalBankName = namaBank === 'Lainnya' ? bankLainnya : namaBank;
            if (namaBank === 'Lainnya' && !bankLainnya) {
                toast.error("Harap isi nama bank lainnya.");
                setIsLoading(false);
                return;
            }

            // Validate amount
            if (!jumlahUang || parseInt(jumlahUang) <= 0) {
                toast.error("Jumlah uang tidak valid.");
                setIsLoading(false);
                return;
            }

            // Validate files
            if (files.length === 0) {
                toast.error("Harap upload minimal 1 bukti pembelian/struk.");
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
                const error = await response.json();
                throw new Error(error.error || 'Gagal membuat reimbursement');
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
                const error = await uploadResponse.json();
                throw new Error(error.error || 'Gagal upload bukti');
            }

            const uploadResult = await uploadResponse.json();

            // Success
            toast.success("Reimbursement berhasil diajukan!");
            
            if (uploadResult.errors && uploadResult.errors.length > 0) {
                toast.warning(`Beberapa file gagal diupload: ${uploadResult.errors.join(', ')}`);
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

        } catch (error: any) {
            console.error('Error:', error);
            toast.error(error.message || "Gagal mengajukan reimbursement");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary/40 flex items-center justify-center sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto w-full">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl font-bold">Pengajuan Reimbursement</CardTitle>
                      </div>
                      <Button variant="ghost" asChild>
                        <Link href="/dashboard">&larr; Kembali</Link>
                      </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Bank Info Section */}
                        <div>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Informasi Rekening Tujuan</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Nama Bank</label>
                                    <Select onValueChange={setNamaBank} value={namaBank}>
                                        <SelectTrigger>
                                            <SelectValue/>
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
                                {namaBank === 'Lainnya' && (
                                    <div>
                                        <label className="text-sm font-medium">Ketik Nama Bank</label>
                                        <Input 
                                            value={bankLainnya} 
                                            onChange={(e) => setBankLainnya(e.target.value)} 
                                            placeholder="Contoh: Bank Jago" 
                                            required 
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="text-sm font-medium">Nomor Rekening</label>
                                    <Input 
                                        value={nomorRekening} 
                                        onChange={(e) => setNomorRekening(e.target.value)} 
                                        placeholder="Masukkan nomor rekening"
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Atas Nama</label>
                                    <Input 
                                        value={atasNama} 
                                        onChange={(e) => setAtasNama(e.target.value)} 
                                        placeholder="Nama pemilik rekening"
                                        required 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Reimbursement Details */}
                        <div>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Detail Reimbursement</h3>
                            <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Nominal yang terpakai (Rp)</label>
                                  <Input 
                                    type="text"
                                    inputMode="numeric"
                                    value={displayValue} 
                                    onChange={handleJumlahUangChange}
                                    placeholder="Masukan jumlah uang"
                                    required 
                                  />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Keperluan / Deskripsi</label>
                                    <Textarea 
                                        value={keperluan} 
                                        onChange={(e) => setKeperluan(e.target.value)} 
                                        placeholder="Jelaskan untuk apa uang tersebut digunakan"
                                        rows={4}
                                        required 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Proof Upload */}
                        <div>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">
                                Bukti Pembelian / Struk <span className="text-red-500">*</span>
                            </h3>
                            <MultiFileUpload 
                                onFilesChange={setFiles}
                                maxFiles={5}
                                maxSizeMB={5}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Upload foto struk, nota, atau bukti pembayaran lainnya (minimal 1 file)
                            </p>
                        </div>

                        {/* Submit Button */}
                        <Button 
                          type="submit" 
                          className="w-full !mt-8" 
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <LoaderCircle className="w-6 h-6 animate-spin" />
                          ) : (
                            "Kirim Pengajuan Reimbursement"
                          )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            </div>
        </div>
    );
}
