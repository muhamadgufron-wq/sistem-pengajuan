'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/app/lib/supabase/client'; // Pastikan path ini benar
import { toast } from "sonner";
import { format } from 'date-fns';

// Import komponen & ikon
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, SearchIcon, FilterIcon, RefreshCcwIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

// Komponen Badge Status
const StatusBadge = ({ status }: { status: string }) => {
    let statusClasses = "";
    switch (status?.toLowerCase()) {
        case 'disetujui': statusClasses = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"; break;
        case 'ditolak': statusClasses = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"; break;
        default: statusClasses = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"; break;
    }
    return <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusClasses}`}>{status}</span>;
};

// Mendefinisikan tipe data (dengan penambahan 'kategori')
interface PengajuanBarang {
    id: number;
    created_at: string;
    nama_barang: string;
    jumlah: number;
    alasan: string;
    status: string;
    user_id: string;
    full_name: string;
    catatan_admin: string;
    kategori: string | null;
}

interface PengajuanUang {
    id: number;
    created_at: string;
    jumlah_uang: number;
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

type PengajuanItem = PengajuanBarang | PengajuanUang;

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
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    
    // State untuk Dialog Update (diganti nama dari selectedItem)
    const [editingItem, setEditingItem] = useState<PengajuanItem | null>(null);
    const [newStatus, setNewStatus] = useState('');
    const [adminNote, setAdminNote] = useState('');
    const [newCategory, setNewCategory] = useState('');

    // State untuk Dialog Detail
    const [viewingItem, setViewingItem] = useState<PengajuanItem | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const rpcParams = {
            search_query: searchQuery || null,
            status_filter: statusFilter || null,
            kategori_filter: kategoriFilter || null,
            start_date_filter: startDate ? format(startDate, 'yyyy-MM-dd') : null,
            end_date_filter: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        };

        const { data: barangData, error: barangError } = await supabase.rpc('get_all_barang_submissions', rpcParams);
        const { data: uangData, error: uangError } = await supabase.rpc('get_all_uang_submissions', rpcParams);
        
        if(barangError) toast.error("Error fetching barang", { description: barangError.message });
        if(uangError) toast.error("Error fetching uang", { description: uangError.message });

        setPengajuanBarang(barangData || []);
        setPengajuanUang(uangData || []);
        setIsLoading(false);
    }, [supabase, searchQuery, statusFilter, kategoriFilter, startDate, endDate]);

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

        const { error } = await supabase.from(tableName)
            .update({ status: newStatus, catatan_admin: adminNote, kategori: newCategory })
            .eq('id', editingItem.id);

        if (error) { toast.error("Update Gagal", { description: error.message }); }
        else {
            toast.success("Update Berhasil");
            setEditingItem(null);
            fetchData();
        }
    };

    const openUpdateDialog = (item: PengajuanItem) => {
        setEditingItem(item);
        setNewStatus(item.status);
        setAdminNote(item.catatan_admin || '');
        setNewCategory(item.kategori || '');
    };

    const handleFilterReset = () => {
        setSearchQuery('');
        setStatusFilter('');
        setKategoriFilter('');
        setStartDate(undefined);
        setEndDate(undefined);
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const displayedData = activeTab === 'barang' ? pengajuanBarang : pengajuanUang;

    const kategoriBarangOptions = [{value: 'kantor', label: 'Kantor'}, {value: 'gudang', label: 'Gudang'}, {value: 'studio', label: 'Studio'}];
    const kategoriUangOptions = [{value: 'operasional', label: 'Operasional'}, {value: 'vendor', label: 'Vendor'}];
    
    const kategoriFilterOptions = activeTab === 'barang' ? kategoriBarangOptions : kategoriUangOptions;
    const kategoriDialogOptions = activeTab === 'barang' ? kategoriBarangOptions : kategoriUangOptions;

    return (
        <>
            {/* Dialog untuk Update Status */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Update Pengajuan #{editingItem?.id}</DialogTitle>
                        <DialogDescription>Ubah status, berikan catatan, dan tentukan kategori.</DialogDescription>
                    </DialogHeader>
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
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Catatan Admin</label>
                            <Textarea placeholder="Tulis catatan..." value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={handleUpdate}>Simpan Perubahan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog untuk Melihat Detail */}
            <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Detail Pengajuan #{viewingItem?.id}</DialogTitle>
                        <DialogDescription>Diajukan oleh: <span className="font-semibold">{viewingItem?.full_name}</span> pada {viewingItem && formatDate(viewingItem.created_at)}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-3 items-center gap-4 border-b pb-2"><span className="text-muted-foreground">Status</span><div className="col-span-2"><StatusBadge status={viewingItem?.status || ''} /></div></div>
                        <div className="grid grid-cols-3 items-center gap-4 border-b pb-2"><span className="text-muted-foreground">Kategori</span><div className="col-span-2 font-medium">{viewingItem?.kategori || <span className="italic text-muted-foreground">Belum Dikategorikan</span>}</div></div>
                        
                        {activeTab === 'barang' && viewingItem && 'nama_barang' in viewingItem && (
                            <><div className="grid grid-cols-3 items-center gap-4 border-b pb-2"><span className="text-muted-foreground">Nama Barang</span><span className="col-span-2 font-medium">{viewingItem.nama_barang}</span></div><div className="grid grid-cols-3 items-center gap-4 border-b pb-2"><span className="text-muted-foreground">Jumlah</span><span className="col-span-2 font-medium">{viewingItem.jumlah} unit</span></div><div className="grid grid-cols-3 items-start gap-4 border-b pb-2"><span className="text-muted-foreground">Alasan</span><span className="col-span-2">{viewingItem.alasan}</span></div></>
                        )}
                        {activeTab === 'uang' && viewingItem && 'jumlah_uang' in viewingItem && (
                            <><div className="grid grid-cols-3 items-center gap-4 border-b pb-2"><span className="text-muted-foreground">Nominal</span><span className="col-span-2 font-medium text-lg">Rp {Number(viewingItem.jumlah_uang).toLocaleString('id-ID')}</span></div><div className="grid grid-cols-3 items-start gap-4 border-b pb-2"><span className="text-muted-foreground">Keperluan</span><span className="col-span-2">{viewingItem.keperluan}</span></div><div className="grid grid-cols-3 items-center gap-4 border-b pb-2 pt-4"><span className="text-muted-foreground col-span-3 font-bold text-primary">Info Rekening</span></div><div className="grid grid-cols-3 items-center gap-4 border-b pb-2"><span className="text-muted-foreground">Bank</span><span className="col-span-2 font-medium">{viewingItem.nama_bank}</span></div><div className="grid grid-cols-3 items-center gap-4 border-b pb-2"><span className="text-muted-foreground">No. Rekening</span><span className="col-span-2 font-medium">{viewingItem.nomor_rekening}</span></div><div className="grid grid-cols-3 items-center gap-4 border-b pb-2"><span className="text-muted-foreground">Atas Nama</span><span className="col-span-2 font-medium">{viewingItem.atas_nama}</span></div></>
                        )}
                        <div className="grid grid-cols-3 items-start gap-4 pt-2"><span className="text-muted-foreground">Catatan Admin</span><div className="col-span-2 text-sm italic bg-yellow-50 p-2 rounded-md">{viewingItem?.catatan_admin || 'Belum ada catatan.'}</div></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setViewingItem(null)}>Tutup</Button></DialogFooter>
                </DialogContent>
            </Dialog>

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
                                                    <Button variant={"outline"} className="w-[180px] justify-start text-left font-normal">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "PPP") : <span>Dari Tanggal</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                                                    </PopoverContent>
                                            </Popover>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant={"outline"} className="w-[180px] justify-start text-left font-normal">
                                                        <CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "PPP") : <span>Sampai Tanggal</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
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

                    <CardContent className="p-0 flex-1 justify-between">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card/80 backdrop-blur-sm z-10">
                                <TableRow>
                                    <TableHead>Pemohon</TableHead>
                                    <TableHead>Detail Pengajuan</TableHead>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>{isLoading ? ( 
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Memuat...</TableCell>
                                </TableRow> 
                                ) : displayedData.length === 0 ? ( 
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Tidak ada data.</TableCell>
                                    </TableRow>
                                 ) : (displayedData.map(item => (<TableRow key={item.id} onClick={() => setViewingItem(item)} className="cursor-pointer hover:bg-muted/50">
                                    <TableCell className="font-medium">{item.full_name || 'Tanpa Nama'}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{activeTab === 'barang' ? `${(item as PengajuanBarang).nama_barang} (${(item as PengajuanBarang).jumlah})` : `Rp ${Number((item as PengajuanUang).jumlah_uang).toLocaleString('id-ID')}`}</div>
                                            <div className="text-xs text-muted-foreground mt-1">{item.kategori ? (<span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full">{item.kategori}</span>) : (<span className="italic">Belum Dikategorikan</span>)}</div>
                                    </TableCell>
                                    <TableCell>{formatDate(item.created_at)}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={item.status} />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openUpdateDialog(item as PengajuanItem); }}>Update</Button>
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