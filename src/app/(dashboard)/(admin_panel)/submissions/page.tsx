'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { toast } from "sonner";
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, SearchIcon, FilterIcon, RefreshCcwIcon, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from "react-day-picker";


const StatusBadge = ({ status }: { status: string }) => {
    let statusClasses = "";
    switch (status?.toLowerCase()) {
        case 'disetujui': statusClasses = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"; break;
        case 'ditolak': statusClasses = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"; break;
        default: statusClasses = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"; break;
    }
    return <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusClasses}`}>{status}</span>;
};


interface PengajuanBarang {
    id: number;
    created_at: string;
    nama_barang: string;
    jumlah: number;
    jumlah_disetujui: number | null;
    alasan: string;
    status: string;
    user_id: string;
    full_name: string;
    catatan_admin: string;
    kategori: string | null;
}
interface PengajuanUang {
    bukti_laporan_url: any;
    id: number;
    created_at: string;
    jumlah_uang: number;
    jumlah_disetujui: number | null; 
    keperluan: string;
    status: string;
    nama_bank: string;
    nomor_rekening: string;
    atas_nama: string;
    user_id: string;
    full_name: string;
    catatan_admin: string;
    kategori: string | null;
}
interface ViewingItem {
  id?: string | number;
  bukti_laporan_url?: string;
  [key: string]: any;
}
type PengajuanItem = PengajuanBarang | PengajuanUang;

// Fungsi untuk memformat nomor dengan pemisah ribuan
const formatNumber = (value: string) => {
  const rawValue = value.replace(/[^0-9]/g, '');
  if (rawValue === '') return '';
  return new Intl.NumberFormat('id-ID').format(Number(rawValue));
};


export default function AdminPage() {
    const supabase = createClient();
    const router = useRouter();
    
    const [pengajuanBarang, setPengajuanBarang] = useState<PengajuanBarang[]>([]);
    const [pengajuanUang, setPengajuanUang] = useState<PengajuanUang[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('barang');
    
    // State untuk filter
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [kategoriFilter, setKategoriFilter] = useState('');

    // Helper untuk mendapatkan awal dan akhir minggu ini
    const getThisWeekRange = (): DateRange => {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Senin minggu ini
        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Minggu minggu ini
        return { from: start, to: end };
    };

    const [date, setDate] = useState<DateRange | undefined>(getThisWeekRange());
    
    // State untuk Dialog Update
    const [editingItem, setEditingItem] = useState<PengajuanItem | null>(null);
    const [newStatus, setNewStatus] = useState('');
    const [adminNote, setAdminNote] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [approvedAmount, setApprovedAmount] = useState<string>('');
    const [displayApprovedAmount, setDisplayApprovedAmount] = useState<string>('');
    const [viewingItem, setViewingItem] = useState<PengajuanItem | null>(null);
    const [buktiItem, setBuktiItem] = useState<PengajuanUang | null>(null);
    const [imageLoadError, setImageLoadError] = useState(false);
    const [approvedQuantity, setApprovedQuantity] = useState<string>('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const rpcParams = {
            search_query: searchQuery || null,
            status_filter: statusFilter || null,
            kategori_filter: kategoriFilter || null,
            start_date_filter: date?.from ? format(date.from, 'yyyy-MM-dd') : null,
            end_date_filter: date?.to ? format(date.to, 'yyyy-MM-dd') : null,
        };
        const { data: barangData, error: barangError } = await supabase.rpc('v2_get_all_barang_submissions', rpcParams);
        const { data: uangData, error: uangError } = await supabase.rpc('v2_get_all_uang_submissions', rpcParams);
        if(barangError) toast.error("Error fetching barang", { description: barangError.message });
        if(uangError) toast.error("Error fetching uang", { description: uangError.message });
        setPengajuanBarang(barangData || []);
        setPengajuanUang(uangData || []);
        setIsLoading(false);
    }, [supabase, searchQuery, statusFilter, kategoriFilter, date]);

    
    useEffect(() => {
        const checkAdminAndFetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
                router.push('/dashboard');
                return;
            }
            fetchData();
        };
        checkAdminAndFetchData();
    }, [fetchData, router, supabase]);

    
    const handleUpdate = async () => {
        if (!editingItem) return;
        
        const tableName = activeTab === 'barang' ? 'pengajuan_barang' : 'pengajuan_uang';

        const updateData: { [key: string]: any } = {
            status: newStatus,
            catatan_admin: adminNote,
            kategori: newCategory
        };

        if (activeTab === 'uang') {
            const finalAmount = parseFloat(approvedAmount); 
            if (isNaN(finalAmount) || finalAmount < 0) {
                 toast.error("Jumlah disetujui tidak valid.");
                 return;
            }
            updateData.jumlah_disetujui = finalAmount;
        } else if (activeTab === 'barang') {
            // Hanya validasi dan update jika ada input
            if (approvedQuantity && approvedQuantity.trim() !== '') {
                const finalQuantity = parseInt(approvedQuantity);
                if (isNaN(finalQuantity) || finalQuantity < 0) {
                    toast.error("Jumlah disetujui tidak valid.");
                    return;
                }
                updateData.jumlah_disetujui = finalQuantity;
            }
        }

        const { error } = await supabase.from(tableName)
            .update(updateData)
            .eq('id', editingItem.id);

        if (error) { toast.error("Update Gagal", { description: error.message }); } 
        else {
            toast.success("Update Berhasil");
            setEditingItem(null);
            setApprovedAmount(''); 
            setDisplayApprovedAmount('');
            setApprovedQuantity('');
            fetchData();
        }
    };

    const openUpdateDialog = (item: PengajuanItem) => {
        setEditingItem(item);
        setNewStatus(item.status);
        setAdminNote(item.catatan_admin || '');
        setNewCategory(item.kategori || '');

        if ('jumlah_uang' in item) {
            const amount = (item as PengajuanUang).jumlah_disetujui ?? (item as PengajuanUang).jumlah_uang;
            setApprovedAmount(String(amount)); 
            setDisplayApprovedAmount(formatNumber(String(amount)));
            setApprovedQuantity('');
        } else {
            const quantity = (item as PengajuanBarang).jumlah_disetujui ?? (item as PengajuanBarang).jumlah;
            setApprovedQuantity(String(quantity));
            setApprovedAmount('');
            setDisplayApprovedAmount('');
        }
    };

    
    const handleApprovedAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const rawValue = value.replace(/[^0-9]/g, '');
      setApprovedAmount(rawValue); 
      
      const formattedValue = formatNumber(rawValue);
      setDisplayApprovedAmount(formattedValue); 
    };


    const handleFilterReset = () => {
        setSearchQuery('');
        setStatusFilter('');
        setKategoriFilter('');
        setDate(getThisWeekRange());
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const displayedData = activeTab === 'barang' ? pengajuanBarang : pengajuanUang;
    const kategoriBarangOptions = [{value: 'kantor', label: 'Kantor'}, {value: 'gudang', label: 'Gudang'}, {value: 'studio', label: 'Studio'}];
    const kategoriUangOptions = [{value: 'operasional', label: 'Operasional'}, {value: 'vendor', label: 'Vendor'}];
    const kategoriFilterOptions = activeTab === 'barang' ? kategoriBarangOptions : kategoriUangOptions;
    const kategoriDialogOptions = activeTab === 'barang' ? kategoriBarangOptions : kategoriUangOptions;

    return (
        <>
            {/* 🔽 --- DIALOG UPDATE DENGAN INPUT SEPARATOR --- 🔽 */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Update Pengajuan #{editingItem?.id}</DialogTitle>
                        <DialogDescription>
                            Diajukan oleh: {editingItem?.full_name || '-'} | {editingItem && formatDate(editingItem.created_at)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="my-2 space-y-2 border bg-muted/30 p-3 rounded-md">
                        <p className="text-sm font-semibold text-foreground">Detail Pengajuan:</p>
                        {editingItem && 'nama_barang' in editingItem && (
                            <p className="text-sm text-muted-foreground">{editingItem.nama_barang} ({editingItem.jumlah} unit)</p>
                        )}
                        {editingItem && 'jumlah_uang' in editingItem && (
                             <p className="text-sm text-muted-foreground">Rp {Number(editingItem.jumlah_uang).toLocaleString('id-ID')} - {editingItem.keperluan}</p>
                        )}
                    </div>
                    
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Kategori</label>
                            <Select onValueChange={setNewCategory} value={newCategory}>
                                <SelectTrigger><SelectValue placeholder="Pilih Kategori..." /></SelectTrigger>
                                <SelectContent>
                                    {kategoriDialogOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status Baru</label>
                            <Select onValueChange={setNewStatus} value={newStatus}>
                                <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="disetujui">Disetujui</SelectItem>
                                    <SelectItem value="ditolak">Ditolak</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Input Jumlah Disetujui (DIPERBARUI) */}
                        {editingItem && 'jumlah_uang' in editingItem && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Jumlah Disetujui (Rp)</label>
                                <Input 
                                    type="text" 
                                    inputMode="numeric" 
                                    value={displayApprovedAmount} 
                                    onChange={handleApprovedAmountChange} 
                                    placeholder="Masukkan nominal yang disetujui"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Diminta: Rp {Number((editingItem as PengajuanUang).jumlah_uang).toLocaleString('id-ID')}
                                </p>
                            </div>
                        )}

                        {/* Input Jumlah Disetujui untuk Barang */}
                        {editingItem && 'nama_barang' in editingItem && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Jumlah Disetujui (Unit)</label>
                                <Input 
                                    type="number" 
                                    min="0"
                                    value={approvedQuantity} 
                                    onChange={(e) => setApprovedQuantity(e.target.value)} 
                                    placeholder="Masukkan jumlah yang disetujui"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Diminta: {(editingItem as PengajuanBarang).jumlah} unit
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Catatan Admin</label>
                            <Textarea placeholder="Tulis catatan..." value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={handleUpdate} className="bg-green-300 hover:bg-green-500" >Simpan Perubahan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 🔽 --- DIALOG DETAIL DENGAN TAMPILAN NOMINAL BARU --- 🔽 */}
            <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Detail Pengajuan #{viewingItem?.id}</DialogTitle>
                        <DialogDescription>Diajukan oleh: <span className="font-semibold">{viewingItem?.full_name}</span> pada {viewingItem && formatDate(viewingItem.created_at)}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
                        <div className="grid grid-cols-3 items-center gap-4 border-b pb-2">
                            <span className="text-muted-foreground">Status</span>
                            <div className="col-span-2"><StatusBadge status={viewingItem?.status || ''} /></div>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4 border-b pb-2">
                            <span className="text-muted-foreground">Kategori</span>
                            <div className="col-span-2 font-medium">{viewingItem?.kategori || <span className="italic text-muted-foreground">Belum Dikategorikan</span>}</div>
                        </div>
                        
                        {activeTab === 'barang' && viewingItem && 'nama_barang' in viewingItem && (
                            <>
                                <div className="grid grid-cols-3 items-center gap-4 border-b pb-2"><span className="text-muted-foreground">Nama Barang</span><span className="col-span-2 font-medium">{viewingItem.nama_barang}</span></div>
                                <div className="grid grid-cols-3 items-center gap-4 border-b pb-2">
                                    <span className="text-muted-foreground">Jumlah</span>
                                    <span className="col-span-2">
                                        {viewingItem.jumlah_disetujui != null && viewingItem.jumlah_disetujui !== viewingItem.jumlah ? (
                                            <div>
                                                <div className="font-medium text-green-600">{viewingItem.jumlah_disetujui} unit (disetujui)</div>
                                                <div className="text-sm text-muted-foreground line-through">{viewingItem.jumlah} unit (diminta)</div>
                                            </div>
                                        ) : (
                                            <span className="font-medium">{viewingItem.jumlah_disetujui ?? viewingItem.jumlah} unit</span>
                                        )}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 items-start gap-4 border-b pb-2"><span className="text-muted-foreground">Alasan</span><span className="col-span-2">{viewingItem.alasan}</span></div>
                            </>
                        )}
                        
                        {activeTab === 'uang' && viewingItem && 'jumlah_uang' in viewingItem && (
                            <>
                                <div className="grid grid-cols-3 items-center gap-4 border-b pb-2">
                                    <span className="text-muted-foreground">Nominal</span>
                                    {/* 🔽 PERBAIKAN TAMPILAN NOMINAL 🔽 */}
                                    <div className="col-span-2">
                                        <span className="font-medium text-lg">
                                            Rp {Number(viewingItem.jumlah_uang).toLocaleString('id-ID')}
                                            <span className="text-sm text-muted-foreground ml-1">(Diajukan)</span>
                                        </span>
                                        
                                        {/* Tampilkan jumlah disetujui (jika ada, atau tampilkan 'belum diproses') */}
                                        {viewingItem.jumlah_disetujui != null ? (
                                            <span className="font-medium text-lg text-emerald-600 block">
                                                Rp {Number(viewingItem.jumlah_disetujui).toLocaleString('id-ID')}
                                                <span className="text-sm text-emerald-500 ml-1">(Disetujui)</span>
                                            </span>
                                        ) : (
                                            <span className="font-medium text-sm text-muted-foreground block">
                                                (Belum ada nominal disetujui)
                                            </span>
                                        )}
                                    </div>
                                    {/* 🔼 AKHIR PERBAIKAN 🔼 */}
                                </div>
                                <div className="grid grid-cols-3 items-start gap-4 border-b pb-2"><span className="text-muted-foreground">Keperluan</span><span className="col-span-2">{viewingItem.keperluan}</span></div>
                                <div className="grid grid-cols-3 items-center gap-4 border-b pb-2 pt-4"><span className="text-muted-foreground col-span-3 font-bold text-primary">Info Rekening</span></div>
                                <div className="grid grid-cols-3 items-center gap-4 border-b pb-2"><span className="text-muted-foreground">Bank</span><span className="col-span-2 font-medium">{viewingItem.nama_bank}</span></div>
                                <div className="grid grid-cols-3 items-center gap-4 border-b pb-2"><span className="text-muted-foreground">No. Rekening</span><span className="col-span-2 font-medium">{viewingItem.nomor_rekening}</span></div>
                                <div className="grid grid-cols-3 items-center gap-4 border-b pb-2"><span className="text-muted-foreground">Atas Nama</span><span className="col-span-2 font-medium">{viewingItem.atas_nama}</span></div>
                            </>
                        )}
                        
                        <div className="grid grid-cols-3 items-start gap-4 pt-2">
                            <span className="text-muted-foreground">Catatan Admin</span>
                            <div className="col-span-2 text-sm italic bg-yellow-50 p-2 rounded-md">{viewingItem?.catatan_admin || 'Belum ada catatan.'}</div>
                        </div>
                    </div> 
                    <DialogFooter>
                        <Button variant="destructive" onClick={() => setViewingItem(null)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ... (Dialog Bukti Laporan Anda tetap sama) ... */}
            <Dialog open={!!buktiItem} onOpenChange={(open) => !open && setBuktiItem(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Bukti Laporan</DialogTitle>
                        <DialogDescription>
                            Bukti laporan untuk pengajuan #{buktiItem?.id} oleh {buktiItem?.full_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 flex justify-center items-center min-h-[200px]">
                        {buktiItem?.bukti_laporan_url ? (
                            (() => {
                                const buktiPath = buktiItem.bukti_laporan_url!;
                                const apiBuktiUrl = `/api/bukti/${buktiPath}`;
                                // Support lebih banyak format gambar
                                const isImage = true; // Selalu coba tampilkan sebagai gambar
                                
                                if (isImage) {
                                    return (
                                        <div className="w-full space-y-3">
                                            <a 
                                                href={apiBuktiUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="block cursor-pointer hover:opacity-90 transition-opacity"
                                                title="Klik untuk membuka di tab baru"
                                            >
                                                <img
                                                    src={apiBuktiUrl}
                                                    alt={`Bukti ${buktiItem.id}`}
                                                    className="w-full h-auto object-contain max-h-[60vh] rounded-lg border shadow-sm"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        const parent = target.parentElement;
                                                        if (parent) {
                                                            parent.innerHTML = `
                                                                <div class="text-center py-10 px-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                                                                    <p class="text-yellow-800 dark:text-yellow-200 font-medium mb-2">⚠️ File Tidak Ditemukan</p>
                                                                    <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-3">File bukti laporan tidak tersedia di storage.</p>
                                                                    <p class="text-xs text-yellow-600 dark:text-yellow-400 font-mono">${buktiPath}</p>
                                                                </div>
                                                            `;
                                                        }
                                                    }}
                                                />
                                            </a>
                                            <p className="text-xs text-center text-muted-foreground">
                                                💡 Klik gambar untuk membuka di tab baru
                                            </p>
                                        </div>
                                    );
                                } else {
                                    // Untuk file non-gambar (PDF, dll)
                                    const isPDF = /\.pdf$/i.test(buktiPath);
                                    return (
                                        <div className="text-center space-y-3">
                                            <div className="text-6xl mb-4">{isPDF ? '📄' : '📎'}</div>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                {isPDF ? 'File PDF' : 'File Lampiran'}
                                            </p>
                                            <Button asChild size="lg">
                                                <a href={apiBuktiUrl} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    {isPDF ? 'Buka PDF' : 'Lihat File'}
                                                </a>
                                            </Button>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {buktiPath.split('/').pop()}
                                            </p>
                                        </div>
                                    );
                                }
                            })()
                        ) : (
                            <p className="text-center text-muted-foreground py-10 font-medium">
                                Belum melakukan laporan
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBuktiItem(null)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ... (Layout Utama Halaman Anda tetap sama) ... */}
            <div className="h-full flex flex-col gap-6">
                <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border">
                    <div className="flex-shrink-0 border-b pb-6">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold flex items-center gap-2 text-primary">
                                <FilterIcon className="h-5 w-5"/> Filter Pengajuan
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap items-center justify-between gap-y-4">
                                <div className="flex flex-wrap item-center gap-4">
                                    <div className="relative lg:col-span-2">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Cari pemohon / item..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-64" />
                                    </div>
                                    <Select onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)} value={statusFilter || 'all'}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Status</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="disetujui">Disetujui</SelectItem>
                                            <SelectItem value="ditolak">Ditolak</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select onValueChange={(value) => setKategoriFilter(value === 'all' ? '' : value)} value={kategoriFilter || 'all'}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua Kategori" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Kategori
                                            </SelectItem>{kategoriFilterOptions.map(opt => 
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}
                                            </SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant={"outline"} className={`w-[260px] justify-start text-left font-normal ${!date ? "text-muted-foreground" : ""}`}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {date?.from ? (
                                                    date.to ? (
                                                        <>
                                                            {format(date.from, "dd LLL y")} - {format(date.to, "dd LLL y")}
                                                        </>
                                                    ) : (
                                                        format(date.from, "dd LLL y")
                                                    )
                                                ) : (
                                                    <span>Pilih Rentang Tanggal</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={date?.from}
                                                selected={date}
                                                onSelect={setDate}
                                                numberOfMonths={2}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Button onClick={fetchData}><SearchIcon className="mr-2 h-4 w-4" /> Terapkan</Button>
                                    <Button onClick={handleFilterReset} variant="outline"><RefreshCcwIcon className="mr-2 h-4 w-4" /> Reset</Button>
                                </div>
                            </div> 
                        </CardContent>
                    </div>
                    
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <CardHeader className="p-0 flex-shrink-0">
                            <nav className="px-6">
                                <div className="-mb-px flex space-x-8">
                                    <button onClick={() => { setActiveTab('barang'); handleFilterReset(); }} className={`${activeTab === 'barang' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'} py-4 px-1 border-b-2`}>Pengajuan Barang</button>
                                    <button onClick={() => { setActiveTab('uang'); handleFilterReset(); }} className={`${activeTab === 'uang' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'} py-4 px-1 border-b-2`}>Pengajuan Uang</button>
                                </div>
                            </nav>
                        </CardHeader>

                        {/* 🔽🔽 PERUBAHAN TAMPILAN NOMINAL ADA DI SINI 🔽🔽 */}
                        <CardContent className="p-0 flex-1 overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card/80 backdrop-blur-sm z-10">
                                    <TableRow>
                                        <TableHead className="px-6">Pemohon</TableHead>
                                        <TableHead className="px-6">Detail Pengajuan</TableHead>
                                        <TableHead className="px-6">Kategori</TableHead>
                                        <TableHead className="px-6">Tanggal</TableHead>
                                        <TableHead className="px-6">Status</TableHead>
                                        <TableHead className="px-6 text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>{isLoading ? ( 
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center px-6 py-4">Memuat...</TableCell>
                                    </TableRow> 
                                    ) : displayedData.length === 0 ? ( 
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center px-6 py-4">Tidak ada data.</TableCell>
                                    </TableRow>
                                    ) : (displayedData.map(item => (
                                      <TableRow 
                                        key={item.id} 
                                        onClick={() => setViewingItem(item)}
                                        className="cursor-pointer hover:bg-muted/50"
                                      >
                                        
                                        <TableCell className="px-6 py-4 font-medium">{item.full_name || 'Tanpa Nama'}</TableCell>
                                        
                                        {/* Kolom Detail Pengajuan (LOGIKA BARU) */}
                                        <TableCell className="px-6 py-4">
                                            {activeTab === 'barang' ? (
                                                (() => {
                                                    const barangItem = item as PengajuanBarang;
                                                    const diminta = barangItem.jumlah;
                                                    const disetujui = barangItem.jumlah_disetujui;
                                                    const isPartial = disetujui != null && disetujui !== diminta;
                                                    const isApprovedOrRejected = item.status !== 'pending';

                                                    return (
                                                        <div>
                                                            {/* Tampilkan jumlah yang disetujui/final jika ada & tidak sama */}
                                                            {isPartial && isApprovedOrRejected ? (
                                                                <>
                                                                    <div className="font-medium text-emerald-600">
                                                                        {Number(disetujui).toLocaleString('id-ID')} unit
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground line-through">
                                                                        {Number(diminta).toLocaleString('id-ID')} unit
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                // Tampilan Normal (Jumlah yang diminta atau disetujui jika sama)
                                                                <div className="font-medium">
                                                                    {Number(disetujui ?? diminta).toLocaleString('id-ID')} unit
                                                                </div>
                                                            )}
                                                            
                                                            <div className="text-xs text-muted-foreground truncate w-40" title={barangItem.nama_barang}>
                                                                {barangItem.nama_barang}
                                                            </div>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                (() => {
                                                    const uangItem = item as PengajuanUang;
                                                    const diminta = uangItem.jumlah_uang;
                                                    const disetujui = uangItem.jumlah_disetujui;
                                                    const isPartial = disetujui != null && disetujui !== diminta;
                                                    const isApprovedOrRejected = item.status !== 'pending';

                                                    return (
                                                        <div>
                                                            {/* Tampilkan nominal yang disetujui/final jika ada & tidak sama */}
                                                            {isPartial && isApprovedOrRejected ? (
                                                                <>
                                                                    <div className="font-medium text-emerald-600">
                                                                        Rp {Number(disetujui).toLocaleString('id-ID')}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground line-through">
                                                                        Rp {Number(diminta).toLocaleString('id-ID')}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                // Tampilan Normal (Jumlah yang diminta atau disetujui jika sama)
                                                                <div className="font-medium">
                                                                    Rp {Number(disetujui ?? diminta).toLocaleString('id-ID')}
                                                                </div>
                                                            )}
                                                            
                                                            <div className="text-xs text-muted-foreground truncate w-40" title={uangItem.keperluan}>
                                                                {uangItem.keperluan}
                                                            </div>
                                                        </div>
                                                    );
                                                })()
                                            )}
                                        </TableCell>

                                        <TableCell className="px-6 py-4">
                                          {item.kategori ? (
                                            <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full text-xs font-medium">
                                              {item.kategori}
                                            </span>
                                          ) : (
                                            <span className="italic text-muted-foreground text-xs">Belum Ada</span>
                                          )}
                                        </TableCell>
                                        
                                        <TableCell className="px-6 py-4">{formatDate(item.created_at)}</TableCell>

                                        <TableCell className="px-6 py-4">
                                            <StatusBadge status={item.status} />
                                        </TableCell>
                                        
                                        <TableCell className="px-6 py-4 text-right space-x-2">
                                            {activeTab === 'uang' && (
                                              <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setBuktiItem(item as PengajuanUang);
                                                }}
                                              >
                                                Lihat Bukti
                                              </Button>
                                            )}

                                            <Button 
                                                variant="default" 
                                                size="sm" 
                                                onClick={(e) => { 
                                                    e.stopPropagation();
                                                    openUpdateDialog(item as PengajuanItem); 
                                                }}>
                                                Update
                                            </Button>
                                        </TableCell>

                                    </TableRow>)))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </div>
                </Card> 
            </div>
        </>
    );
}