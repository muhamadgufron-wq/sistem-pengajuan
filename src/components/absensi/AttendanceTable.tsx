'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LogIn, LogOut } from 'lucide-react';
import { formatTime } from '@/lib/utils/camera';
import { Badge } from '@/components/ui/badge'; // Using Badge instead of custom span if available, else standard

interface AttendanceRecord {
  id: number;
  user_id: string;
  full_name: string;
  tanggal: string;
  check_in_time: string | null;
  check_in_photo_url: string | null;
  check_in_keterangan: string | null;
  check_out_time: string | null;
  check_out_photo_url: string | null;
  status: string;
  catatan: string | null;
}

const StatusBadge = ({ status }: { status: string }) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    Hadir: { label: 'HADIR', className: 'bg-[#D1FAE5] text-[#10B981] border-transparent' },
    Izin: { label: 'IZIN', className: 'bg-[#DBEAFE] text-[#3B82F6] border-transparent' },
    Sakit: { label: 'SAKIT', className: 'bg-[#FEF3C7] text-[#D97706] border-transparent' },
    Alpha: { label: 'ALPA', className: 'bg-[#FEE2E2] text-[#EF4444] border-transparent' },
    Cuti: { label: 'CUTI', className: 'bg-purple-100 text-purple-700 border-transparent' },
    Libur: { label: 'LIBUR', className: 'bg-gray-100 text-gray-700 border-transparent' },
    Lembur: { label: 'LEMBUR', className: 'bg-orange-100 text-orange-700 border-transparent' },
  };

  // Case insensitive match
  const normalizedStatus = Object.keys(statusMap).find(k => k.toLowerCase() === status.toLowerCase()) || 'Hadir';
  const statusInfo = statusMap[normalizedStatus];

  return (
    <span className={`px-4 py-1.5 text-[10px] font-bold rounded-full tracking-wider ${statusInfo.className}`}>
      {statusInfo.label}
    </span>
  );
};

export default function AttendanceTable({ data }: { data: AttendanceRecord[] }) {
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; type: string; name: string; timestamp: string | null; date: string; } | null>(null);
  const [viewingDetail, setViewingDetail] = useState<AttendanceRecord | null>(null);

  const handleViewPhoto = (url: string, type: string, name: string, timestamp: string | null, date: string) => {
    setViewingPhoto({ url, type, name, timestamp, date });
  };

  const calculateWorkDuration = (checkIn: string | null, checkOut: string | null): string => {
    if (!checkIn || !checkOut) return '-';
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}j ${minutes}m`;
  };

  return (
    <>
      <Table>
        <TableHeader className="bg-gray-50/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[250px] font-semibold text-xs uppercase tracking-wider text-gray-500 py-4 pl-6">KARYAWAN</TableHead>
            <TableHead className="w-[180px] font-semibold text-xs uppercase tracking-wider text-gray-500 py-4">TANGGAL</TableHead>
            <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider text-gray-500 py-4">MASUK</TableHead>
            <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider text-gray-500 py-4">PULANG</TableHead>
            <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wider text-gray-500 py-4">DURASI</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-500 py-4">KETERANGAN</TableHead>
            <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider text-gray-500 text-right py-4 pr-6">STATUS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                Tidak ada data ditemukan
              </TableCell>
            </TableRow>
          ) : (
            data.map((record) => (
              <TableRow key={`${record.user_id}-${record.tanggal}`} onClick={() => setViewingDetail(record)} className="cursor-pointer hover:bg-gray-50/60 border-b border-gray-100 last:border-0">
                <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${
                            ['bg-red-100 text-red-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-orange-100 text-orange-600', 'bg-purple-100 text-purple-600'][record.full_name.length % 5]
                        }`}>
                            {record.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900">{record.full_name}</span>
                    </div>
                </TableCell>
                <TableCell className="py-4 text-gray-600">
                    {new Date(record.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell className="py-4">
                    {record.check_in_time ? (
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{formatTime(new Date(record.check_in_time))}</span>
                        {record.check_in_photo_url && (
                            <div 
                            className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" 
                            title="Ada foto"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleViewPhoto(`/api/foto-absensi/${record.check_in_photo_url}`, 'Masuk', record.full_name, record.check_in_time, record.tanggal);
                            }}
                            />
                        )}
                    </div>
                    ) : <span className="text-muted-foreground text-sm">-</span>}
                </TableCell>
                <TableCell className="py-4">
                    {record.check_out_time ? (
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{formatTime(new Date(record.check_out_time))}</span>
                        {record.check_out_photo_url && (
                            <div 
                            className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" 
                            title="Ada foto"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleViewPhoto(`/api/foto-absensi/${record.check_out_photo_url}`, 'Pulang', record.full_name, record.check_out_time, record.tanggal);
                            }}
                            />
                        )}
                    </div>
                    ) : <span className="text-muted-foreground text-sm">-</span>}
                </TableCell>
                <TableCell className="text-gray-500 font-medium text-sm py-4">
                    {calculateWorkDuration(record.check_in_time, record.check_out_time)}
                </TableCell>
                <TableCell className="truncate max-w-[150px] text-gray-500 py-4" title={record.check_in_keterangan || ''}>
                    {record.check_in_keterangan || '-'}
                </TableCell>
                <TableCell className="text-right py-4 pr-6">
                    <StatusBadge status={record.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Dialog Foto */}
      <Dialog open={!!viewingPhoto} onOpenChange={(open) => !open && setViewingPhoto(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black/95 text-white border-0">
          <DialogTitle className="sr-only">Foto Absensi</DialogTitle>
          <div className="relative flex items-center justify-center p-4 bg-muted/10 h-[60vh]">
              {viewingPhoto && (
                <img 
                  src={viewingPhoto.url} 
                  alt="Attendance Evidence" 
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Foto+Tidak+Tersedia'; }}
                />
              )}
          </div>
          <div className="p-4 bg-background text-foreground">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{viewingPhoto?.type} - {viewingPhoto?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewingPhoto?.date && new Date(viewingPhoto?.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    {' • '}
                    {viewingPhoto?.timestamp && formatTime(new Date(viewingPhoto?.timestamp))}
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setViewingPhoto(null)}>Tutup</Button>
              </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail */}
      <Dialog open={!!viewingDetail} onOpenChange={(open) => !open && setViewingDetail(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Detail Absensi</DialogTitle>
                <DialogDescription>Informasi lengkap kehadiran karyawan.</DialogDescription>
            </DialogHeader>
            {viewingDetail && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                      <div>
                        <p className="font-semibold">{viewingDetail.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                            {new Date(viewingDetail.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <StatusBadge status={viewingDetail.status} />
                  </div>
                  
                  {/* Photos Section */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <LogIn className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-sm">Masuk</span>
                        </div>
                        <div className="space-y-2">
                            <p className="text-2xl font-bold">{viewingDetail.check_in_time ? formatTime(new Date(viewingDetail.check_in_time)) : '--:--'}</p>
                            {viewingDetail.check_in_photo_url ? (
                              <div className="aspect-square relative rounded-md overflow-hidden bg-muted">
                                <img
                                  src={`/api/foto-absensi/${viewingDetail.check_in_photo_url}`}
                                  alt="Foto Masuk"
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => handleViewPhoto(`/api/foto-absensi/${viewingDetail.check_in_photo_url}`, 'Masuk', viewingDetail.full_name, viewingDetail.check_in_time, viewingDetail.tanggal)}
                                />
                              </div>
                            ) : (
                              <div className="aspect-square flex items-center justify-center bg-muted text-muted-foreground text-xs text-center rounded-md p-2">
                                Tidak ada foto
                              </div>
                            )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <LogOut className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-sm">Pulang</span>
                        </div>
                        <div className="space-y-2">
                            <p className="text-2xl font-bold">{viewingDetail.check_out_time ? formatTime(new Date(viewingDetail.check_out_time)) : '--:--'}</p>
                            {viewingDetail.check_out_photo_url ? (
                              <div className="aspect-square relative rounded-md overflow-hidden bg-muted">
                                <img
                                  src={`/api/foto-absensi/${viewingDetail.check_out_photo_url}`}
                                  alt="Foto Pulang"
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => handleViewPhoto(`/api/foto-absensi/${viewingDetail.check_out_photo_url}`, 'Pulang', viewingDetail.full_name, viewingDetail.check_out_time, viewingDetail.tanggal)}
                                />
                              </div>
                            ) : (
                              <div className="aspect-square flex items-center justify-center bg-muted text-muted-foreground text-xs text-center rounded-md p-2">
                                Tidak ada foto
                              </div>
                            )}
                        </div>
                      </div>
                  </div>

                  {/* Duration Section */}
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <span className="text-sm font-medium">Durasi Kerja</span>
                    <span className="font-bold text-lg">{calculateWorkDuration(viewingDetail.check_in_time, viewingDetail.check_out_time)}</span>
                  </div>

                  {/* Keterangan & Catatan Section */}
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Keterangan</p>
                      <p className="text-sm">{viewingDetail.check_in_keterangan || '-'}</p>
                    </div>

                    {viewingDetail.catatan && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
                          <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-400 mb-1">Catatan Tambahan</p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">{viewingDetail.catatan}</p>
                        </div>
                    )}
                  </div>
                </div>
            )}
            <DialogFooter>
                <Button  variant="destructive" onClick={() => setViewingDetail(null)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
