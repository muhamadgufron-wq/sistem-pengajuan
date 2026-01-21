'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ExternalLink } from 'lucide-react';

const StatusBadge = ({ status }: { status: string }) => {
    let statusClasses = "";
    switch (status?.toLowerCase()) {
        case 'disetujui': statusClasses = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"; break;
        case 'ditolak': statusClasses = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"; break;
        default: statusClasses = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"; break;
    }
    return <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusClasses}`}>{status}</span>;
};

interface LeaveRequest {
    id: number;
    user_id: string;
    full_name: string;
    jenis: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    jumlah_hari: number;
    alasan: string;
    bukti_url: string | null;
    status: string;
    catatan_admin: string | null;
    created_at: string;
}

export default function AdminPengajuanIzinPage() {
    const supabase = createClient();
    const router = useRouter();
    
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Dialog states
    const [editingItem, setEditingItem] = useState<LeaveRequest | null>(null);
    const [newStatus, setNewStatus] = useState('');
    const [adminNote, setAdminNote] = useState('');
    const [viewingItem, setViewingItem] = useState<LeaveRequest | null>(null);
    const [buktiItem, setBuktiItem] = useState<LeaveRequest | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const rpcParams = {
            search_query: null,
            status_filter: null,
            jenis_filter: null,
            start_date_filter: null,
            end_date_filter: null,
        };
        
        const { data, error } = await supabase.rpc('v2_get_all_leave_requests', rpcParams);
        
        if (error) {
            toast.error("Error fetching data", { description: error.message });
        }
        
        setLeaveRequests(data || []);
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        const checkAdminAndFetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { 
                router.push('/login'); 
                return; 
            }
            
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            
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
        
        const updateData: { [key: string]: any } = {
            status: newStatus,
            catatan_admin: adminNote,
        };

        const { error } = await supabase
            .from('pengajuan_izin')
            .update(updateData)
            .eq('id', editingItem.id);

        if (error) { 
            toast.error("Update Gagal", { description: error.message }); 
        } else {
            toast.success("Update Berhasil");
            setEditingItem(null);
            fetchData();
        }
    };

    const openUpdateDialog = (item: LeaveRequest) => {
        setEditingItem(item);
        setNewStatus(item.status);
        setAdminNote(item.catatan_admin || '');
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });

    return (
        <>
            {/* Dialog Update */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Update Pengajuan Izin #{editingItem?.id}</DialogTitle>
                        <DialogDescription>
                            Diajukan oleh: {editingItem?.full_name || '-'} | {editingItem && formatDate(editingItem.created_at)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="my-2 space-y-2 border bg-muted/30 p-3 rounded-md">
                        <p className="text-sm font-semibold text-foreground">Detail Pengajuan:</p>
                        {editingItem && (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-medium">{editingItem.jenis.toUpperCase()}</span> - {editingItem.jumlah_hari} hari
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {formatDate(editingItem.tanggal_mulai)} s/d {formatDate(editingItem.tanggal_selesai)}
                                </p>
                                <p className="text-sm text-muted-foreground italic">
                                    {editingItem.alasan}
                                </p>
                            </>
                        )}
                    </div>
                    
                    <div className="grid gap-4 py-4">
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
                            <Textarea 
                                placeholder="Tulis catatan..." 
                                value={adminNote} 
                                onChange={(e) => setAdminNote(e.target.value)} 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={handleUpdate} className="bg-emerald-500 text-white shadow-md shadow-emerald-200 hover:bg-emerald-600">
                            Simpan Perubahan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Detail */}
            <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Detail Pengajuan Izin #{viewingItem?.id}</DialogTitle>
                        <DialogDescription>
                            Diajukan oleh: <span className="font-semibold">{viewingItem?.full_name}</span> pada {viewingItem && formatDate(viewingItem.created_at)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
                        <div className="grid grid-cols-3 items-center gap-4 border-b pb-2">
                            <span className="text-muted-foreground">Status</span>
                            <div className="col-span-2"><StatusBadge status={viewingItem?.status || ''} /></div>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4 border-b pb-2">
                            <span className="text-muted-foreground">Jenis</span>
                            <div className="col-span-2 font-medium uppercase">{viewingItem?.jenis}</div>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4 border-b pb-2">
                            <span className="text-muted-foreground">Tanggal</span>
                            <div className="col-span-2 font-medium">
                                {viewingItem && `${formatDate(viewingItem.tanggal_mulai)} - ${formatDate(viewingItem.tanggal_selesai)}`}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4 border-b pb-2">
                            <span className="text-muted-foreground">Jumlah Hari</span>
                            <div className="col-span-2 font-medium">{viewingItem?.jumlah_hari} hari</div>
                        </div>
                        <div className="grid grid-cols-3 items-start gap-4 border-b pb-2">
                            <span className="text-muted-foreground">Alasan</span>
                            <div className="col-span-2">{viewingItem?.alasan}</div>
                        </div>
                        <div className="grid grid-cols-3 items-start gap-4 pt-2">
                            <span className="text-muted-foreground">Catatan Admin</span>
                            <div className="col-span-2 text-sm italic bg-yellow-50 p-2 rounded-md">
                                {viewingItem?.catatan_admin || 'Belum ada catatan.'}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="destructive" onClick={() => setViewingItem(null)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Bukti */}
            <Dialog open={!!buktiItem} onOpenChange={(open) => !open && setBuktiItem(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Bukti Pendukung</DialogTitle>
                        <DialogDescription>
                            Bukti untuk pengajuan #{buktiItem?.id} oleh {buktiItem?.full_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 flex justify-center items-center min-h-[200px]">
                        {buktiItem?.bukti_url ? (
                            (() => {
                                const buktiPath = buktiItem.bukti_url!;
                                const apiBuktiUrl = `/api/bukti-izin/${buktiPath}`;
                                const isImage = /\.(jpg|jpeg|png)$/i.test(buktiPath);
                                
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
                                                                    <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-3">File bukti tidak tersedia di storage.</p>
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
                                    // PDF file
                                    return (
                                        <div className="text-center space-y-3">
                                            <div className="text-6xl mb-4">📄</div>
                                            <p className="text-sm text-muted-foreground mb-4">File PDF</p>
                                            <Button asChild size="lg">
                                                <a href={apiBuktiUrl} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    Buka PDF
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
                                Tidak ada bukti yang dilampirkan
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBuktiItem(null)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Main Content */}
            <div className="h-full flex flex-col gap-6">
                <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border">
                    <CardHeader className="p-0 flex-shrink-0">
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-lg font-semibold">Daftar Pengajuan Izin</h3>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card/80 backdrop-blur-sm z-10">
                                <TableRow>
                                    <TableHead className="px-6">Pemohon</TableHead>
                                    <TableHead className="px-6">Jenis</TableHead>
                                    <TableHead className="px-6">Tanggal</TableHead>
                                    <TableHead className="px-6">Jumlah Hari</TableHead>
                                    <TableHead className="px-6">Status</TableHead>
                                    <TableHead className="px-6 text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? ( 
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center px-6 py-4">Memuat...</TableCell>
                                    </TableRow> 
                                ) : leaveRequests.length === 0 ? ( 
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center px-6 py-4">Tidak ada data.</TableCell>
                                    </TableRow>
                                ) : (
                                    leaveRequests.map(item => (
                                        <TableRow 
                                            key={item.id} 
                                            onClick={() => setViewingItem(item)}
                                            className="cursor-pointer hover:bg-muted/50"
                                        >
                                            <TableCell className="px-6 py-4 font-medium">{item.full_name || 'Tanpa Nama'}</TableCell>
                                            <TableCell className="px-6 py-4">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium uppercase">
                                                    {item.jenis}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <div className="text-sm">
                                                    <div>{formatDate(item.tanggal_mulai)}</div>
                                                    <div className="text-muted-foreground">s/d {formatDate(item.tanggal_selesai)}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 font-medium">{item.jumlah_hari} hari</TableCell>
                                            <TableCell className="px-6 py-4">
                                                <StatusBadge status={item.status} />
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right space-x-2">
                                                {item.bukti_url && (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setBuktiItem(item);
                                                        }}
                                                    >
                                                        Lihat Bukti
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="default" 
                                                    size="sm" 
                                                    className="bg-emerald-500 text-white shadow-md shadow-emerald-200 hover:bg-emerald-600 border-none"
                                                    onClick={(e) => { 
                                                        e.stopPropagation();
                                                        openUpdateDialog(item); 
                                                    }}
                                                >
                                                    Update
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
