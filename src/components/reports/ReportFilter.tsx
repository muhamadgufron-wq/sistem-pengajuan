import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface FilterProps {
    filters: { dateRange: DateRange; tipe: string; };
    setFilters: (filters: any) => void;
    onGenerate: () => void;
    isLoading: boolean;
}

export default function ReportFilter({ filters, setFilters, onGenerate, isLoading }: FilterProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-[300px] justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateRange.from ? (
                                filters.dateRange.to ? (
                                    `${format(filters.dateRange.from, "LLL dd, y")} - ${format(filters.dateRange.to, "LLL dd, y")}`
                                ) : ( format(filters.dateRange.from, "LLL dd, y") )
                            ) : ( <span>Pilih rentang tanggal</span> )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="range"
                            selected={filters.dateRange}
                            onSelect={(range) => setFilters({ ...filters, dateRange: range })}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>

                <Select onValueChange={(value) => setFilters({ ...filters, tipe: value })} value={filters.tipe}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="semua">Semua Tipe</SelectItem>
                        <SelectItem value="barang">Barang</SelectItem>
                        <SelectItem value="uang">Uang</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={onGenerate} disabled={isLoading}>
                {isLoading ? "Memuat..." : "Buat Laporan"}
            </Button>
        </div>
    );
}