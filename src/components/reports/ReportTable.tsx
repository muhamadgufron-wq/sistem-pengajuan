import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ReportDetail } from "@/app/(dashboard)/(admin_panel)/reports/page";

export default function ReportTable({ details }: { details: ReportDetail[] }) {
    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipe</TableHead>
                            <TableHead>Judul / Keperluan</TableHead>
                            <TableHead>Pengaju</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Nominal / Jumlah</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tanggal</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {details.map(item => (
                            <TableRow key={`${item.tipe}-${item.id}`}>
                                <TableCell><span className={`px-2 py-0.5 rounded-full text-xs ${item.tipe === 'barang' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{item.tipe}</span></TableCell>
                                <TableCell className="font-medium">{item.judul}</TableCell>
                                <TableCell>{item.pengaju}</TableCell>
                                <TableCell>{item.kategori || '-'}</TableCell>
                                <TableCell>
                                    {item.tipe === 'uang' ? (
                                        <div className="flex flex-col">
                                            <span className="font-medium">Rp {item.nominal.toLocaleString('id-ID')}</span>
                                            {item.nominal_disetujui != null && item.nominal_pengajuan != null && item.nominal_disetujui !== item.nominal_pengajuan && item.status.toLowerCase() === 'disetujui' && (
                                                <span className="text-xs text-muted-foreground line-through">
                                                    Req: Rp {item.nominal_pengajuan.toLocaleString('id-ID')}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span>{item.nominal} Unit</span>
                                    )}
                                </TableCell>
                                <TableCell>{item.status}</TableCell>
                                <TableCell>{new Date(item.tanggal).toLocaleDateString('id-ID')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}