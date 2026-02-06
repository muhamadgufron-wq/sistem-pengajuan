'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, SearchIcon, XCircle, FileText } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
// Simple custom debounce since we might not have the package
function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
    const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
    return (...args: Parameters<T>) => {
        if (timer) clearTimeout(timer);
        setTimer(setTimeout(() => callback(...args), delay));
    };
}

export default function AttendanceFilters({ initialDateFrom, initialDateTo }: { initialDateFrom: string, initialDateTo: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [dateFrom, setDateFrom] = useState<Date | undefined>(initialDateFrom ? new Date(initialDateFrom) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(initialDateTo ? new Date(initialDateTo) : undefined);

  // Helper to update URL params
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleSearch = useDebounce((term: string) => {
    router.replace(`?${createQueryString('q', term)}`);
  }, 300);

  const handleDateChange = (type: 'from' | 'to', date: Date | undefined) => {
    if (type === 'from') setDateFrom(date);
    else setDateTo(date);

    if (date) {
       router.replace(`?${createQueryString(type, format(date, 'yyyy-MM-dd'))}`);
    } else {
        // Handle clear?
    }
  };

  const resetFilters = () => {
      setDateFrom(new Date());
      setDateTo(new Date());
      router.replace('/absensi');
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg hidden md:block tracking-tight">Log Kehadiran</h3>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Cari karyawan..." 
                    className="pl-9 h-10 w-[250px] bg-gray-50/50 border-gray-100 focus:bg-white transition-colors" 
                    defaultValue={searchParams.get('q')?.toString()}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </div>
            
            {/* Date Pickers - Combined Look */}
            <div className="flex items-center bg-white rounded-md border shadow-sm h-10 px-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-gray-50 text-gray-700 font-medium">
                            <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm">{dateFrom ? format(dateFrom, 'dd MMM') : 'Dari'}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="single" selected={dateFrom} onSelect={(date) => handleDateChange('from', date)} initialFocus />
                    </PopoverContent>
                </Popover>
                <span className="text-gray-300 text-sm">-</span>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-gray-50 text-gray-700 font-medium">
                            <span className="text-sm">{dateTo ? format(dateTo, 'dd MMM') : 'Sampai'}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="single" selected={dateTo} onSelect={(date) => handleDateChange('to', date)} initialFocus />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Reset */}
            {(searchParams.has('q') || searchParams.has('from')) && (
                <Button variant="ghost" size="icon" onClick={resetFilters} className="h-10 w-10 text-muted-foreground hover:text-red-500 hover:bg-red-50">
                    <XCircle className="h-5 w-5" />
                </Button>
            )}
        </div>
    </div>
  );
}
