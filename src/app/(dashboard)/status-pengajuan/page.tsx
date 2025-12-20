'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/app/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const StatusBadge = ({ status }: { status: string }) => {
    const baseClasses = "px-3 py-1 text-xs font-medium rounded-full";
    let statusClasses = "";
    switch (status?.toLowerCase()) {
        case 'disetujui': statusClasses = "bg-green-100 text-green-800"; break;
        case 'ditolak': statusClasses = "bg-red-100 text-red-800"; break;
        default: statusClasses = "bg-yellow-100 text-yellow-800"; break;
    }
    return <span className={`${baseClasses} ${statusClasses}`}>{status}</span>;
};

export default function StatusPengajuanPage() {
    const supabase = createClient();
    const router = useRouter();
    
    const [pengajuanBarang, setPengajuanBarang] = useState<any[]>([]);
    const [pengajuanUang, setPengajuanUang] = useState<any[]>([]);
    const [pengajuanIzin, setPengajuanIzin] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('barang');
    const [viewingProof, setViewingProof] = useState<string | null>(null);
    const [currentSignedUrl, setCurrentSignedUrl] = useState<string | null>(null);
    const [loadingImage, setLoadingImage] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            // Query langsung untuk pengajuan barang
            const { data: barangData } = await supabase
                .from('pengajuan_barang')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            // Query langsung untuk pengajuan uang (dengan bukti_transfer_url)
            const { data: uangData } = await supabase
                .from('pengajuan_uang')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            // Query langsung untuk pengajuan izin
            const { data: izinData } = await supabase
                .from('pengajuan_izin')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            setPengajuanBarang(barangData || []);
            setPengajuanUang(uangData || []);
            setPengajuanIzin(izinData || []);
            setIsLoading(false);
        };
        fetchData();
    }, [supabase, router]);

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // State untuk menyimpan signed URLs
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

    // Helper function to get signed URL for transfer proof (private bucket)
    const getTransferProofUrl = async (path: string | null) => {
        if (!path) return null;
        
        // Check if already cached
        if (signedUrls[path]) {
            return signedUrls[path];
        }

        try {
            const { data, error } = await supabase.storage
                .from('bukti-transfer')
                .createSignedUrl(path, 3600); // 1 hour expiry

            if (error) {
                console.error('Error creating signed URL:', error);
                return null;
            }

            // Cache the URL
            setSignedUrls(prev => ({ ...prev, [path]: data.signedUrl }));
            return data.signedUrl;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    };

    // Load signed URL when viewing proof
    useEffect(() => {
        if (viewingProof) {
            setLoadingImage(true);
            getTransferProofUrl(viewingProof).then(url => {
                setCurrentSignedUrl(url);
                setLoadingImage(false);
            });
        } else {
            setCurrentSignedUrl(null);
        }
    }, [viewingProof, supabase]);

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Riwayat & Status Pengajuan</h1>
                    <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">&larr; Kembali</Link>
                </div>
                
                <div className="border-b border-gray-200"><nav className="-mb-px flex space-x-8"><button onClick={() => setActiveTab('barang')} className={`${activeTab === 'barang' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} py-4 px-1 border-b-2 font-medium text-sm`}>Pengajuan Barang</button><button onClick={() => setActiveTab('uang')} className={`${activeTab === 'uang' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} py-4 px-1 border-b-2 font-medium text-sm`}>Pengajuan Uang</button><button onClick={() => setActiveTab('izin')} className={`${activeTab === 'izin' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} py-4 px-1 border-b-2 font-medium text-sm`}>Pengajuan Izin</button></nav></div>

                <div className="mt-6">
                    {isLoading ? <p>Memuat data...</p> : (
                        <>
                            {activeTab === 'barang' && (
                                <div className="space-y-4">
                                    {pengajuanBarang.length > 0 ? pengajuanBarang.map((item: any) => (
                                        <div key={item.id} className="bg-white p-5 rounded-lg shadow-sm border">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-lg text-gray-800">{item.nama_barang} ({item.jumlah} unit)</p>
                                                    <p className="text-sm text-gray-600 mt-1">{item.alasan}</p>
                                                </div>
                                                <StatusBadge status={item.status} />
                                            </div>
                                            {/* --- TAMPILKAN CATATAN ADMIN --- */}
                                            {item.catatan_admin && (
                                                <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm">
                                                    <strong>Catatan Admin:</strong> {item.catatan_admin}
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-400 mt-3 text-right">Diajukan pada: {formatDate(item.created_at)}</p>
                                        </div>
                                    )) : <p>Belum ada riwayat pengajuan barang.</p>}
                                </div>
                            )}
                            
                            {activeTab === 'uang' && (
                                <div className="space-y-4">
                                    {pengajuanUang.length > 0 ? pengajuanUang.map((item: any) => (
                                        <div key={item.id} className="bg-white p-5 rounded-lg shadow-sm border">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div>
                                                        {
                                                                (item.status.toLowerCase() === 'disetujui' && item.jumlah_disetujui != null && item.jumlah_disetujui !== item.jumlah_uang)
                                                            ? (
                                                                <>
                                                                <p className="font-bold text-lg text-gray-800">Rp {Number(item.jumlah_disetujui).toLocaleString('id-ID')}
                                                                <span className="text-sm text-emerald-500 ml-1">(Disetujui)</span>
                                                                </p>

                                                                <p className="text-sm text-muted-foreground line-through">
                                                                        (Diminta: Rp {Number(item.jumlah_uang).toLocaleString('id-ID')})
                                                                </p>
                                                                </>
                                                            ) : (
                                                                <p className="font-bold text-lg text-gray-800">
                                                                    Rp {Number(item.jumlah_uang).toLocaleString('id-ID')}
                                                                </p>
                                                            )
                                                        }
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-1">{item.keperluan}</p>
                                                        <p className="text-sm text-gray-500 mt-2">{item.nama_bank} - {item.nomor_rekening} (a.n {item.atas_nama})</p>
                                                    </div>
                                                    <div className="flex flex-col gap-2 items-end">
                                                        <StatusBadge status={item.status} />
                                                        {/* Bukti Transfer Button */}
                                                        {item.bukti_transfer_url && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setViewingProof(item.bukti_transfer_url)}
                                                                className="text-green-700 border-green-300 hover:bg-green-100"
                                                            >
                                                                Bukti Transfer
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            {item.catatan_admin && (
                                                <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm">
                                                    <strong>Catatan Admin:</strong> {item.catatan_admin}
                                                </div>
                                            )}
                                            
                                            
                                            <p className="text-xs text-gray-400 mt-3 text-right">Diajukan pada: {formatDate(item.created_at)}</p>
                                        </div>
                                    )) : <p>Belum ada riwayat pengajuan uang.</p>}
                                </div>
                            )}
                            
                            {activeTab === 'izin' && (
                                <div className="space-y-4">
                                    {pengajuanIzin.length > 0 ? pengajuanIzin.map((item: any) => (
                                        <div key={item.id} className="bg-white p-5 rounded-lg shadow-sm border">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium uppercase">
                                                            {item.jenis}
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            {item.jumlah_hari} hari
                                                        </span>
                                                    </div>
                                                    <p className="font-semibold text-gray-800">
                                                        {formatDate(item.tanggal_mulai)} - {formatDate(item.tanggal_selesai)}
                                                    </p>
                                                    <p className="text-sm text-gray-600 mt-2">{item.alasan}</p>
                                                </div>
                                                <StatusBadge status={item.status} />
                                            </div>
                                            {item.catatan_admin && (
                                                <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm">
                                                    <strong>Catatan Admin:</strong> {item.catatan_admin}
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-400 mt-3 text-right">Diajukan pada: {formatDate(item.created_at)}</p>
                                        </div>
                                    )) : <p>Belum ada riwayat pengajuan izin.</p>}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            
            {/* Dialog untuk tampilkan bukti transfer */}
            <Dialog open={!!viewingProof} onOpenChange={() => setViewingProof(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Bukti Transfer</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        {loadingImage ? (
                            <div className="flex items-center justify-center h-64">
                                <p className="text-muted-foreground">Memuat gambar...</p>
                            </div>
                        ) : currentSignedUrl ? (
                            <img
                                src={currentSignedUrl}
                                alt="Bukti Transfer"
                                className="w-full rounded-lg border"
                                onError={(e) => {
                                    console.error('Image load error');
                                    e.currentTarget.src = '';
                                }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-64">
                                <p className="text-muted-foreground">Gagal memuat gambar</p>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setViewingProof(null)}
                        >
                            Tutup
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}