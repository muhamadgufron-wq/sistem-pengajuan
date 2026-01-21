
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { EmployeeProfile } from '@/lib/types';

interface EmployeeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeProfile | null;
  onSuccess: () => void;
}

export function EmployeeDetailDialog({ open, onOpenChange, employee, onSuccess }: EmployeeDetailDialogProps) {
  const [formData, setFormData] = useState<Partial<EmployeeProfile>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        nik: employee.nik || '',
        division: employee.division || '',
        position: employee.position || '',
        phone_number: employee.phone_number || '',
        address: employee.address || '',
        join_date: employee.join_date || '',
        employment_status: employee.employment_status || 'Tetap'
      });
    }
  }, [employee]);

  const handleChange = (field: keyof EmployeeProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/employees/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: employee.id,
          ...formData
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Gagal update data');
      
      toast.success('Data karyawan berhasil diperbarui');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Gagal update', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Data Karyawan</DialogTitle>
            <DialogDescription>
              Lengkapi biodata karyawan <strong>{employee?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="nik">Nomor Induk Karyawan (NIK)</Label>
                    <Input 
                        id="nik" 
                        value={formData.nik || ''} 
                        onChange={(e) => handleChange('nik', e.target.value)} 
                        placeholder="Contoh: 2024001"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="join_date">Tanggal Bergabung</Label>
                    <Input 
                        id="join_date" 
                        type="date"
                        value={formData.join_date || ''} 
                        onChange={(e) => handleChange('join_date', e.target.value)} 
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="division">Divisi</Label>
                    <Select 
                        value={formData.division || ''} 
                        onValueChange={(val) => handleChange('division', val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Divisi" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Office">Office</SelectItem>
                            <SelectItem value="Studio">Studio</SelectItem>
                            <SelectItem value="Gudang">Gudang</SelectItem>
                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="position">Jabatan</Label>
                    <Input 
                        id="position" 
                        value={formData.position || ''} 
                        onChange={(e) => handleChange('position', e.target.value)} 
                        placeholder="Contoh: Staff Admin"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="employment_status">Status Karyawan</Label>
                    <Select 
                        value={formData.employment_status || ''} 
                        onValueChange={(val) => handleChange('employment_status', val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Tetap">Karyawan Tetap</SelectItem>
                            <SelectItem value="Kontrak">Kontrak (PKWT)</SelectItem>
                            <SelectItem value="Probation">Probation</SelectItem>
                            <SelectItem value="Internship">Internship</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone_number">No. Handphone</Label>
                    <Input 
                        id="phone_number" 
                        value={formData.phone_number || ''} 
                        onChange={(e) => handleChange('phone_number', e.target.value)} 
                        placeholder="08..."
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="address">Alamat Lengkap</Label>
                <Textarea 
                    id="address" 
                    value={formData.address || ''} 
                    onChange={(e) => handleChange('address', e.target.value)} 
                    placeholder="Alamat domisili saat ini..."
                    className="resize-none"
                    rows={3}
                />
            </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isLoading} className="bg-emerald-500 text-white shadow-md shadow-emerald-200 hover:bg-emerald-600">
              {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
