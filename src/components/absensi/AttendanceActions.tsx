'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Correct import for App Router
import { Button } from '@/components/ui/button';
import { RefreshCcwIcon, FileText } from 'lucide-react';
import { alert } from '@/lib/utils/sweetalert';
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
    alert.success('Data diperbarui');
  };

  const handleExportPDF = async () => {
    if (data.length === 0) {
      alert.error('Tidak ada data untuk diekspor');
      return;
    }

    setIsExporting(true);
    try {
      // Format dates for the title, ensuring they are valid Date objects
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      const period = `${format(fromDate, 'dd-MM-yyyy')} s/d ${format(toDate, 'dd-MM-yyyy')}`;
      
      exportAttendanceToPDF(data, period);
      alert.success('Berhasil ekspor ke PDF');
    } catch (error: any) {
      console.error('Export error:', error);
      alert.error('Gagal mengekspor data: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button 
        variant="outline" 
        size="default" 
        onClick={handleRefresh}
        className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
      >
        <RefreshCcwIcon className="h-4 w-4 mr-2" />
        Refresh
      </Button>
      <Button 
        onClick={handleExportPDF} 
        disabled={isExporting} 
        size="default" 
        className="bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-sm"
      >
        <FileText className="h-4 w-4 mr-2" />
        {isExporting ? 'Exporting...' : 'Export PDF'}
      </Button>
    </div>
  );
}
