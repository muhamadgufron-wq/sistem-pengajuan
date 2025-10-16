import PageTransition from "@/components/PageTransition";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect('/login'); }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  // Keamanan: Pastikan hanya admin & superadmin yang bisa mengakses layout ini
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  return (
      <div className="flex h-screen overflow-hidden bg-secondary">
        <Sidebar fullName={profile.full_name || user.email || 'Pengguna'} role={profile.role} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <PageTransition>
              {children}
          </PageTransition>
        </main>
      </div>
  );
}