
import { Skeleton } from "@/components/ui/skeleton";

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div 
          key={i} 
          className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm ${i >= 2 ? 'col-span-2 lg:col-span-1' : 'col-span-1'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="mt-4">
             <Skeleton className="h-8 w-16" />
             <Skeleton className="h-3 w-12 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
            </div>
        </div>
        <div className="h-[300px] w-full flex items-end gap-2 px-4 pb-2">
            {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="w-full rounded-t-lg" style={{ height: `${Math.random() * 60 + 20}%` }} />
            ))}
        </div>
    </div>
  );
}
