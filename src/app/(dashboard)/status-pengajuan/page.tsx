'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { 
    Search, 
    Package, 
    Banknote, 
    Receipt, 
    Calendar,  
    Plus, 
    ChevronLeft,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  { id: 'all', label: 'Semua' },
  { id: 'barang', label: 'Barang' },
  { id: 'uang', label: 'Uang' },
  { id: 'reimbursement', label: 'Reimbursement' },
  { id: 'izin', label: 'Izin' },
];

export default function StatusPengajuanPage() {
    const supabase = createClient();
    const router = useRouter();
    
    // Data State
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filter State
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeStatus, setActiveStatus] = useState('all');

    // View State
    const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
    const [viewingProof, setViewingProof] = useState<string | null>(null);
    const [currentSignedUrl, setCurrentSignedUrl] = useState<string | null>(null);
    const [loadingImage, setLoadingImage] = useState(false);

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const [barang, uang, izin, reimbursement] = await Promise.all([
                supabase.from('pengajuan_barang').select('*').eq('user_id', user.id),
                supabase.from('pengajuan_uang').select('*').eq('user_id', user.id),
                supabase.from('pengajuan_izin').select('*').eq('user_id', user.id),
                supabase.from('pengajuan_reimbursement').select('*').eq('user_id', user.id)
            ]);

            const merged = [
                ...(barang.data || []).map(item => ({ ...item, type: 'barang', normalizedStatus: item.status.toLowerCase() })),
                ...(uang.data || []).map(item => ({ ...item, type: 'uang', normalizedStatus: item.status.toLowerCase() })),
                ...(izin.data || []).map(item => ({ ...item, type: 'izin', normalizedStatus: item.status.toLowerCase() })),
                ...(reimbursement.data || []).map(item => ({ ...item, type: 'reimbursement', normalizedStatus: item.status.toLowerCase() }))
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setSubmissions(merged);
            setIsLoading(false);
        };
        fetchData();
    }, [supabase, router]);

    // Helper functions
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { 
            style: 'currency', 
            currency: 'IDR', 
            minimumFractionDigits: 0 
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'disetujui': return 'bg-emerald-100 text-emerald-700';
            case 'ditolak': return 'bg-red-100 text-red-700';
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'disetujui': return 'DISETUJUI';
            case 'ditolak': return 'DITOLAK';
            case 'pending': return 'PENDING';
            default: return status.toUpperCase();
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'barang': return <Package className="w-6 h-6 text-blue-500" />;
            case 'uang': return <Banknote className="w-6 h-6 text-emerald-500" />;
            case 'reimbursement': return <Receipt className="w-6 h-6 text-purple-500" />;
            case 'izin': return <Calendar className="w-6 h-6 text-orange-500" />;
            default: return <AlertCircle className="w-6 h-6 text-gray-500" />;
        }
    };

    const getIconBg = (type: string) => {
        switch (type) {
            case 'barang': return 'bg-blue-50';
            case 'uang': return 'bg-emerald-50';
            case 'reimbursement': return 'bg-purple-50';
            case 'izin': return 'bg-orange-50';
            default: return 'bg-gray-50';
        }
    };

    // Filter Logic
    const filteredSubmissions = submissions.filter(item => {
        const categoryMatch = activeCategory === 'all' || item.type === activeCategory;
        const statusMatch = activeStatus === 'all' || item.normalizedStatus === activeStatus;
        return categoryMatch && statusMatch;
    });

    // --- Proof Logic Redux ---
    const getTransferProofUrl = async (path: string | null) => {
        if (!path) return null;
        try {
            const { data, error } = await supabase.storage.from('bukti-transfer').createSignedUrl(path, 3600);
            return error ? null : data.signedUrl;
        } catch { return null; }
    };
    
    useEffect(() => {
        if (viewingProof) {
            setLoadingImage(true);
            getTransferProofUrl(viewingProof).then(url => {
                setCurrentSignedUrl(url);
                setLoadingImage(false);
            });
        }
    }, [viewingProof, supabase]);

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Header */}
            <div className="bg-white px-6 pt-8 pb-4 sticky top-0 z-10 shadow-sm border-b border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <Link href="/dashboard" className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors">
                        <ChevronLeft className="w-6 h-6 text-slate-800" />
                    </Link>
                    <h1 className="text-lg font-bold text-slate-900">Riwayat Pengajuan</h1>
                    <div className="w-6"></div> {/* Spacer for alignment */}
                </div>
                
                {/* Category Filters */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar mt-6 -mx-6 px-6 pb-2">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                                activeCategory === cat.id 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 pb-24 max-w-xl mx-auto space-y-4">
                {isLoading ? (
                    <div className="flex justify-center p-8"><span className="loading loading-dots loading-lg text-emerald-500"></span></div>
                ) : filteredSubmissions.length > 0 ? (
                    filteredSubmissions.map((item) => (
                        <div 
                            key={item.id} 
                            onClick={() => setSelectedSubmission(item)}
                            className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-4 items-center">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${getIconBg(item.type)}`}>
                                        {getIcon(item.type)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-base">
                                            {item.type === 'barang' ? item.nama_barang : 
                                             item.type === 'izin' ? (item.jenis === 'sakit' ? 'Izin Sakit' : item.jenis === 'cuti' ? 'Cuti Tahunan' : 'Izin Lainnya') :
                                             item.type === 'uang' ? 'Pengajuan Uang' : 'Reimbursement'}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="text-slate-400 text-xs font-medium">{formatDate(item.created_at)}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-slate-500 text-xs font-medium">
                                                {
                                                    item.type === 'barang' ? `${item.jumlah} Unit` :
                                                    item.type === 'izin' ? `${item.jumlah_hari} Hari` :
                                                    item.type === 'uang' ? 'Pengajuan Uang' : 'Reimbursement'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${getStatusColor(item.normalizedStatus)}`}>
                                    {getStatusLabel(item.normalizedStatus)}
                                </span>
                            </div>

                            {/* Additional Info / Amount */}
                            <div className="pl-16">
                                {(item.type === 'uang' || item.type === 'reimbursement') && (
                                    <p className="font-bold text-slate-900 text-base mb-1">
                                        {formatCurrency(item.jumlah_uang)}
                                    </p>
                                )}
                                {item.type === 'barang' && item.normalizedStatus === 'ditolak' && (
                                    <div className="flex items-center gap-1 mt-1 text-red-500 mb-1">
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span className="text-xs font-medium">Stok tidak tersedia</span>
                                    </div>
                                )}
                                <div className="flex items-start gap-1.5">
                                    {item.type === 'izin' && <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />}
                                    {(item.type !== 'izin' && item.alasan) && <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />}
                                    
                                    <p className="text-xs text-slate-400 line-clamp-1">
                                        {item.alasan || item.keperluan || "Tidak ada detail"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-slate-500 font-medium">Tidak ada pengajuan ditemukan</p>
                    </div>
                )}
            </div>

            {/* FAB */}
            <Link href="/dashboard" className="fixed bottom-6 right-6 z-20">
                <div className="bg-emerald-500 hover:bg-emerald-600 w-14 h-14 rounded-full shadow-lg shadow-emerald-200 flex items-center justify-center transition-transform active:scale-95">
                    <Plus className="w-7 h-7 text-white" />
                </div>
            </Link>

            {/* Detail Dialog */}
            <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
                <DialogContent className="sm:max-w-md bg-white rounded-3xl p-0 overflow-hidden border-none shadow-xl">
                    <DialogTitle className="sr-only">Detail Pengajuan</DialogTitle>
                    {selectedSubmission && (
                        <div>
                            {/* Header Status */}
                            <div className={`p-6 ${getStatusColor(selectedSubmission.normalizedStatus).replace('text-', 'bg-').replace('100', '50')} border-b border-gray-100`}>
                                <div className="flex justify-between items-start mb-4">
                                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white shadow-sm`}>
                                        {getIcon(selectedSubmission.type)}
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-white/80 backdrop-blur-sm ${getStatusColor(selectedSubmission.normalizedStatus)}`}>
                                        {getStatusLabel(selectedSubmission.normalizedStatus)}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {selectedSubmission.type === 'barang' ? selectedSubmission.nama_barang : 
                                     selectedSubmission.type === 'izin' ? (selectedSubmission.jenis === 'sakit' ? 'Izin Sakit' : selectedSubmission.jenis === 'cuti' ? 'Cuti Tahunan' : 'Izin Lainnya') :
                                     selectedSubmission.type === 'uang' ? 'Pengajuan Uang' : 'Reimbursement'}
                                </h2>
                                <p className="text-slate-500 text-sm mt-1">
                                    Diajukan pada {formatDate(selectedSubmission.created_at)}
                                </p>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Details Grid */}
                                <div className="grid gap-4">
                                    {(selectedSubmission.type === 'uang' || selectedSubmission.type === 'reimbursement') && (
                                        <div className="bg-gray-50 p-4 rounded-2xl">
                                            <p className="text-xs text-gray-500 font-medium uppercase mb-1">Total Nominal</p>
                                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(selectedSubmission.jumlah_uang)}</p>
                                        </div>
                                    )}

                                    {/* Type Specific Details */}
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium uppercase">Keterangan / Alasan</p>
                                                <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                                                    {selectedSubmission.alasan || selectedSubmission.keperluan || "-"}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedSubmission.type === 'barang' && (
                                            <div className="flex items-start gap-3">
                                                <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium uppercase">Jumlah Barang</p>
                                                    <p className="text-sm text-slate-700 mt-1 font-semibold">
                                                        {selectedSubmission.jumlah} Unit
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {selectedSubmission.type === 'izin' && (
                                            <div className="flex items-start gap-3">
                                                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium uppercase">Periode Izin</p>
                                                    <p className="text-sm text-slate-700 mt-1 font-semibold">
                                                        {formatDate(selectedSubmission.tanggal_mulai)} - {formatDate(selectedSubmission.tanggal_selesai)}
                                                        <span className="text-slate-400 font-normal ml-1">({selectedSubmission.jumlah_hari} Hari)</span>
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ADMIN NOTES SECTION */}
                                {selectedSubmission.catatan_admin && (
                                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-2xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                                            <h4 className="font-bold text-yellow-800 text-sm">Catatan Admin</h4>
                                        </div>
                                        <p className="text-sm text-yellow-800/80 leading-relaxed">
                                            {selectedSubmission.catatan_admin}
                                        </p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="mt-6 pt-6 border-t border-gray-100 flex gap-3">
                                    <Button 
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold rounded-xl h-12"
                                        onClick={() => setSelectedSubmission(null)}
                                    >
                                        Tutup
                                    </Button>
                                    {selectedSubmission.bukti_transfer_url && (
                                        <Button 
                                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-12 shadow-emerald-200 shadow-lg"
                                            onClick={() => {
                                                setViewingProof(selectedSubmission.bukti_transfer_url);
                                            }}
                                        >
                                            Lihat Bukti
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Proof Modal (Separate to show on top of details or standalone) */}
            <Dialog open={!!viewingProof} onOpenChange={() => setViewingProof(null)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none z-50">
                    <DialogTitle className="sr-only">Bukti Transfer</DialogTitle>
                     <div className="bg-white rounded-3xl p-4 m-4 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800">Bukti Transfer</h3>
                            <button onClick={() => setViewingProof(null)} className="p-1 bg-gray-100 rounded-full">
                                <XCircle className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                        <div className="rounded-2xl overflow-hidden bg-gray-50 min-h-[200px] flex items-center justify-center">
                            {loadingImage ? (
                                <span className="loading loading-spinner text-emerald-500"></span>
                            ) : currentSignedUrl ? (
                                <img src={currentSignedUrl} alt="Proof" className="w-full h-auto object-contain" />
                            ) : (
                                <p className="text-xs text-gray-400">Gagal memuat gambar</p>
                            )}
                        </div>
                     </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}