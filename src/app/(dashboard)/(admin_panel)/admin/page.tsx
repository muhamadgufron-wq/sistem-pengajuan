
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import SubmissionStatusCard from '@/components/dashboard/SubmissionStatusCard';
import StatsCards from '@/components/dashboard/StatsCards';
import WeeklyChartSection from '@/components/dashboard/WeeklyChartSection';
import { StatsGridSkeleton, ChartSkeleton } from '@/components/dashboard/skeletons';
import TextType from '@/components/react-bits/TextType';

export default async function AdminDashboardPage() {
  const supabase = await createClient(); 

  // Fast fetch: Settings for the toggle (lightweight)
  const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'submission_open')
      .single();

  const submissionOpen = settingsData ? settingsData.value === 'true' : true;

  return (
    <div className="md:p-8 space-y-6 bg-slate-50 min-h-full">
        <div className="p-4 md:p-0 space-y-6">

            {/* Header - Desktop */}
            <div className="hidden md:flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center">
                        <TextType 
                            text={["Dashboard Overview", "Selamat Datang Admin!", "Pantau Aktivitas..."]}
                            typingSpeed={75}
                            pauseDuration={1500}
                            showCursor={true}
                            cursorCharacter="_"
                            deletingSpeed={50}
                            variableSpeed={null}
                            cursorBlinkDuration={0.5}
                            loop={true}
                        />
                    </h1>
                    <p className="text-slate-500 mt-1">Pantau aktivitas pengajuan dan operasional mingguan.</p>
                </div>
            </div>

            {/* Status Penerimaan Card (Client Component) 
                - We render this immediately as it's critical UI 
            */}
            <SubmissionStatusCard initialIsOpen={submissionOpen} />

            {/* Stats Grid - Streamed */}
            <Suspense fallback={<StatsGridSkeleton />}>
                <StatsCards />
            </Suspense>

            {/* Overview Mingguan Chart - Streamed */}
            <Suspense fallback={<ChartSkeleton />}>
                <WeeklyChartSection />
            </Suspense>

        </div>
    </div>
  );
}