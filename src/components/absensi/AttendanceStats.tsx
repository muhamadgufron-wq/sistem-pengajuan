'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, AlertCircle, Users } from "lucide-react";
import { useState } from "react";
import { formatTime } from '@/lib/utils/camera';

interface DailyStats {
  total_hadir: number;
  total_izin: number;
  total_sakit: number;
  total_lembur: number;
  total_alpha: number;
}

interface EnrichedAttendance {
    status: string;
    user_id: string;
    check_in_time?: string | null;
    full_name: string;
}

interface EmployeeProfile {
    id: string;
    full_name: string;
}

interface AttendanceStatsProps {
    stats: DailyStats;
    todayData: EnrichedAttendance[];
    allEmployees: EmployeeProfile[];
}

export default function AttendanceStats({ stats, todayData, allEmployees }: AttendanceStatsProps) {
  const [viewingStatusList, setViewingStatusList] = useState<{ status: string; employees: { name: string; time?: string }[] } | null>(null);

  const handleStatusCardClick = (status: string) => {
    let employees: { name: string; time?: string }[] = [];

    if (status === 'alpha') {
         const attendedUserIds = new Set(todayData.map(r => r.user_id));
         employees = allEmployees
            .filter(p => !attendedUserIds.has(p.id))
            .map(p => ({ name: p.full_name }));
    } else {
        // Simple filter. Note: This assumes exact match or simple mapping. 
        // The previous logic checked for 'lembur' which might be derived.
        // For now, let's filter case-insensitive.
        employees = todayData
            .filter(record => record.status.toLowerCase() === status.toLowerCase())
            .map(record => ({ 
                name: record.full_name, 
                time: record.check_in_time ? formatTime(new Date(record.check_in_time)) : undefined 
            }));
    }
    
    setViewingStatusList({ status, employees });
  };
  
  return (
    <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'HADIR', count: stats.total_hadir, icon: CheckCircle, color: 'text-[#10B981]', iconBg: 'bg-[#D1FAE5]', status: 'hadir' },
            { label: 'IZIN', count: stats.total_izin, icon: Clock, color: 'text-[#3B82F6]', iconBg: 'bg-[#DBEAFE]', status: 'izin' },
            { label: 'SAKIT', count: stats.total_sakit, icon: AlertCircle, color: 'text-[#D97706]', iconBg: 'bg-[#FEF3C7]', status: 'sakit' },
            { label: 'BELUM MASUK', count: stats.total_alpha, icon: Users, color: 'text-[#EF4444]', iconBg: 'bg-[#FEE2E2]', status: 'alpha' },
        ].map((stat) => (
            <Card 
                key={stat.label} 
                className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-all bg-white"
                onClick={() => handleStatusCardClick(stat.status)}
            >
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-muted-foreground mb-1 tracking-wider">{stat.label}</p>
                    <h3 className={`text-3xl font-bold ${stat.color}`}>{stat.count}</h3>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
            </CardContent>
            </Card>
        ))}
        </div>

        <Dialog open={!!viewingStatusList} onOpenChange={(open) => !open && setViewingStatusList(null)}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Daftar Karyawan ({viewingStatusList?.status === 'alpha' ? 'Belum Masuk' : viewingStatusList?.status})</DialogTitle>
                </DialogHeader>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                    {viewingStatusList?.employees.length ? (
                        viewingStatusList.employees.map((emp, i) => (
                        <div key={i} className="flex justify-between items-center p-2.5 rounded-md bg-muted/50 text-sm">
                            <span className="font-medium">{emp.name}</span>
                            {emp.time && <span className="text-xs px-2 py-0.5 bg-background rounded border">{emp.time}</span>}
                        </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">Tidak ada data.</div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    </>
  );
}
