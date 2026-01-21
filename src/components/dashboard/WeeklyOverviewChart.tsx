'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useEffect, useState } from 'react';

interface WeeklyChartData {
    name: string;
    barang: number;
    uang: number;
}

interface WeeklyOverviewChartProps {
    data: WeeklyChartData[];
}

export default function WeeklyOverviewChart({ data }: WeeklyOverviewChartProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="h-[300px] w-full bg-slate-50/50 rounded-xl flex items-center justify-center text-slate-400 text-sm">
                Memuat grafik...
            </div>
        );
    }

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value}`}
                        hide={typeof window !== 'undefined' && window.innerWidth < 768}
                    />
                    <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{ 
                            backgroundColor: 'white', 
                            border: 'none', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                        }} 
                    />
                    <Bar 
                        dataKey="barang" 
                        fill="#3b82f6" 
                        radius={[6, 6, 6, 6]} 
                        barSize={32}
                    />
                    <Bar 
                        dataKey="uang" 
                        fill="#10b981" 
                        radius={[6, 6, 6, 6]} 
                        barSize={32}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
