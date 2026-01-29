'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { alert } from "@/lib/utils/sweetalert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UsersIcon, UserPlus, Trash2, Edit } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog";

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
  const [isUpdating, setIsUpdating] = useState(false);

  // 🔹 Ambil data semua user
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('user_profiles_with_email').select('*');
    if (error) {
      alert.error("Gagal mengambil data user", { description: error.message });
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
        alert.error("Akses Ditolak", { description: "Hanya superadmin yang dapat mengakses halaman ini." });
        router.push('/dashboard');
        return;
      }
      fetchUsers();
    };
    checkSuperAdmin();
  }, [supabase, router, fetchUsers]);

  // 🔹 Undang user baru
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
      alert.error("Gagal Mengundang User", { description: data.message || "Terjadi kesalahan." });
    } else {
      alert.success("Undangan Terkirim!", { description: data.message });
      setInviteEmail('');
      setInviteFullName('');
      setInviteRole('karyawan');
      setIsInviteDialogOpen(false);
      fetchUsers();
    }
    setIsInviting(false);
  };

  // 🔹 Hapus user
  const handleDeleteUser = async (userId: string) => {
    

    const res = await fetch('/api/users/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

    const data = await res.json();
    if (!data.success) {
        alert.error("Gagal menghapus user", { description: data.message });
    } else {
        alert.success("User berhasil dihapus sepenuhnya!");
        fetchUsers();
    }
    };
  // 🔹 Edit user
  const handleOpenEditDialog = (user: UserWithRole) => {
    setEditUser(user);
    setEditName(user.full_name);
    setEditRole(user.role);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editUser) return;

      setIsUpdating(true); // Aktifkan loading
      console.log('Mencoba update user:', editUser.id); // [LOG 1]

      try {
      const res = await fetch('/api/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      id: editUser.id,
      full_name: editName,
      role: editRole
      }),
      });

      console.log('Response status:', res.status); // [LOG 2]

      // Cek jika respons BUKAN 'ok' (misal: 404, 500)
      if (!res.ok) {
      const errorData = await res.json();
      // Lempar error agar ditangkap oleh 'catch'
      throw new Error(errorData.message || `Server error: ${res.status}`);
      }

      const data = await res.json();
      console.log('Response data:', data); // [LOG 3]

      if (!data.success) {
      // Ini jika API route Anda mengembalikan { success: false }
      alert.error("Gagal memperbarui data user", { description: data.message });
      } else {
      alert.success("Data user berhasil diperbarui!");
      fetchUsers();
      setIsEditDialogOpen(false);
      }
      } catch (error: any) {
      // Ini akan menangkap error fetch, 500, atau res.json()
      console.error('Error di handleUpdateUser:', error); // [LOG 4]
      alert.error("Terjadi Kesalahan Fatal", { description: error.message });
      } finally {
      setIsUpdating(false); // Matikan loading
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
              <div>
                <label>Email</label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
              </div>
              <div>
                <label>Nama Lengkap</label>
                <Input value={inviteFullName ?? ''} onChange={(e) => setInviteFullName(e.target.value)} required />
              </div>
              <div>
                <label>Peran Awal</label>
                <Select onValueChange={setInviteRole} defaultValue={inviteRole}>
                  <SelectTrigger><SelectValue placeholder="Pilih peran" /></SelectTrigger>
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
              <div>
                <label>Nama Lengkap</label>
                <Input value={editName ?? ''} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div>
                <label>Peran</label>
                <Select onValueChange={setEditRole} defaultValue={editRole}>
                  <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="karyawan">Karyawan</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Batal</Button></DialogClose>
              <Button type="submit" disabled={isUpdating}>{isUpdating ? "Menyimpan..." : "Simpan Perubahan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- HALAMAN UTAMA --- */}
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
                  ) : users.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center h-24">Tidak ada data pengguna.</TableCell></TableRow>
                  ) : users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name || '-'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'superadmin' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleOpenEditDialog(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.role !== 'superadmin' && (
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Hapus Pengguna?</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   Apakah Anda yakin ingin menghapus user <strong>{user.full_name}</strong>? Tindakan ini tidak dapat dibatalkan.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Batal</AlertDialogCancel>
                                 <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteUser(user.id)}>Hapus</AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
