'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/app/lib/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2Icon, Lock } from 'lucide-react';
import { useSubmissionStatus } from '@/hooks/use-submission-status';
import LoadingSpinner from '@/components/ui/loading-spinner';

type User = { id: string; };
type Item = { nama_barang: string; jumlah: number; alasan: string; };

export default function AjukanBarangPage() {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([{ nama_barang: '', jumlah: 1, alasan: '' }]);
  const [user, setUser] = useState<User | null>(null);
  
  const { isOpen, isLoading: isStatusLoading } = useSubmissionStatus();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); } 
      else { setUser(user as User); }
    };
    checkUser();
  }, [router, supabase.auth]);

  const handleItemChange = (index: number, field: keyof Item, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleAddItem = () => { setItems([...items, { nama_barang: '', jumlah: 1, alasan: '' }]); };
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sesi berakhir, silakan login kembali."); router.push('/login'); return; }
    const itemsToInsert = items.map(item => ({ ...item, user_id: user.id }));
    const { error } = await supabase.from('pengajuan_barang').insert(itemsToInsert);
    if (error) { toast.error("Gagal Mengajukan", { description: error.message }); } 
    else {
      toast.success("Pengajuan Berhasil Dikirim!");
      setItems([{ nama_barang: '', jumlah: 1, alasan: '' }]);
    }
  };


  if (isStatusLoading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (!isOpen) {
    return (
      <div className="min-h-screen bg-secondary/40 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-6">
            <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                    <Lock className="w-8 h-8 text-red-500" />
                </div>
            </div>
            <h2 className="text-xl font-bold mb-2">Pengajuan Ditutup</h2>
            <p className="text-muted-foreground mb-6">
                Maaf, sistem pengajuan saat ini sedang ditutup sementara oleh admin. Silakan coba lagi nanti.
            </p>
            <Button asChild variant="default">
                <Link href="/dashboard">Kembali ke Dashboard</Link>
            </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold">Pengajuan Barang</CardTitle>
                <CardDescription className="mt-1">Tambah satu atau beberapa barang sekaligus.</CardDescription>
              </div>
              <Button variant="ghost" asChild><Link href="/dashboard">&larr; Kembali</Link></Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {items.map((item, index) => (
                <Card key={index} className="bg-muted/30 p-5 relative">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg text-foreground">Item #{index + 1}</h3>
                    {items.length > 1 && (<Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-destructive hover:text-destructive"><Trash2Icon className="h-4 w-4" /></Button>)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2"><label className="text-sm font-medium">Nama Barang</label><Input type="text" value={item.nama_barang} onChange={(e) => handleItemChange(index, 'nama_barang', e.target.value)} required /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Jumlah</label><Input type="number" value={item.jumlah} onChange={(e) => handleItemChange(index, 'jumlah', parseInt(e.target.value))} min="1" required /></div>
                  </div>
                  <div className="mt-4 space-y-2"><label className="text-sm font-medium">Alasan Pengajuan</label><Textarea value={item.alasan} onChange={(e) => handleItemChange(index, 'alasan', e.target.value)} rows={3} required /></div>
                </Card>
              ))}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleAddItem}>Tambah Item Lain</Button>
                <Button type="submit" className="flex-grow">Kirim Semua Pengajuan</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}