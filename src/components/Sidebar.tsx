'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, FileText, Users, LogOut, Package, DollarSign, History, BarChart3, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
    fullName: string;
    role: string;
    isSidebarOpen: boolean;
}

// Komponen helper untuk NavLink agar lebih rapi
const NavLink = ({ href, icon: Icon, label, isSidebarOpen }: { href: string; icon: React.ElementType; label: string; isSidebarOpen: boolean; }) => (
    <TooltipProvider delayDuration={0}>
        <Tooltip>
            <TooltipTrigger asChild>
                <Link href={href} passHref>
                    <Button
                        variant="ghost"
                        className={`w-full text-base transition-all duration-300 ${isSidebarOpen ? 'justify-start' : 'justify-center h-12'}`} // Ukuran & alignment berubah
                    >
                        <Icon className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : 'mr-0'}`} /> {/* Margin berubah */}
                        {isSidebarOpen && <span>{label}</span>} {/* Teks hanya muncul jika sidebar terbuka */}
                    </Button>
                </Link>
            </TooltipTrigger>
            {/* Tooltip hanya muncul jika sidebar tertutup */}
            {!isSidebarOpen && (
                <TooltipContent side="right">
                    <p>{label}</p>
                </TooltipContent>
            )}
        </Tooltip>
    </TooltipProvider>
);

export default function Sidebar({ fullName, role, isSidebarOpen}: SidebarProps) {
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success("Anda telah berhasil logout.");
        router.push('/login');
        router.refresh();
    };

return (
        <aside className="h-screen bg-card text-card-foreground flex flex-col border-r shadow-md transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}">
            {/* Header Sidebar */}
            <div className="p-6 border-b transition-all duration-300 ${isSidebarOpen ? 'h-auto opacity-100' : 'h-0 opacity-0 overflow-hidden p-0 border-0'}">
                <h2 className="text-xl font-bold whitespace-nowrap">Sistem Pengajuan</h2>
                <p className="text-sm text-muted-foreground mt-2 whitespace-nowrap">
                    Selamat datang, <br />
                    <span className="font-semibold text-foreground">{fullName}</span>
                </p>
            </div>
            
            {/* Logo kecil saat tertutup (Opsional) */}
             {!isSidebarOpen && (
                 <div className="flex items-center justify-center h-16 border-b flex-shrink-0">
                     <Settings className="h-8 w-8 text-primary" /> {/* Ganti dengan logo Anda */}
                 </div>
             )}


           {/* Menu Navigasi */}
            <nav className={`flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden ${!isSidebarOpen && 'flex flex-col items-center'}`}>
                <NavLink href="/admin" icon={Home} label="Dashboard" isSidebarOpen={isSidebarOpen} />

                {(role === 'admin' || role === 'superadmin') && (
                    <NavLink href="/submissions" icon={FileText} label="Panel Pengajuan" isSidebarOpen={isSidebarOpen} />
                )}
                {role === 'superadmin' && (
                    <>
                        <NavLink href="/manage-users" icon={Users} label="Manajemen User" isSidebarOpen={isSidebarOpen} />
                        <NavLink href="/reports" icon={BarChart3} label="Laporan" isSidebarOpen={isSidebarOpen} />
                    </>
                )}
            </nav>

            {/* Tombol Logout di Bawah */}
           <div className={`p-2 mt-auto border-t transition-all duration-300 ${isSidebarOpen ? 'px-4 py-4' : 'px-2 py-2'}`}>
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