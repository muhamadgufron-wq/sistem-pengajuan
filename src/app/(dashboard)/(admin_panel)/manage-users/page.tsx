'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UsersIcon, UserPlus, Trash2, Edit } from 'lucide-react';

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

  // --- State untuk Dialog Undangan User Baru ---
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState('karyawan');
  const [isInviting, setIsInviting] = useState(false);

  // --- State untuk Dialog Edit User ---
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invite_email: inviteEmail,
        invite_full_name: inviteFullName,
        invite_role: inviteRole
      }),
    });

    const data = await res.json();
    if (!data.success) {
      toast.error("Gagal Mengundang User", { description: data.message || "Terjadi kesalahan." });
    } else {
      toast.success("Undangan Terkirim!", { description: data.message });
      setInviteEmail('');
      setInviteFullName('');
      setInviteRole('karyawan');
      setIsInviteDialogOpen(false);
      fetchUsers();
    }
    setIsInviting(false);
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('user_profiles_with_email').select('*');
    if (error) {
      toast.error("Gagal mengambil data user", { description: error.message });
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
      fetchUsers();
    };
    checkSuperAdmin();
  }, [supabase, router, fetchUsers]);

  // --- Hapus User ---
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini?")) return;

    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) {
      toast.error("Gagal menghapus user", { description: error.message });
    } else {
      toast.success("User berhasil dihapus!");
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  // --- Edit User ---
  const handleOpenEditDialog = (user: UserWithRole) => {
    setEditUser(user);
    setEditName(user.full_name);
    setEditRole(user.role);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName, role: editRole })
      .eq('id', editUser.id);

    if (error) {
      toast.error("Gagal memperbarui data user", { description: error.message });
    } else {
      toast.success("Data user berhasil diperbarui!");
      setUsers(users.map(u => u.id === editUser.id ? { ...u, full_name: editName, role: editRole } : u));
      setIsEditDialogOpen(false);
    }
  };

  return (
    <>
      {/* --- DIALOG UNDANG USER BARU --- */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleInviteUser}>
            <DialogHeader>
              <DialogTitle>Undang Pengguna Baru</DialogTitle>
              <DialogDescription>
                Masukkan detail pengguna baru. Mereka akan menerima email undangan untuk mengatur password.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label>Email</label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label>Nama Lengkap</label>
                <Input value={inviteFullName} onChange={(e) => setInviteFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label>Peran Awal</label>
                <Select onValueChange={setInviteRole} defaultValue={inviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="karyawan">Karyawan</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Batal</Button></DialogClose>
              <Button type="submit" disabled={isInviting}>{isInviting ? "Mengundang..." : "Kirim Undangan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG EDIT USER --- */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleUpdateUser}>
            <DialogHeader>
              <DialogTitle>Edit Pengguna</DialogTitle>
              <DialogDescription>Ubah nama lengkap dan peran pengguna di sistem.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label>Nama Lengkap</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label>Peran</label>
                <Select onValueChange={setEditRole} defaultValue={editRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="karyawan">Karyawan</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Batal</Button></DialogClose>
              <Button type="submit">Simpan Perubahan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- HALAMAN UTAMA MANAJEMEN USER --- */}
      <div className="min-h-screen bg-secondary/40 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold flex items-center gap-3"><UsersIcon /> Manajemen User</h1>
            <Button variant={'outline'} onClick={() => setIsInviteDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Tambahkan User
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Pengguna Sistem</CardTitle>
              <CardDescription>Kelola pengguna, ubah role, edit, atau hapus akun.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center h-24">Memuat data pengguna...</TableCell></TableRow>
                  ) : users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${user.role === 'admin' ? 'bg-blue-100 text-blue-800' : user.role === 'superadmin' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleOpenEditDialog(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.role !== 'superadmin' && (
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && users.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center h-24">Tidak ada data pengguna.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
