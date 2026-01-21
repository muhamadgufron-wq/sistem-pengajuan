'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LayoutGrid, FileText, ClipboardCheck, Calendar, BarChart3, UserCog, Users, LogOut, Shield, User } from 'lucide-react'; 
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from 'react';

interface SidebarProps {
    fullName: string;
    role: string;
    isSidebarOpen: boolean;
    setIsSidebarOpen?: (open: boolean) => void;
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
    
    // Check exact match for dashboard, startswith for others
    const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

    return (
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link href={href} className="block mb-1">
                        <div
                            className={`
                                relative flex items-center transition-all duration-300 ease-in-out rounded-xl mx-2
                                ${isSidebarOpen ? 'pl-3.5 pr-3 py-2.5' : 'pl-3.5 py-2.5 pr-0'}
                                ${isActive 
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' 
                                  : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}
                            `}
                        >
                            <Icon className={`h-5 w-5 flex-shrink-0 transition-all duration-300 mr-3 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                            
                            {/* Badge for collapsed sidebar - smooth fade */}
                            <div className={`absolute top-2 right-2 transition-all duration-300 ${!isSidebarOpen && badge !== undefined && badge > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                                <span className="h-2 w-2 bg-red-500 rounded-full border-2 border-white block"></span>
                            </div>

                            <div className={`flex items-center justify-between flex-1 overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'opacity-100 w-full' : 'opacity-0 w-0'}`}>
                                <span className={`font-semibold text-sm truncate whitespace-nowrap ${isActive ? 'text-white' : 'text-slate-600'}`}>
                                    {label}
                                </span>
                                
                                {/* Badge for expanded sidebar */}
                                {badge !== undefined && badge > 0 && (
                                    <div className={`
                                        flex items-center justify-center h-4 min-w-[18px] px-1 rounded-full text-[10px] font-bold ml-2
                                        ${isActive ? 'bg-white text-emerald-600' : 'bg-red-500 text-white'}
                                    `}>
                                        {badge > 99 ? '99+' : badge}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Link>
                </TooltipTrigger>
                {!isSidebarOpen && (
                    <TooltipContent side="right" className="bg-slate-900 text-white border-0">
                        <p>{label}</p>
                        {badge !== undefined && badge > 0 && (
                            <p className="text-xs text-red-300 font-semibold mt-1">{badge} pending</p>
                        )}
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
};


export default function Sidebar({ fullName, role, isSidebarOpen, setIsSidebarOpen }: SidebarProps) {
    const router = useRouter();
    const supabase = createClient();
    const pathname = usePathname();
    
    // State for pending counts
    const [pendingSubmissions, setPendingSubmissions] = useState(0);
    const [pendingLeaveRequests, setPendingLeaveRequests] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    // Initial check for mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
            const { count: moneyCount } = await supabase
                .from('pengajuan_uang')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')
                .gte('created_at', startOfWeekStr);

            // Count pending item requests (this week only)
            const { count: itemCount } = await supabase
                .from('pengajuan_barang')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')
                .gte('created_at', startOfWeekStr);

            // Count pending leave requests (this week only)
            const { count: leaveCount } = await supabase
                .from('pengajuan_izin')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')
                .gte('created_at', startOfWeekStr);

            // Count pending reimbursement requests (this week only)
            const { count: reimbursementCount } = await supabase
                .from('pengajuan_reimbursement')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')
                .gte('created_at', startOfWeekStr);

            const totalSubmissions = (moneyCount || 0) + (itemCount || 0) + (reimbursementCount || 0);
            const totalLeave = leaveCount || 0;

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

    // Close sidebar on mobile when route changes
    useEffect(() => {
        if (isMobile && setIsSidebarOpen) {
            setIsSidebarOpen(false);
        }
    }, [pathname, isMobile, setIsSidebarOpen]);

    const closeSidebarOnMobile = () => {
        if (isMobile && setIsSidebarOpen) {
            setIsSidebarOpen(false);
        }
    };

    return (
        <>
            {/* Backdrop for mobile */}
            {isMobile && isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
                    onClick={closeSidebarOnMobile}
                />
            )}

            <aside className={`
                bg-white h-screen flex flex-col border-r border-slate-100 shadow-xl shadow-slate-200/50 transition-all duration-300 ease-in-out
                fixed inset-y-0 left-0 z-40 
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:static lg:translate-x-0
                ${isSidebarOpen ? 'lg:w-64' : 'lg:w-[70px]'} 
                ${isMobile ? 'w-64' : ''}
            `}>
                {/* Brand Logo */}
                <div className={`flex items-center transition-all duration-300 ${isSidebarOpen ? 'px-6 h-20' : 'pl-6 h-20'}`}>
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 flex-shrink-0 z-10">
                            <Shield className="h-5 w-5 text-white fill-current" />
                        </div>
                        
                        <div className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'}`}>
                            <h1 className="text-lg font-bold text-emerald-600 tracking-tight leading-none whitespace-nowrap">SIPAA</h1>
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mt-0.5 whitespace-nowrap">Admin System</span>
                        </div>
                    </div>
                </div>

                {/* Menu Navigasi */}
                <nav className="flex-1 py-4 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden no-scrollbar">
                    
                    {role === 'karyawan' ? (
                        <>
                            {/* Section Header */}
                            <div className="px-6 mb-2 mt-2 transition-all duration-300">
                                <p className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                                    KARYAWAN
                                </p>
                            </div>
                            <NavLink href="/my-absensi" icon={Calendar} label="Absensi Saya" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                            <NavLink href="/status-pengajuan" icon={FileText} label="Status Pengajuan" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                            <NavLink href="/profile" icon={User} label="Profil Saya" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                        </>
                    ) : (
                        <>
                            {/* Dashboard */}
                            <NavLink href="/admin" icon={LayoutGrid} label="Dashboard" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                            
                            {/* Main Menu Header - Locked Height */}
                            <div className="px-6 mb-2 mt-5 transition-all duration-300">
                                <p className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                                    ADMINISTRATOR
                                </p>
                            </div>

                            <NavLink href="/submissions" icon={FileText} label="Panel Pengajuan" isSidebarOpen={isSidebarOpen} pathname={pathname} badge={pendingSubmissions} />
                            <NavLink href="/pengajuan-izin" icon={ClipboardCheck} label="Pengajuan Izin" isSidebarOpen={isSidebarOpen} pathname={pathname} badge={pendingLeaveRequests} />
                            <NavLink href="/absensi" icon={Calendar} label="Panel Absensi" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                            <NavLink href="/reports" icon={BarChart3} label="Laporan" isSidebarOpen={isSidebarOpen} pathname={pathname} />

                            {/* Superadmin Menu */}
                            {role === 'superadmin' && (
                                <>
                                    <NavLink href="/manage-users" icon={UserCog} label="Manajemen User" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                                    <NavLink href="/data-karyawan" icon={Users} label="Data Karyawan" isSidebarOpen={isSidebarOpen} pathname={pathname} />
                                </>
                            )}
                        </>
                    )}
                </nav>

                {/* Footer / Logout */}
                <div className="p-3 border-t border-slate-100">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={handleLogout}
                                    className={`
                                        w-full flex items-center rounded-xl transition-all duration-200 group
                                        ${isSidebarOpen ? 'pl-3.5 pr-3 py-2.5 bg-red-50 text-red-600 hover:bg-red-100' : 'pl-3.5 py-2.5 text-slate-400 hover:text-red-500'}
                                    `}
                                >
                                    <LogOut className={`h-5 w-5 flex-shrink-0 transition-all duration-300 mr-3`} />
                                    <span className={`font-semibold text-sm overflow-hidden transition-all duration-300 whitespace-nowrap ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                                        Keluar
                                    </span>
                                </button>
                            </TooltipTrigger>
                            {!isSidebarOpen && (
                                <TooltipContent side="right">
                                    Logout
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </aside>
        </>
    );
}
