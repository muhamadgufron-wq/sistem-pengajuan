
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Edit, FileDown } from 'lucide-react';
import { EmployeeProfile } from '@/lib/types';
import { EmployeeDetailDialog } from '@/components/employees/EmployeeDetailDialog';

export default function DataKaryawanPage() {
  const supabase = createClient();
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/employees?t=${new Date().getTime()}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      
      if (data.success) {
        setEmployees(data.data);
        setFilteredEmployees(data.data);
      } else {
        toast.error("Gagal mengambil data", { description: data.message });
      }
    } catch (error) {
       console.error("Fetch error:", error);
       toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check Auth & Role
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      
      // Bisa tambahkan logic cek role client side kalau mau strict sebelum fetch
      // Tapi API sudah handle juga.
      fetchEmployees();
    };
    
    checkAccess();
  }, [supabase, router, fetchEmployees]);

  // Search Logic
  useEffect(() => {
    if (!searchQuery) {
      setFilteredEmployees(employees);
      return;
    }
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = employees.filter(emp => 
      (emp.full_name?.toLowerCase().includes(lowerQuery)) ||
      (emp.email?.toLowerCase().includes(lowerQuery)) ||
      (emp.division?.toLowerCase().includes(lowerQuery)) ||
      (emp.nik?.toLowerCase().includes(lowerQuery)) // Now filtering by NIK too
    );
    setFilteredEmployees(filtered);
  }, [searchQuery, employees]);

  const handleEdit = (employee: EmployeeProfile) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-secondary/30 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" /> Data Karyawan
            </h1>
            <p className="text-muted-foreground mt-1">
              Kelola informasi lengkap, divisi, dan status kepegawaian.
            </p>
          </div>
          {/* Bisa tambah tombol Export CSV disini nanti */}
           {/* <Button variant="outline"><FileDown className="mr-2 h-4 w-4"/>Export Data</Button> */}
        </div>

        {/* Filters & Content */}
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
           <CardHeader className="pb-3">
             <div className="flex items-center gap-2">
               <div className="relative flex-1 max-w-sm">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input
                   type="search"
                   placeholder="Cari nama, nik, atau divisi..."
                   className="pl-9 bg-background"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
               </div>
             </div>
           </CardHeader>
           <CardContent>
             <div className="rounded-md border bg-background">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-[120px]">NIK</TableHead>
                     <TableHead>Nama Karyawan</TableHead>
                     <TableHead>Divisi / Jabatan</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>No. Kontak</TableHead>
                     <TableHead className="text-right">Edit</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {isLoading ? (
                     <TableRow>
                       <TableCell colSpan={6} className="h-24 text-center">
                         Memuat data karyawan...
                       </TableCell>
                     </TableRow>
                   ) : filteredEmployees.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                         Tidak ada data karyawan yang ditemukan.
                       </TableCell>
                     </TableRow>
                   ) : (
                     filteredEmployees.map((emp) => (
                       <TableRow key={emp.id} className="hover:bg-muted/50">
                         <TableCell className="font-medium font-mono text-xs">
                           {emp.nik || <span className="text-muted-foreground italic">-</span>}
                         </TableCell>
                         <TableCell>
                           <div className="font-medium">{emp.full_name}</div>
                           <div className="text-xs text-muted-foreground">{emp.email}</div> {/* Fallback if email not in profile: might be missing */}
                         </TableCell>
                         <TableCell>
                           <div className="text-sm">{emp.division || '-'}</div>
                           <div className="text-xs text-muted-foreground">{emp.position || '-'}</div>
                         </TableCell>
                         <TableCell>
                           {emp.employment_status ? (
                               <Badge variant={
                                   emp.employment_status === 'Tetap' ? 'default' : 
                                   emp.employment_status === 'Probation' ? 'secondary' : 'outline'
                               }>
                                   {emp.employment_status}
                               </Badge>
                           ) : <span className="text-muted-foreground text-xs">-</span>}
                         </TableCell>
                         <TableCell className="text-sm">
                            {emp.phone_number || '-'}
                         </TableCell>
                         <TableCell className="text-right">
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             className="h-8 w-8 p-0"
                             onClick={() => handleEdit(emp)}
                           >
                             <Edit className="h-4 w-4" />
                           </Button>
                         </TableCell>
                       </TableRow>
                     ))
                   )}
                 </TableBody>
               </Table>
             </div>
             <div className="mt-4 text-xs text-muted-foreground">
                Menampilkan {filteredEmployees.length} dari {employees.length} karyawan.
             </div>
           </CardContent>
        </Card>
      </div>

      <EmployeeDetailDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        employee={selectedEmployee}
        onSuccess={fetchEmployees}
      />
    </div>
  );
}
