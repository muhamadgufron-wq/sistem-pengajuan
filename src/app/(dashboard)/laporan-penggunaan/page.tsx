'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input'; // Untuk file input
import { UploadCloud, CheckCircle, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { error } from 'console';

// Tipe data spesifik
interface ReportItem {
    id: number;
    created_at: string;
    jumlah_uang: number;
    keperluan: string;
    kategori: string | null;
    bukti_laporan_url: string | null;
}

export default function LaporPenggunaanPage() {
    const supabase = createClient();
    const [itemsToReport, setItemsToReport] = useState<ReportItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState<number | null>(null); // Track item yang sedang diupload
    const fileInputRef = useRef<HTMLInputElement>(null); // Ref untuk file input tersembunyi

    // Hitung rentang tanggal minggu lalu (tidak berubah)
    const today = new Date();
    const startOfLastWeek = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
    const endOfLastWeek = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
    const dateRangeString = `${format(startOfLastWeek, 'dd MMM yyyy', { locale: indonesiaLocale })} - ${format(endOfLastWeek, 'dd MMM yyyy', { locale: indonesiaLocale })}`;

    const fetchItemsToReport = async () => {
        setIsLoading(true);
        // Panggil RPC baru
        const { data, error } = await supabase.rpc('get_my_last_week_uang_submissions_for_reporting');
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
        const filePath = `${user.id}/${item.id}-${Date.now()}.${fileExt}`; // Path unik: userId/itemId-timestamp.ext

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
                .update({ bukti_laporan_url: fileUrlToSave, 
                    laporan_submitted: true })
                .eq('id', item.id)
                .eq('user_id', user.id);

            if (dbError) throw dbError;

            toast.success("Bukti berhasil diunggah!");
            fetchItemsToReport(); // Refresh data

        } catch (error: any) {
            toast.error("Upload Gagal", { description: error.message });
        } finally {
            setUploadingId(null);
            // Reset file input value agar bisa upload file yang sama lagi
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Lapor Penggunaan Dana</h1>
                    <p className="text-muted-foreground">
                        Unggah bukti penggunaan dana untuk periode: <span className="font-semibold">{dateRangeString}</span>
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
                    <CardDescription className="mt-2">Tidak ada pengajuan uang dari minggu lalu yang perlu dilaporkan saat ini.</CardDescription>
                </Card>
            ) : (
                <div className="space-y-4">
                    {/* Input file tersembunyi */}
                     <Input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                            // Cari item yang sedang 'aktif' untuk upload
                            const activeItem = itemsToReport.find(item => item.id === uploadingId);
                            if (activeItem) handleFileSelect(e, activeItem);
                        }}
                        className="hidden"
                        accept="image/png, image/jpeg, image/jpg, application/pdf" // Batasi tipe file
                    />

                    {itemsToReport.map(item => (
                        <Card key={item.id}>
                            <CardHeader>
                                <CardTitle className="text-lg">Pengajuan ID: {item.id}</CardTitle>
                                <CardDescription>
                                    {format(new Date(item.created_at), 'dd MMM yyyy')} - Rp {item.jumlah_uang.toLocaleString('id-ID')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p><span className="font-semibold">Keperluan:</span> {item.keperluan}</p>
                                {item.kategori && <p><span className="font-semibold">Kategori:</span> {item.kategori}</p>}
                            </CardContent>
                            <CardFooter className="flex justify-end">
                                <Button
                                    onClick={() => {
                                        setUploadingId(item.id); // Tandai item ini aktif
                                        fileInputRef.current?.click(); // Picu klik pada input file tersembunyi
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
                    ))}
                </div>
            )}
        </div>
    );
}