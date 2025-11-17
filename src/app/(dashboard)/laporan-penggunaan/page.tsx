'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { toast } from "sonner";
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input'; // Untuk file input
import { UploadCloud, CheckCircle, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

// Tipe data spesifik
interface ReportItem {
    id: number;
    created_at: string;
    jumlah_uang: number;
    jumlah_disetujui: number | null;
    keperluan: string;
    kategori: string | null;
    bukti_laporan_url: string | null;
}

export default function LaporPenggunaanPage() {
    const supabase = createClient();
    const [itemsToReport, setItemsToReport] = useState<ReportItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchItemsToReport = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.rpc('get_my_reportable_submissions');
        
        if (error) {
            toast.error("Gagal mengambil data", { description: error.message });
        } else {
            setItemsToReport(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchItemsToReport();
    }, [supabase]); 

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, item: ReportItem) => {
        const file = event.target.files?.[0];
        if (!file || !item) return;

        setUploadingId(item.id);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("Sesi tidak valid");
            setUploadingId(null);
            return;
        }

        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${item.id}-${Date.now()}.${fileExt}`;

        try {
            // 1. Upload ke Storage
            const { error: uploadError } = await supabase.storage
                .from('bukti-laporan')
                .upload(filePath, file);

            if (uploadError) throw uploadError;
            
            const fileUrlToSave = filePath;

            // 2. Update database
            const { error: dbError } = await supabase
                .from('pengajuan_uang')
                .update({ 
                    bukti_laporan_url: fileUrlToSave, 
                    laporan_submitted: true
                })
                .eq('id', item.id)
                .eq('user_id', user.id);

            if (dbError) throw dbError;

            toast.success("Bukti berhasil diunggah!");
            fetchItemsToReport(); // Refresh data

        } catch (error: any) {
            toast.error("Upload Gagal", { description: error.message });
        } finally {
            setUploadingId(null);
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Lapor Penggunaan Dana</h1>
                    <p className="text-muted-foreground">
                        Unggah bukti penggunaan untuk semua pengajuan dana yang telah disetujui.
                    </p>
                </div>
                 <Button variant="ghost" asChild>
                    <Link href="/dashboard">← Kembali</Link>
                </Button>
            </div>

            {isLoading ? (
                <Card className="text-center p-10 text-muted-foreground">Memuat pengajuan yang perlu dilaporkan...</Card>
            ) : itemsToReport.length === 0 ? (
                 <Card className="text-center p-10">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <CardTitle>Semua Sudah Dilaporkan!</CardTitle>
                    <CardDescription className="mt-2">Tidak ada pengajuan uang yang perlu dilaporkan saat ini.</CardDescription>
                </Card>
            ) : (
                <div className="space-y-4">
                    {/* Input file tersembunyi */}
                     <Input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                            const activeItem = itemsToReport.find(item => item.id === uploadingId);
                            if (activeItem) handleFileSelect(e, activeItem);
                        }}
                        className="hidden"
                        accept="image/png, image/jpeg, image/jpg, application/pdf"
                    />

                    {itemsToReport.map(item => {
                        // 🔽 --- LOGIKA NOMINAL BARU --- 🔽
                        // Tampilkan jumlah_disetujui JIKA ADA, jika tidak, tampilkan jumlah_uang
                        const nominalFinal = item.jumlah_disetujui ?? item.jumlah_uang;
                        // Tampilkan nominal asli (dicoret) HANYA JIKA berbeda
                        const isPartial = item.jumlah_disetujui != null && item.jumlah_disetujui !== item.jumlah_uang;

                        return (
                            <Card key={item.id}>
                                <CardHeader>
                                    <CardTitle className="text-lg">Pengajuan ID: {item.id}</CardTitle>
                                    <CardDescription>
                                        {format(new Date(item.created_at), 'dd MMM yyyy', { locale: indonesiaLocale })} 
                                        
                                        {/* 🔽 --- TAMPILAN NOMINAL BARU --- 🔽 */}
                                        <span className="font-semibold text-emerald-700">
                                            {' - '}Rp {nominalFinal.toLocaleString('id-ID')}
                                        </span>
                                        
                                        {isPartial && (
                                            <span className="text-xs text-muted-foreground line-through ml-2">
                                                (Rp {item.jumlah_uang.toLocaleString('id-ID')})
                                            </span>
                                        )}
                                        {/* 🔼 --- AKHIR PERUBAHAN TAMPILAN --- 🔼 */}

                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p><span className="font-semibold">Keperluan:</span> {item.keperluan}</p>
                                    {item.kategori && <p><span className="font-semibold">Kategori:</span> {item.kategori}</p>}
                                </CardContent>
                                <CardFooter className="flex justify-end">
                                    <Button
                                        onClick={() => {
                                            setUploadingId(item.id);
                                            fileInputRef.current?.click();
                                        }}
                                        disabled={uploadingId === item.id}
                                        size="sm"
                                    >
                                        {uploadingId === item.id ? 'Mengunggah...' : (
                                            <> <UploadCloud className="mr-2 h-4 w-4" /> Unggah Bukti </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    );
}