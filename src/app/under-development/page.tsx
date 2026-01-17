'use client';

import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function UnderDevelopmentPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-sm p-8 flex flex-col items-center text-center">
                {/* Icon Container */}
                <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                    <Lock className="h-10 w-10 text-red-500" strokeWidth={1.5} />
                </div>

                {/* Text Content */}
                <h1 className="text-xl font-bold text-slate-900 mb-3">
                    Fitur Dalam Pengembangan
                </h1>
                
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                    Maaf, fitur yang Anda akses saat ini sedang dalam tahap pengembangan oleh si <span className="font-bold text-emerald-500 italic">gufron</span>. Silakan kembali lagi nanti.
                </p>

                {/* Action Button */}
                <Button 
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full py-6 font-semibold shadow-emerald-200 shadow-lg transition-all"
                    onClick={() => router.push('/dashboard')}
                >
                    Kembali ke Dashboard
                </Button>
            </div>
        </div>
    );
}
