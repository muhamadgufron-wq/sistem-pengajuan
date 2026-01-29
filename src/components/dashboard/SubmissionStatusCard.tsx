'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { alert } from '@/lib/utils/sweetalert';

interface SubmissionStatusCardProps {
    initialIsOpen: boolean;
}

export default function SubmissionStatusCard({ initialIsOpen }: SubmissionStatusCardProps) {
    const [submissionOpen, setSubmissionOpen] = useState(initialIsOpen);
    const [isToggling, setIsToggling] = useState(false);

    const handleToggleSubmission = async (checked: boolean) => {
        setIsToggling(true);
        try {
            const res = await fetch('/api/settings/submission-status', {
                method: 'POST',
                body: JSON.stringify({ isOpen: checked }),
            });
            const data = await res.json();
            if (data.success) {
                setSubmissionOpen(checked);
                alert.success(checked ? "Pengajuan DIBUKA" : "Pengajuan DITUTUP");
            } else {
                alert.error("Gagal mengubah status");
            }
        } catch (e) {
            alert.error("Terjadi kesalahan sistem");
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="flex items-start md:items-center gap-4">
                <div className={`p-3 rounded-xl ${submissionOpen ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <Settings className={`h-6 w-6 ${submissionOpen ? 'text-emerald-600' : 'text-red-600'}`} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 text-lg">Status Pengajuan</h3>
                    <p className="text-slate-500 text-sm mt-1 max-w-lg">
                        {submissionOpen 
                         ? "Saat ini pengajuan di buka. karyawan dapat mengirimkan pengajuan baru saat ini."
                         : "Saat ini pengajuan ditutup. karyawan tidak dapat mengirimkan pengajuan baru saat ini."}
                    </p>
                </div>
             </div>
             
             <div className="flex items-center justify-between md:justify-end gap-3 bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-xl">
                <span className="text-xs font-bold text-slate-400 md:hidden">STATUS SAAT INI</span>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-700 uppercase">
                        {submissionOpen ? "PENGAJUAN DIBUKA" : "PENGAJUAN DITUTUP"}
                    </span>
                    <Switch 
                        checked={submissionOpen}
                        onCheckedChange={handleToggleSubmission}
                        disabled={isToggling}
                        className="data-[state=checked]:bg-emerald-500"
                    />
                </div>
             </div>
        </div>
    );
}
