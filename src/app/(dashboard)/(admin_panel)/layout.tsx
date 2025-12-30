'use client';

import { useState, useEffect } from 'react';
import { useRouter, redirect } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client'; 
import Sidebar from "@/components/Sidebar";
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import LoadingSpinner from '@/components/ui/loading-spinner';

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
            {/* Header Konten (Tempat Tombol Hamburger) */}
            <header className="h-16 flex-shrink-0 bg-card border-b flex items-center px-4 justify-between lg:justify-start">
                 <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-4">
                    <Menu className="h-6 w-6" />
                 </Button>
                 {/* Anda bisa menambahkan elemen lain di header ini jika perlu */}
            </header>

            {/* Area Konten yang Bisa Scroll */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-[1920px] mx-auto">
                {children}
            </main>
        </div>
      </div>
  );
}