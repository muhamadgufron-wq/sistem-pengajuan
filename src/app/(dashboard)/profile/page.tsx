import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Check, User, Key, HelpCircle, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ProfilePage() {
  const supabase = createClient();
  
  // 1. Get User Session
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // 2. Get Profile Data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return <div>Data profil tidak ditemukan.</div>;
  }

  // Helper to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Mock data for UI if actual data is missing
  const dept = profile.division || "Umum";
  const position = profile.position || "Karyawan";
  const nik = profile.nik || "-";
  const joinDate = formatDate(profile.join_date);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* HEADER SECTION */}
      {/* HEADER SECTION */}
      <div className="relative bg-emerald-500 rounded-b-[20px] px-5 pt-4 pb-8 shadow-md overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16 pointer-events-none"></div>

        {/* Navbar / Top Bar */}
        <div className="relative z-10 flex items-center justify-between mb-4">
            <Link href="/admin" className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/30 transition-colors">
                <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-sm font-semibold text-white tracking-wider uppercase opacity-90">Profil Saya</h1>
            <div className="w-8"></div> {/* Spacer for center alignment */}
        </div>

        {/* Profile Info */}
        <div className="relative z-10 flex items-center gap-4 text-left pl-2">
            <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-full border-[3px] border-white/30 p-0.5 shadow-lg">
                    <div className="w-full h-full rounded-full overflow-hidden bg-white relative">
                        {profile.avatar_url ? (
                            <Image 
                                src={profile.avatar_url} 
                                alt={profile.full_name}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 text-2xl font-bold">
                                {profile.full_name?.charAt(0) || 'U'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex flex-col text-white">
                <h2 className="text-lg font-bold leading-tight">{profile.full_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="bg-emerald-600/50 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide text-emerald-50 border border-emerald-400/30">
                        {position}
                    </span>
                </div>
                <p className="text-emerald-100/70 text-[10px] mt-1.5 font-medium">PT. Wedding Organizer Indonesia</p>
            </div>
        </div>
      </div>

      {/* CONTENT SECTION */}
      <div className="px-5 mt-4 relative z-20 space-y-4">
        
        {/* Informasi Akun Card */}
        <Card className="p-6 rounded-2xl shadow-sm border-0">
            <h3 className="text-sm font-bold text-slate-900 mb-6">Informasi Akun</h3>
            
            <div className="space-y-5">
                <div className="flex justify-between items-center group">
                    <span className="text-sm text-slate-400 font-medium">Email</span>
                    <span className="text-sm text-slate-800 font-semibold text-right max-w-[200px] truncate">{profile.email || user.email}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400 font-medium">NIK</span>
                    <span className="text-sm text-slate-800 font-semibold">{nik}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400 font-medium">Jabatan</span>
                    <span className="text-sm text-slate-800 font-semibold">{position}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400 font-medium">Departemen</span>
                    <span className="text-sm text-slate-800 font-semibold">{dept}</span>
                </div>
            </div>
        </Card>

        {/* Status Kepegawaian Card */}
        <Card className="p-6 rounded-2xl shadow-sm border-0">
            <h3 className="text-sm font-bold text-slate-900 mb-6">Status Kepegawaian</h3>
            
            <div className="space-y-5">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400 font-medium">Status Akun</span>
                    <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-600 border-0 px-3 py-1 font-bold">AKTIF</Badge>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400 font-medium">Tanggal Bergabung</span>
                    <span className="text-sm text-slate-800 font-semibold">{joinDate}</span>
                </div>
            </div>
        </Card>

        {/* Menu Actions */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <User className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Edit Profil</span>
                </div>
                <div className="text-slate-300">
                   <ChevronLeft className="w-5 h-5 rotate-180" />
                </div>
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Key className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Ganti Kata Sandi</span>
                </div>
                <div className="text-slate-300">
                   <ChevronLeft className="w-5 h-5 rotate-180" />
                </div>
            </button>
            
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                         <HelpCircle className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Pusat Bantuan</span>
                </div>
                <div className="text-slate-300">
                   <ChevronLeft className="w-5 h-5 rotate-180" />
                </div>
            </button>
        </div>

        {/* Logout Button */}
        <form action="/signout" method="post" className="pt-2">
             <button type="submit" className="w-full bg-red-50 hover:bg-red-100 active:scale-95 transition-all text-red-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
             </button>
        </form>

        <div className="text-center pb-6">
            <p className="text-xs text-slate-400">Mdgufron v1.0.0</p>
        </div>

      </div>
    </div>
  );
}
