'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { Button } from '@/components/ui/button';
// ❗️ 'Settings' sudah tidak diperlukan lagi, kecuali Anda mau ganti logo
import { Home, FileText, Users, LogOut, BarChart3, Settings, Calendar, ClipboardList } from 'lucide-react'; 
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from 'react';

interface SidebarProps {
    fullName: string;
    role: string;
    isSidebarOpen: boolean;
}

/**
 * Komponen NavLink
 */
const NavLink = ({ href, icon: Icon, label, isSidebarOpen, pathname, badge }: { 
    href: string; 
    icon: React.ElementType; 
    label: string; 
    isSidebarOpen: boolean;
    pathname: string;
    badge?: number; // Optional badge count
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
                            <div className="relative">
                                <Icon className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : 'mr-0'}`} />
                                {/* Badge for collapsed sidebar */}
                                {!isSidebarOpen && badge !== undefined && badge > 0 && (
                                    <span className="absolute -top-2 -right-2 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {badge > 9 ? '9+' : badge}
                                    </span>
                                )}
                            </div>
                            {isSidebarOpen && (
                                <div className="flex items-center justify-between flex-1">
                                    <span>{label}</span>
                                    {/* Badge for expanded sidebar */}
                                    {badge !== undefined && badge > 0 && (
                                        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                            {badge > 99 ? '99+' : badge}
                                        </span>
                                    )}
                                </div>
                            )}
                        </Button>
                    </Link>
                </TooltipTrigger>
                {!isSidebarOpen && (
                    <TooltipContent side="right">
                        <p>{label}</p>
                        {badge !== undefined && badge > 0 && (
                            <p className="text-xs text-red-400 font-semibold">{badge} pending</p>
                        )}
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
    
    // State for pending counts
    const [pendingSubmissions, setPendingSubmissions] = useState(0);
    const [pendingLeaveRequests, setPendingLeaveRequests] = useState(0);

    // Fetch pending counts
    useEffect(() => {
        if (role === 'admin' || role === 'superadmin') {
            fetchPendingCounts();
            
            // Refresh every 30 seconds
            const interval = setInterval(fetchPendingCounts, 30000);
            return () => clearInterval(interval);
        }
    }, [role]);

    const fetchPendingCounts = async () => {
        try {
            // Get start of current week (Monday)
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - daysToMonday);
            startOfWeek.setHours(0, 0, 0, 0);
            
            const startOfWeekStr = startOfWeek.toISOString();

            // Count pending money requests (this week only)
            const { data: moneyData, count: moneyCount } = await supabase
                .from('pengajuan_uang')
                .select('id, status, created_at', { count: 'exact' })
                .eq('status', 'pending')
                .gte('created_at', startOfWeekStr);

            // Count pending item requests (this week only)
            const { data: itemData, count: itemCount } = await supabase
                .from('pengajuan_barang')
                .select('id, status, created_at', { count: 'exact' })
                .eq('status', 'pending')
                .gte('created_at', startOfWeekStr);

            // Count pending leave requests (this week only)
            const { data: leaveData, count: leaveCount } = await supabase
                .from('pengajuan_izin')
                .select('id, status, created_at', { count: 'exact' })
                .eq('status', 'pending')
                .gte('created_at', startOfWeekStr);

            // Count pending reimbursement requests (this week only)
            const { count: reimbursementCount } = await supabase
                .from('pengajuan_reimbursement')
                .select('id, status, created_at', { count: 'exact' })
                .eq('status', 'pending')
                .gte('created_at', startOfWeekStr);

            const totalSubmissions = (moneyCount || 0) + (itemCount || 0) + (reimbursementCount || 0);
            const totalLeave = leaveCount || 0;

            console.log('📊 Badge (Minggu Ini):', {
                startOfWeek: startOfWeek.toLocaleDateString('id-ID'),
                money: moneyCount,
                items: itemCount,
                reimbursement: reimbursementCount,
                leave: leaveCount,
                total: totalSubmissions
            });

            setPendingSubmissions(totalSubmissions);
            setPendingLeaveRequests(totalLeave);
        } catch (error) {
            console.error('Error fetching pending counts:', error);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success("Anda telah berhasil logout.");
        router.push('/login');
        router.refresh();
    };

    return (
        <aside className={`h-screen bg-card text-card-foreground flex flex-col border-r shadow-md transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
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
            {/* Menu Navigasi */}
            <nav className="flex-1 px-3 py-6 space-y-3 overflow-y-auto overflow-x-hidden">
                <NavLink href="/admin" icon={Home} label="Dashboard" isSidebarOpen={isSidebarOpen} pathname={pathname} />

                {/* Menu untuk Karyawan */}
                {role === 'karyawan' && (
                    <>
                        <NavLink href="/my-absensi" icon={Calendar} label="Absensi" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                        <NavLink href="/status-pengajuan" icon={FileText} label="Status Pengajuan" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                    </>
                )}

                {/* Menu untuk Admin & Superadmin */}
                {(role === 'admin' || role === 'superadmin') && (
                    <>
                        <NavLink href="/submissions" icon={FileText} label="Panel Pengajuan" isSidebarOpen={isSidebarOpen} pathname={pathname} badge={pendingSubmissions} />
                        <NavLink href="/pengajuan-izin" icon={ClipboardList} label="Pengajuan Izin" isSidebarOpen={isSidebarOpen} pathname={pathname} badge={pendingLeaveRequests} />
                        <NavLink href="/absensi" icon={Calendar} label="Panel Absensi" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                        <NavLink href="/reports" icon={BarChart3} label="Laporan" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                    </>
                )}

                {/* Menu khusus Superadmin */}
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