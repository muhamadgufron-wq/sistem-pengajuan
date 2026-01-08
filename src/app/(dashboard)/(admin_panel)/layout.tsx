'use client';

import { useState, useEffect } from 'react';
import { useRouter, redirect } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client'; 
import Sidebar from "@/components/Sidebar";
import { Button } from '@/components/ui/button';
import { Menu, LogOut, User } from 'lucide-react';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'sonner';

// Tipe untuk data user/profile
type UserProfile = {
    role: string;
    full_name: string;
} | null;

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 

  useEffect(() => {
    const checkUserAndProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const { data: userProfile, error } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single();

        if (error || !userProfile || !['admin', 'superadmin'].includes(userProfile.role)) {
            // Jika error, profil tidak ada, atau bukan admin/superadmin, redirect
            redirect('/dashboard'); // Gunakan redirect dari next/navigation
            return;
        }

        setProfile(userProfile as UserProfile);
        setIsLoading(false);

        // Atur state awal sidebar berdasarkan ukuran layar (opsional)
        if (window.innerWidth < 768) { // md breakpoint Tailwind
           setIsSidebarOpen(false);
        }

    };
    checkUserAndProfile();

    // Auto-close sidebar on mobile resize
    const handleResize = () => {
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        } else {
            setIsSidebarOpen(true); // Optional: Auto-expand on desktop for better visibility
        }
    };

    // Initial check
    if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [supabase, router]);

  const toggleSidebar = () => {
      setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      toast.success("Anda telah berhasil logout.");
      router.push('/login');
      router.refresh();
  };

  if (isLoading || !profile) {
    return (
        <div className="flex h-screen items-center justify-center bg-secondary">
             <LoadingSpinner />
        </div>
    );
  }

  return (
      // Container utama
      <div className="flex h-screen overflow-hidden bg-secondary">
        <Sidebar 
            fullName={profile.full_name || 'Pengguna'} 
            role={profile.role || ''}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
        />

        {/* Konten Utama */}
        <div className="flex-1 flex flex-col overflow-hidden w-full">
            {/* Header Konten (Tempat Tombol Hamburger & Profile) */}
            <header className="h-16 flex-shrink-0 bg-card border-b flex items-center justify-between px-4">
                 <div className="flex items-center">
                     <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-4">
                        <Menu className="h-6 w-6" />
                     </Button>
                     <h2 className="text-lg font-semibold lg:hidden">Admin Panel</h2>
                 </div>
                 
                 {/* Profile & Logout Section */}
                 <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-foreground">{profile.full_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="h-5 w-5" />
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleLogout}
                        className="text-muted-foreground hover:text-destructive"
                        title="Logout"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                 </div>
            </header>

            {/* Area Konten yang Bisa Scroll */}
            <main className="flex-1 overflow-y-auto w-full max-w-[1920px] mx-auto">
                {children}
            </main>
        </div>
      </div>
  );
}