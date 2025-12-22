'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/app/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BookCheck, UploadCloud, Calendar, FileCheck } from 'lucide-react';

// Komponen Card (seperti sebelumnya)
const DashboardCard = ({ href, icon, title, description, isAdminCard = false }: {
    href: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    isAdminCard?: boolean;
}) => (
    <Link href={href} className={`group block p-6 bg-card border rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transform transition-all duration-300 ${isAdminCard ? 'border-destructive/50 hover:border-destructive' : 'hover:border-primary'}`}>
        <div className="flex items-center">
            {icon}
            <h2 className="ml-4 text-xl font-bold text-card-foreground">{title}</h2>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{description}</p>
    </Link>
);

export default function DashboardPage() {
    const supabase = createClient();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState('');
    const [fullName, setFullName] = useState('');
    const [isRedirecting, setIsRedirecting] = useState(false);

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
                    
                    // Cek role setelah mendapatkan data profil
                    if (profile.role === 'admin' || profile.role === 'superadmin') {
                        setIsRedirecting(true);
                        router.replace('/admin');
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

    if (!user || !userRole) {
        return <div className="min-h-screen flex items-center justify-center bg-secondary/40">Memuat...</div>;
    }

    // Tampilkan loading saat redirect dipicu
    if (isRedirecting) {
        return <div className="min-h-screen flex items-center justify-center bg-secondary/40">Mengarahkan ke halaman admin...</div>;
    }

    // Jika role adalah admin/superadmin, tampilkan pesan bahwa redirect sedang berlangsung
    if (userRole === 'admin' || userRole === 'superadmin') {
        return <div className="min-h-screen flex items-center justify-center bg-secondary/40">Anda tidak memiliki akses ke halaman ini.</div>;
    }

    return (
        <div className="min-h-screen bg-secondary/40">
            <header className="bg-card shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
                        <p className="text-sm text-muted-foreground">Selamat datang, {fullName || user.email}</p>
                    </div>
                    <Button onClick={handleLogout} variant="destructive">
                        Logout
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Absensi - Prioritas Utama */}
                    <DashboardCard 
                        href="/my-absensi"
                        title="Absensi"
                        description="Masuk dan pulang kehadiran harian Anda."
                        icon={<Calendar className="w-8 h-8 text-orange-500" />}
                    />
                    <DashboardCard 
                        href="/ajukan-izin"
                        title="Ajukan Izin"
                        description="Ajukan izin, sakit, atau cuti untuk kehadiran Anda."
                        icon={<FileCheck className="w-8 h-8 text-indigo-500" />}
                    />
                    
                    {/* Pengajuan */}
                    <DashboardCard 
                        href="/ajukan-barang"
                        title="Ajukan Barang"
                        description="Buat permintaan pengadaan untuk barang atau aset baru."
                        icon={<svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
                    />
                    <DashboardCard 
                        href="/ajukan-uang"
                        title="Ajukan Uang"
                        description="Buat permintaan untuk pencairan dana keperluan operasional."
                        icon={<svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    />
                    <DashboardCard 
                        href="/ajukan-reimbursement"
                        title="Ajukan Reimbursement"
                        description="Ajukan penggantian biaya yang sudah Anda keluarkan dengan bukti."
                        icon={<svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>}
                    />
                    
                    {/* Riwayat & Laporan */}
                    <DashboardCard 
                        href="/status-pengajuan"
                        title="Riwayat & Status"
                        description="Lihat status dan riwayat semua pengajuan yang telah Anda buat."
                        icon={<svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    />
                    <DashboardCard 
                        href="/laporan-penggunaan"
                        title="Laporan Pengajuan Uang"
                        description="Upload bukti penggunaan uang untuk minggu lalu."
                        icon={<UploadCloud className="w-8 h-8 text-cyan-500" />}
                    />
                </div>
            </main>
        </div>
    );
}
