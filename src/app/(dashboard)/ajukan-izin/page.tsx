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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

type User = { id: string; };

export default function AjukanIzinPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [jenis, setJenis] = useState<string>('');
  const [tanggalMulai, setTanggalMulai] = useState<Date>();
  const [tanggalSelesai, setTanggalSelesai] = useState<Date>();
  const [alasan, setAlasan] = useState('');
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { 
        router.push('/login'); 
      } else { 
        setUser(user as User); 
      }
    };
    checkUser();
  }, [router, supabase.auth]);

  const calculateDays = (start: Date, end: Date): number => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end date
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5 MB');
        return;
      }
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Format file harus JPG, PNG, atau PDF');
        return;
      }
      setBuktiFile(file);
    }
  };

  const uploadBukti = async (userId: string): Promise<string | null> => {
    if (!buktiFile) return null;

    const fileExt = buktiFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('bukti-izin')
      .upload(fileName, buktiFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Gagal mengupload bukti');
    }

    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Sesi berakhir, silakan login kembali.");
      router.push('/login');
      return;
    }

    if (!jenis) {
      toast.error("Pilih jenis izin");
      return;
    }

    if (!tanggalMulai || !tanggalSelesai) {
      toast.error("Pilih tanggal mulai dan selesai");
      return;
    }

    if (tanggalSelesai < tanggalMulai) {
      toast.error("Tanggal selesai harus setelah atau sama dengan tanggal mulai");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload bukti if exists
      let buktiUrl: string | null = null;
      if (buktiFile) {
        buktiUrl = await uploadBukti(user.id);
      }

      // Calculate number of days
      const jumlahHari = calculateDays(tanggalMulai, tanggalSelesai);

      // Insert pengajuan izin
      const { error } = await supabase
        .from('pengajuan_izin')
        .insert({
          user_id: user.id,
          jenis,
          tanggal_mulai: format(tanggalMulai, 'yyyy-MM-dd'),
          tanggal_selesai: format(tanggalSelesai, 'yyyy-MM-dd'),
          jumlah_hari: jumlahHari,
          alasan,
          bukti_url: buktiUrl,
          status: 'pending'
        });

      if (error) {
        toast.error("Gagal Mengajukan", { description: error.message });
      } else {
        toast.success("Pengajuan Izin Berhasil Dikirim!");
        // Reset form
        setJenis('');
        setTanggalMulai(undefined);
        setTanggalSelesai(undefined);
        setAlasan('');
        setBuktiFile(null);
      }
    } catch (error: any) {
      toast.error("Terjadi kesalahan", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const jumlahHari = tanggalMulai && tanggalSelesai ? calculateDays(tanggalMulai, tanggalSelesai) : 0;

  return (
    <div className="min-h-screen bg-secondary/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold">Pengajuan Izin</CardTitle>
                <CardDescription className="mt-1">
                  Ajukan izin, sakit, atau cuti dengan mengisi form di bawah ini
                </CardDescription>
              </div>
              <Button variant="ghost" asChild>
                <Link href="/dashboard">&larr; Kembali</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Jenis Izin */}
              <div className="space-y-2">
                <Label htmlFor="jenis">Jenis Izin *</Label>
                <Select value={jenis} onValueChange={setJenis} required>
                  <SelectTrigger id="jenis">
                    <SelectValue placeholder="Pilih jenis izin..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="izin">Izin</SelectItem>
                    <SelectItem value="sakit">Sakit</SelectItem>
                    <SelectItem value="cuti">Cuti</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tanggal Mulai */}
              <div className="space-y-2">
                <Label>Tanggal Mulai *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tanggalMulai ? format(tanggalMulai, 'dd MMMM yyyy', { locale: localeId }) : "Pilih tanggal mulai"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tanggalMulai}
                      onSelect={setTanggalMulai}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Tanggal Selesai */}
              <div className="space-y-2">
                <Label>Tanggal Selesai *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tanggalSelesai ? format(tanggalSelesai, 'dd MMMM yyyy', { locale: localeId }) : "Pilih tanggal selesai"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tanggalSelesai}
                      onSelect={setTanggalSelesai}
                      initialFocus
                      disabled={(date) => {
                        const today = new Date(new Date().setHours(0, 0, 0, 0));
                        if (date < today) return true;
                        if (tanggalMulai && date < tanggalMulai) return true;
                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Jumlah Hari (Auto-calculated) */}
              {jumlahHari > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Jumlah Hari: <span className="text-lg font-bold">{jumlahHari}</span> hari
                  </p>
                </div>
              )}

              {/* Alasan */}
              <div className="space-y-2">
                <Label htmlFor="alasan">Alasan *</Label>
                <Textarea
                  id="alasan"
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  rows={4}
                  placeholder="Jelaskan alasan pengajuan izin..."
                  required
                />
              </div>

              {/* Upload Bukti */}
              <div className="space-y-2">
                <Label htmlFor="bukti">Bukti Pendukung (Opsional)</Label>
                <p className="text-xs text-muted-foreground">
                  Upload surat dokter, surat keterangan, dll. (Max 5MB, format: JPG, PNG, PDF)
                </p>
                {buktiFile ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{buktiFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(buktiFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setBuktiFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      id="bukti"
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('bukti')?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Pilih File
                    </Button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
