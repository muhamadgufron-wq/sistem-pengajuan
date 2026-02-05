'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';

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
                <div>
                    <h3 className="font-bold text-slate-900 text-lg">Kontrol Operasional</h3>
                    <p className="text-slate-500 text-sm mt-1 max-w-lg">
                        {submissionOpen 
                         ? "Portal pengajuan aktif. Karyawan diizinkan mengirimkan permohonan baru."
                         : "Portal pengajuan dinonaktifkan sementara. Penerimaan permohonan baru sedang dihentikan."}
                    </p>
                </div>
             </div>
             
             <div className="flex items-center justify-between md:justify-end gap-3 bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-xl">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-700 uppercase">
                        {submissionOpen ? "PENGAJUAN DIBUKA" : "PENGAJUAN DITUTUP"}
                    </span>
                    <label className={`relative inline-flex items-center cursor-pointer ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input 
                            className="sr-only peer" 
                            value="" 
                            type="checkbox"
                            checked={submissionOpen}
                            onChange={(e) => !isToggling && handleToggleSubmission(e.target.checked)}
                            disabled={isToggling}
                        />
                        <div className="group peer ring-0 bg-red-200 border-2 border-red-400 rounded-full outline-none duration-700 after:duration-200 w-16 h-8 shadow-md peer-checked:bg-emerald-200 peer-checked:border-emerald-400 peer-focus:outline-none after:content-[''] after:rounded-full after:absolute after:bg-gray-900 after:outline-none after:h-6 after:w-6 after:top-1 after:left-1 peer-checked:after:translate-x-8 peer-hover:after:scale-95">
                            <svg y="0" xmlns="http://www.w3.org/2000/svg" x="0" width="100" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" height="100" className="absolute top-1 left-1 fill-emerald-700 w-6 h-6">
                                <path fillRule="evenodd" d="M30,46V38a20,20,0,0,1,40,0v8a8,8,0,0,1,8,8V74a8,8,0,0,1-8,8H30a8,8,0,0,1-8-8V54A8,8,0,0,1,30,46Zm32-8v8H38V38a12,12,0,0,1,24,0Z">
                                </path>
                            </svg>
                            <svg y="0" xmlns="http://www.w3.org/2000/svg" x="0" width="100" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" height="100" className="absolute top-1 left-9 fill-red-700 w-6 h-6">
                                <path d="M50,18A19.9,19.9,0,0,0,30,38v8a8,8,0,0,0-8,8V74a8,8,0,0,0,8,8H70a8,8,0,0,0,8-8V54a8,8,0,0,0-8-8H38V38a12,12,0,0,1,23.6-3,4,4,0,1,0,7.8-2A20.1,20.1,0,0,0,50,18Z" className="svg-fill-primary">
                                </path>
                            </svg>
                        </div>
                    </label>
                </div>
             </div>
        </div>
    );
}
