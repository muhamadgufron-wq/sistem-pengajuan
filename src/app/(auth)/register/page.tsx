'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { alert } from "@/lib/utils/sweetalert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, User, LoaderCircle } from 'lucide-react'; 

export default function RegisterPage() {
  const supabase = createClient();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); 

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });

    if (error) {
      alert.error("Pendaftaran Gagal", error.message );
      setIsLoading(false); // Selesai loading jika gagal
    } else {
      alert.success("Pendaftaran Berhasil!", "Silakan cek email Anda untuk verifikasi." 
      );
      setFullName('');
      setEmail('');
      setPassword('');
      
      // Tampilkan loading navigasi, lalu arahkan ke login
      setIsNavigating(true); 
      setTimeout(() => {
        router.push('/login');
      }, 1000); // Beri jeda 1 detik agar toast terbaca
    }
    // 'setIsLoading(false)' tidak perlu jika sukses
  };

  return (
    <>
      {/* --- TAMBAHAN: Loading Overlay --- */}
      {isNavigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <LoaderCircle className="w-12 h-12 animate-spin text-emerald-600" />
        </div>
      )}

      <div className="flex min-h-screen flex-col justify-center bg-white px-8 py-12">
        <div className="mx-auto w-full max-w-md">
          <h2 className="mb-8 text-3xl font-bold text-emerald-600 justify-center flex">
            Registrasi
          </h2>
          <p className="mb-8 text-gray-600">
            Selamat datang! Silakan isi detail di bawah untuk buat akun Anda.
          </p>

          <form onSubmit={handleSignUp} className="space-y-6">
            
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 h-12 rounded-md border-gray-300"
                placeholder="Nama Lengkap"
                required
              />
            </div>
            
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 rounded-md border-gray-300"
                placeholder="Masukan email"
                required
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-12 h-12 rounded-md border-gray-300"
                placeholder="Password (minimal 6 karakter)"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium shadow-lg h-12 text-base rounded-lg hover:shadow-xl"
            >
              {/* --- PERUBAHAN: Teks Tombol --- */}
              {isLoading ? (
                <LoaderCircle className="w-6 h-6 animate-spin" />
              ) : (
                "Buat Akun"
              )}
            </Button>
          </form>

          {/* Link 'Login' untuk Mobile */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Sudah punya akun?{' '}
              {/* --- TAMBAHAN: onClick --- */}
              <Link 
                href="/login" 
                className="font-medium text-emerald-600 hover:text-emerald-500"
                onClick={() => setIsNavigating(true)}
              >
                Login di sini
              </Link>
            </p>
          </div>

        </div>
      </div>
    </>
  );
}