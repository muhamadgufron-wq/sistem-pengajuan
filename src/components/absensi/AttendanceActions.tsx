'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Correct import for App Router
import { Button } from '@/components/ui/button';
import { RefreshCcwIcon, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { exportAttendanceToPDF } from '@/lib/utils/attendance-export';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: number;
  user_id: string;
  full_name: string;
  tanggal: string;
  check_in_time: string | null;
  check_in_photo_url: string | null;
  check_in_keterangan: string | null;
  check_out_time: string | null;
  check_out_photo_url: string | null;
  status: string;
  catatan: string | null;
}

interface AttendanceActionsProps {
  data: AttendanceRecord[];
  dateFrom: string;
  dateTo: string;
}

export default function AttendanceActions({ data, dateFrom, dateTo }: AttendanceActionsProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);

  const handleRefresh = () => {
    router.refresh();
    toast.success('Data diperbarui');
  };

  const handleExportPDF = async () => {
    if (data.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    setIsExporting(true);
    try {
      // Format dates for the title, ensuring they are valid Date objects
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      const period = `${format(fromDate, 'dd-MM-yyyy')} s/d ${format(toDate, 'dd-MM-yyyy')}`;
      
      exportAttendanceToPDF(data, period);
      toast.success('Berhasil ekspor ke PDF');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor data: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleRefresh}>
        <RefreshCcwIcon className="h-4 w-4 mr-2" />
        Refresh
      </Button>
      <Button 
        onClick={handleExportPDF} 
        disabled={isExporting} 
        size="sm" 
        className="bg-red-600 hover:bg-red-700 text-white"
      >
        <FileText className="h-4 w-4 mr-2" />
        {isExporting ? 'Exporting...' : 'Export PDF'}
      </Button>
    </div>
  );
}
