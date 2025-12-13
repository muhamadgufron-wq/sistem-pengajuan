'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { Button } from '@/components/ui/button';
// ❗️ 'Settings' sudah tidak diperlukan lagi, kecuali Anda mau ganti logo
import { Home, FileText, Users, LogOut, BarChart3, Settings, Calendar, ClipboardList } from 'lucide-react'; 
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
    fullName: string;
    role: string;
    isSidebarOpen: boolean;
}

/**
 * Komponen NavLink
 */
const NavLink = ({ href, icon: Icon, label, isSidebarOpen, pathname }: { 
    href: string; 
    icon: React.ElementType; 
    label: string; 
    isSidebarOpen: boolean;
    pathname: string; 
}) => {
    
    const isActive = pathname.startsWith(href);

    return (
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link href={href} passHref>
                        <Button
                            className={`
                                w-full text-base transition-all duration-300
                                ${isSidebarOpen ? 'justify-start pl-4 h-11 py-2.5' : 'justify-center h-12'}
                                
                                ${isActive 
                                  // Style Aktif (Latar hijau-100, Teks hijau-700)
                                  ? 'bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-100/80' 
                                  // Style Inaktif (Transparan)
                                  : 'bg-transparent text-muted-foreground hover:text-emerald-500 hover:bg-emerald-50'}
                            `}
                        >
                            <Icon className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : 'mr-0'}`} />
                            {isSidebarOpen && <span>{label}</span>}
                        </Button>
                    </Link>
                </TooltipTrigger>
                {!isSidebarOpen && (
                    <TooltipContent side="right">
                        <p>{label}</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
};


export default function Sidebar({ fullName, role, isSidebarOpen }: SidebarProps) {
    const router = useRouter();
    const supabase = createClient();
    const pathname = usePathname(); 

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success("Anda telah berhasil logout.");
        router.push('/login');
        router.refresh();
    };

    return (
        <aside className={`h-screen bg-card text-card-foreground flex flex-col border-r shadow-md transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
            
            {/* Header Sidebar */}
            {/* 🔽 PERUBAHAN DI SINI 🔽 */}
            {/* Saya menggabungkan header dan logo.
                Saat 'isSidebarOpen' = true, header lengkap (p-6) akan tampil.
                Saat 'isSidebarOpen' = false, hanya logo (h-16) yang akan tampil.
            */}
            <div className={`border-b transition-all duration-300 ${isSidebarOpen ? 'p-6 h-auto opacity-100' : 'h-16 p-0'}`}>
                {isSidebarOpen ? (
                    // Tampilan Saat Terbuka
                    <div>
                        <h2 className="text-xl font-bold whitespace-nowrap">Sistem Pengajuan</h2>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-nowrap">
                            Selamat datang, <br />
                            <span className="font-semibold text-foreground">{fullName}</span>
                        </p>
                    </div>
                ) : (
                    // Tampilan Saat Tertutup
                    <div className="flex items-center justify-center h-16 flex-shrink-0">
                        {/* ❗️ Ganti 'Settings' ini dengan logo Anda jika punya */}
                        <Settings className="h-8 w-8 text-primary" /> 
                    </div>
                )}
            </div>
            {/* 🔼 BLOK LOGO/HEADER SEBELUMNYA DIHAPUS & DIGABUNG 🔼 */}


            {/* Menu Navigasi */}
            <nav className="flex-1 px-3 py-6 space-y-3 overflow-y-auto overflow-x-hidden">
                <NavLink href="/admin" icon={Home} label="Dashboard" isSidebarOpen={isSidebarOpen} pathname={pathname} />

                {(role === 'admin' || role === 'superadmin') && (
                    <>
                        <NavLink href="/submissions" icon={FileText} label="Panel Pengajuan" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                        <NavLink href="/pengajuan-izin" icon={ClipboardList} label="Pengajuan Izin" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                        <NavLink href="/absensi" icon={Calendar} label="Panel Absensi" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                        <NavLink href="/reports" icon={BarChart3} label="Laporan" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                    </>
                )}
                {role === 'superadmin' && (
                    <NavLink href="/manage-users" icon={Users} label="Manajemen User" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                )}
            </nav>

            {/* Tombol Logout di Bawah */}
            <div className={`mt-auto border-t transition-all duration-300 ${isSidebarOpen ? 'px-4 py-5' : 'px-3 py-3'}`}>
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                                <Button
                                    variant="destructive"
                                    className={`w-full transition-all duration-300 ${isSidebarOpen ? 'justify-start' : 'justify-center h-12'}`}
                                    onClick={handleLogout}
                                >
                                    <LogOut className={`h-5 w-5 ${isSidebarOpen ? 'mr-2' : 'mr-0'}`} />
                                    {isSidebarOpen && <span>Logout</span>}
                                </Button>
                        </TooltipTrigger>
                        {!isSidebarOpen && (
                            <TooltipContent side="right"><p>Logout</p></TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>
        </aside>
    );
}