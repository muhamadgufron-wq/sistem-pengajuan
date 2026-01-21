
import { redirect } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/server'; 
import AdminPanelShell from '@/components/layout/AdminPanelShell'; // Import the new shell

// Tipe untuk data user/profile
type UserProfile = {
    role: string;
    full_name: string;
} | null;

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: userProfile, error } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (error || !userProfile || !['admin', 'superadmin'].includes(userProfile.role)) {
     redirect('/dashboard'); 
  }

  return (
    <AdminPanelShell initialProfile={userProfile as UserProfile}>
        {children}
    </AdminPanelShell>
  );
}