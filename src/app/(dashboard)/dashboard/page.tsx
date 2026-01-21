'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
    FileCheck, 
    Lock, 
    Bell, 
    MapPin, 
    ArrowRight,
    LayoutGrid,
    FileText,
    BarChart3,
    User,
    Home,
    History,
    CreditCard,
    ShoppingBag,
    Upload
} from 'lucide-react';
import { useSubmissionStatus } from '@/hooks/use-submission-status';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// --- Components ---

const MenuItem = ({ href, icon, title, disabled = false, badge }: {
    href: string;
    icon: React.ReactNode;
    title: string;
    disabled?: boolean;
    badge?: string;
}) => {
    if (disabled) {
        return (
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-3xl border border-gray-100 opacity-60 relative overflow-hidden">
                 <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                 </div>
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center mb-3 text-gray-400">
                    {icon}
                </div>
                <span className="text-sm font-medium text-gray-500 text-center leading-tight">{title}</span>
                <span className="text-[10px] text-red-400 mt-1 font-medium">Ditutup</span>
            </div>
        );
    }

    return (
        <Link href={href} className="group flex flex-col items-center justify-center p-4 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
            {badge && (
                <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {badge}
                </span>
            )}
            <div className="w-14 h-14 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mb-3 text-blue-600 transition-colors">
                {icon}
            </div>
            <span className="text-sm font-bold text-gray-700 text-center leading-tight group-hover:text-blue-700">{title}</span>
        </Link>
    );
};

const BottomNavItem = ({ icon, label, active = false, href = '#' }: { icon: React.ReactNode, label: string, active?: boolean, href?: string }) => {
    return (
        <Link href={href} className={`flex flex-col items-center justify-center w-full py-2 ${active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
            {icon}
            <span className="text-[10px] font-medium mt-1">{label}</span>
        </Link>
    );
}

export default function DashboardPage() {
    const supabase = createClient();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState('');
    const [fullName, setFullName] = useState('');
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [attendanceStatus, setAttendanceStatus] = useState<'not_checked_in' | 'checked_in' | 'checked_out'>('not_checked_in');
    const [isRedirecting, setIsRedirecting] = useState(false);
    
    // Gunakan static date agar tidak hydration mismatch time, tapi update di client
    const [mounted, setMounted] = useState(false);

    const { isOpen: isSubmissionOpen } = useSubmissionStatus();

    const getTodayDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => setCurrentTime(new Date()), 1000 * 60); // update every minute
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const checkUserAndRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
            } else {
                setUser(user);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, full_name')
                    .eq('id', user.id)
                    .single();
                
                if (profile) {
                    setUserRole(profile.role);
                    setFullName(profile.full_name);
                    
                    if (profile.role === 'admin' || profile.role === 'superadmin') {
                        setIsRedirecting(true);
                        router.replace('/admin'); // Assuming admin dashboard is at /admin based on previous code
                    }
                }

                 // Check attendance status
                 const { data: todayData } = await supabase
                 .from('absensi')
                 .select('*')
                 .eq('user_id', user.id)
                 .eq('tanggal', getTodayDate())
                 .single();

                if (todayData) {
                    if (todayData.check_out_time) {
                        setAttendanceStatus('checked_out');
                    } else if (todayData.check_in_time) {
                        setAttendanceStatus('checked_in');
                    }
                }
            }
        };
        checkUserAndRole();
    }, [router, supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success("Anda berhasil logout.");
        router.push('/login');
    };

    if (!user || isRedirecting || !mounted) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">Memuat...</div>;
    }

    // Format Date: Monday, 24 May 2024
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    
    const formattedDate = currentTime.toLocaleDateString('id-ID', dateOptions);
    const formattedTime = currentTime.toLocaleTimeString('id-ID', timeOptions);

    // Greeting Logic
    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour >= 4 && hour < 10) return "Selamat Pagi";
        if (hour >= 10 && hour < 15) return "Selamat Siang";
        if (hour >= 15 && hour < 18) return "Selamat Sore";
        return "Selamat Malam";
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20"> {/* pb-20 for bottom nav */}
            
            {/* --- Header --- */}
            <div className="bg-white sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-slate-100">
                        <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || user.email)}&background=0D8ABC&color=fff`} />
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-md font-bold text-slate-800 leading-tight">{getGreeting()}, {fullName?.split(' ')[0] || 'User'}</h1>
                        <p className="text-xs text-slate-500 font-medium">Semangat Kerja nya ya!</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full bg-slate-50 relative">
                    <Bell className="w-5 h-5 text-slate-600" />
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </Button>
            </div>

            {/* --- Hero & Attendance Section --- */}
            <div className="px-5 pt-6 pb-2">
                <div className="relative rounded-3xl overflow-hidden shadow-lg h-48 group">
                    {/* Background Image with Gradient Overlay */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80")' }} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70"></div>
                    
                    <div className="absolute bottom-4 left-5 text-white flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium">Headquarters, Jakarta</span>
                    </div>
                </div>

                {/* Overlapping Card */}
                <div className="relative -mt-12 mx-2 p-5 bg-white rounded-2xl shadow-xl border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xs font-bold text-emerald-500 tracking-wider mb-1">STATUS KEHADIRAN</h3>
                            <div className="text-gray-400 text-xs font-medium flex gap-2">
                                <span>{formattedDate}</span>
                                <span>•</span>
                                <span>{formattedTime}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-end">
                        <div>
                             <p className="text-xs text-gray-500 mb-1">Status Saat Ini</p>
                             <h2 className={`text-lg font-bold ${
                                attendanceStatus === 'checked_out' ? 'text-green-600' :
                                attendanceStatus === 'checked_in' ? 'text-green-600' :
                                'text-slate-800'
                             }`}>
                                {attendanceStatus === 'not_checked_in' && 'Siap Masuk'}
                                {attendanceStatus === 'checked_in' && 'Sudah Masuk'}
                                {attendanceStatus === 'checked_out' && 'Sudah Pulang'}
                             </h2>
                        </div>
                        <Link href="/my-absensi">
                            <Button className={`
                                rounded-xl px-6 h-11 shadow-lg transition-all active:scale-95
                                ${attendanceStatus === 'not_checked_in' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 text-white' : ''}
                                ${attendanceStatus === 'checked_in' ? 'bg-green-500 hover:bg-green-600 shadow-green-200 text-white' : ''}
                                ${attendanceStatus === 'checked_out' ? 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed' : ''}
                            `} disabled={attendanceStatus === 'checked_out'}>
                                {attendanceStatus === 'not_checked_in' && <><ArrowRight className="w-4 h-4 mr-2" /> Masuk</>}
                                {attendanceStatus === 'checked_in' && <><ArrowRight className="w-4 h-4 mr-2" /> Pulang</>}
                                {attendanceStatus === 'checked_out' && 'Selesai'}
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* --- Main Features Grid --- */}
            <div className="px-6 py-6">
                <h2 className="text-lg font-bold text-slate-800 mb-5">Menu Utama</h2>
                <div className="grid grid-cols-2 gap-4">
                    <MenuItem 
                        href="/ajukan-barang"
                        title="Ajukan Barang"
                        icon={<ShoppingBag className="w-6 h-6" />}
                        disabled={!isSubmissionOpen}
                    />
                    <MenuItem 
                        href="/ajukan-uang"
                        title="Ajukan Uang"
                        icon={<CreditCard className="w-6 h-6" />}
                        disabled={!isSubmissionOpen}
                    />
                    <MenuItem 
                        href="/ajukan-reimbursement"
                        title="Reimbursement"
                        icon={<FileText className="w-6 h-6" />}
                        disabled={!isSubmissionOpen}
                    />
                     <MenuItem 
                        href="/ajukan-izin"
                        title="Izin / Cuti"
                        icon={<FileCheck className="w-6 h-6" />}
                    />
                    <MenuItem 
                        href="/laporan-penggunaan"
                        title="Laporan Uang"
                        icon={<Upload className="w-6 h-6" />}
                    />
                    <MenuItem 
                        href="/status-pengajuan"
                        title="Riwayat"
                        icon={<History className="w-6 h-6" />}
                    />
                </div>
            </div>

            {/* --- Bottom Navigation --- */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-1 px-6 flex justify-between items-center z-50">
                <BottomNavItem icon={<Home className="w-5 h-5" />} label="Home" active href="#" />
                <BottomNavItem icon={<LayoutGrid className="w-5 h-5" />} label="Request" href="/under-development" />
                <BottomNavItem icon={<BarChart3 className="w-5 h-5" />} label="Stats" href="/under-development" />
                <BottomNavItem icon={<User className="w-5 h-5" />} label="Profile" href="/profile" />
            </div>
            
            {/* Safe area spacer */}
            <div className="h-6"></div>
        </div>
    );
}

