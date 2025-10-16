'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Clock, CheckCircle, XCircle, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Tipe untuk data statistik
interface DashboardStats {
    total_users: number;
    total_admins: number;
    submissions_this_week: number;
    pending_submissions: number;
    approved_submissions_total: number;
    rejected_submissions_total: number;
}

// Komponen untuk kartu statistik
const StatCard = ({ title, value, icon, description }: { title: string, value: string | number, icon: React.ReactNode, description: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);


export default function AdminDashboardPage() {
    const supabase = createClient();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
            if (error) {
                console.error("Gagal mengambil statistik:", error);
            } else {
                setStats(data);
            }
            setIsLoading(false);
        };
        fetchStats();
    }, [supabase]);
    
    // Data untuk grafik
    const chartData = [
        { name: 'Status', Pending: stats?.pending_submissions, Disetujui: stats?.approved_submissions_total, Ditolak: stats?.rejected_submissions_total },
    ];

    if (isLoading) {
        return <div className="text-center p-10">Memuat data dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Dashboard Admin</h1>
            
            {/* Grid untuk Kartu Statistik */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title="Total Pengajuan Minggu Ini"
                    value={stats?.submissions_this_week ?? 0}
                    icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
                    description="Jumlah pengajuan barang & uang"
                />
                <StatCard 
                    title="Pengajuan Menunggu"
                    value={stats?.pending_submissions ?? 0}
                    icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                    description="Pengajuan yang perlu di-review"
                />
                 <StatCard 
                    title="Total Karyawan"
                    value={stats?.total_users ?? 0}
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    description="Jumlah pengguna dengan peran karyawan"
                />
                 <StatCard 
                    title="Total Admin"
                    value={stats?.total_admins ?? 0}
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    description="Jumlah pengguna dengan peran admin"
                />
            </div>
            
            {/* Kartu untuk Grafik */}
            <Card className="col-span-1 lg:col-span-2">
                <CardHeader>
                    <CardTitle>Ringkasan Status Semua Pengajuan</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Pending" fill="#f59e0b" name="Menunggu" />
                            <Bar dataKey="Disetujui" fill="#10b981" name="Disetujui" />
                            <Bar dataKey="Ditolak" fill="#ef4444" name="Ditolak" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}