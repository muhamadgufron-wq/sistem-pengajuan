'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, FileText, Users, LogOut, Package, DollarSign, History } from 'lucide-react'; // Ikon
import { toast } from 'sonner';

interface SidebarProps {
    fullName: string;
    role: string;
}

export default function Sidebar({ fullName, role }: SidebarProps) {
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success("Anda telah berhasil logout.");
        router.push('/login');
        router.refresh();
    };

    return (
        <aside className="w-64 h-screen bg-card text-card-foreground flex flex-col border-r shadow-md">
            {/* Header Sidebar */}
            <div className="p-6 border-b">
                <h2 className="text-xl font-bold">Sistem Pengajuan</h2>
                <p className="text-sm text-muted-foreground mt-2">
                    Selamat datang, <br />
                    <span className="font-semibold text-foreground">{fullName}</span>
                </p>
            </div>
            
            {/* Menu Navigasi */}
            <nav className="flex-1 px-4 py-6 space-y-2">
                <Link href="/admin" passHref>
                    <Button variant="ghost" className="w-full justify-start text-base">
                        <Home className="mr-3 h-5 w-5" /> Dashboard
                    </Button>
                </Link>

                {/* Menu untuk Karyawan */}
                {role === 'karyawan' && (
                    <>
                        <Link href="/ajukan-barang" passHref>
                            <Button variant="ghost" className="w-full justify-start text-base">
                                <Package className="mr-3 h-5 w-5" /> Ajukan Barang
                            </Button>
                        </Link>
                        <Link href="/ajukan-uang" passHref>
                            <Button variant="ghost" className="w-full justify-start text-base">
                                <DollarSign className="mr-3 h-5 w-5" /> Ajukan Uang
                            </Button>
                        </Link>
                         <Link href="/status-pengajuan" passHref>
                            <Button variant="ghost" className="w-full justify-start text-base">
                                <History className="mr-3 h-5 w-5" /> Riwayat & Status
                            </Button>
                        </Link>
                    </>
                )}

                {/* Menu untuk Admin & Superadmin */}
                {(role === 'admin' || role === 'superadmin') && (
                    <Link href="/submissions" passHref>
                        <Button variant="ghost" className="w-full justify-start text-base">
                            <FileText className="mr-3 h-5 w-5" /> Panel Pengajuan
                        </Button>
                    </Link>
                )}
                
                {/* Menu untuk Superadmin */}
                {role === 'superadmin' && (
                     <Link href="/manage-users" passHref>
                        <Button variant="ghost" className="w-full justify-start text-base">
                            <Users className="mr-3 h-5 w-5" /> Manajemen User
                        </Button>
                    </Link>
                )}
            </nav>

            {/* Tombol Logout di Bawah */}
            <div className="p-4 mt-auto border-t">
                <Button variant="destructive" className="w-full" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
            </div>
        </aside>
    );
}