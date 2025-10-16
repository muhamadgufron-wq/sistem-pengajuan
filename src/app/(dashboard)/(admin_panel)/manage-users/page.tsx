'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';
import { UsersIcon } from 'lucide-react';

interface UserWithRole {
    id: string;
    email: string;
    full_name: string;
    role: string;
}

export default function ManageUsersPage() {
    const supabase = createClient();
    const router = useRouter();
    const [users, setUsers] = useState<UserWithRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        
        // INI BAGIAN KUNCINYA: Mengambil data dari VIEW, bukan RPC
        const { data, error } = await supabase
            .from('user_profiles_with_email') 
            .select('*');

        if (error) {
            toast.error("Gagal mengambil data user", { description: error.message });
            // Jangan redirect agar kita bisa lihat errornya jika ada
        } else {
            setUsers(data || []);
        }
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        const checkSuperAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (!profile || profile.role !== 'superadmin') {
                toast.error("Akses Ditolak", { description: "Hanya superadmin yang dapat mengakses halaman ini." });
                router.push('/dashboard'); 
                return;
            }
            // Hanya panggil fetchUsers jika user adalah superadmin
            fetchUsers();
        };
        checkSuperAdmin();
    }, [supabase, router, fetchUsers]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);
        
        if (error) {
            toast.error("Gagal mengubah peran", { description: error.message });
        } else {
            toast.success("Peran user berhasil diubah!");
            // Muat ulang data untuk menampilkan perubahan
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        }
    };

    return (
        <div className="min-h-screen bg-secondary/40 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold flex items-center gap-3"><UsersIcon /> Manajemen User</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Daftar Pengguna Sistem</CardTitle>
                        <CardDescription>Ubah role pengguna dari karyawan menjadi admin atau sebaliknya.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Lengkap</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role Saat Ini</TableHead>
                                    <TableHead className="text-right">Ubah Role</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24">Memuat data pengguna...</TableCell></TableRow>
                                ) : users.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell><span className={`px-2 py-1 text-xs rounded-full ${user.role === 'admin' ? 'bg-blue-100 text-blue-800' : user.role === 'superadmin' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{user.role}</span></TableCell>
                                        <TableCell className="text-right">
                                            {user.role !== 'superadmin' && (
                                                <Select onValueChange={(value) => handleRoleChange(user.id, value)} defaultValue={user.role}>
                                                    <SelectTrigger className="w-[180px] float-right">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="karyawan">Karyawan</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                { !isLoading && users.length === 0 && (
                                     <TableRow><TableCell colSpan={4} className="text-center h-24">Tidak ada data pengguna.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}