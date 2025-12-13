'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
// --- TAMBAHAN --- (Import LoaderCircle)
import { Eye, EyeOff, Lock, Mail, Twitter, LoaderCircle } from 'lucide-react'; 

// Ikon kustom untuk Google dan Facebook (karena tidak ada di lucide-react)
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.712,35.619,44,29.692,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="24px" height="24px" {...props}>
    <path d="M41,4H9C6.24,4,4,6.24,4,9v32c0,2.76,2.24,5,5,5h32c2.76,0,5-2.24,5-5V9C46,6.24,43.76,4,41,4z M37,19h-2c-2.14,0-3,0.5-3,4 v2h5l-1,5h-4v15h-5V29h-4v-5h4v-3c0-4,2-7,6-7c2.9,0,4,1,4,1V19z" fill="#1877F2" />
  </svg>
);


export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false); // <-- TAMBAHAN

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); 

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      toast.error("Login Gagal", { description: error.message });
      setIsLoading(false); 
    } else {
      toast.success("Login Berhasil!");
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <>
      {/* --- Loading Overlay --- */}
      {isNavigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <LoaderCircle className="w-12 h-12 animate-spin text-emerald-600" />
        </div>
      )}

      <div className="flex min-h-screen">
        
        {/* --- Kolom Kiri (Gambar & Teks) --- */}
        <div 
          className="relative hidden w-0 flex-1 bg-cover bg-center md:flex md:w-1/2 lg:w-3/5"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519638399535-1b036603ac77?q=80&w=1931&auto=format&fit=crop')" }}
        >
          <div className="absolute inset-0 bg-emerald-700/70" />
          <div className="relative z-10 flex h-full flex-col justify-center p-12 text-white">
            <h1 className="text-4xl font-bold leading-tight lg:text-5xl">
              Sistem Pengajuan Barang dan Uang
            </h1>
            <p className="mt-4 text-lg text-emerald-100">
              Sistem pengajuan terpusat transparan, cepat, dan profesional
            </p>
          </div>
        </div>

        {/* --- Kolom Kanan (Form Login) --- */}
        <div className="flex w-full flex-col justify-center bg-white px-8 py-12 md:w-1/2 lg:w-2/5 lg:px-16 xl:px-24">
          
          {/* Link "Buat Akun" untuk Desktop */}
          <div className="absolute top-8 right-8 hidden md:block">
            {/* --- TAMBAHAN: onClick --- */}
            <Link 
              href="/register" 
              className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
              onClick={() => setIsNavigating(true)} 
            >
              Buat akun
            </Link>
          </div>

          <div className="mx-auto w-full max-w-md">
            <h2 className="mb-8 text-3xl font-bold text-emerald-600 justify-center flex">
              Login
            </h2>

            <form onSubmit={handleLogin} className="space-y-6">
              
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email-card"
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
                  id="password-card"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-12 h-12 rounded-md border-gray-300"
                  placeholder="Password"
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
              
              <div className="flex justify-end">
                <Link href="/lupa-password" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
                  Lupa Password?
                </Link>
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
                  "Login"
                )}
              </Button>
            </form>

            <div className="my-8 flex items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="mx-4 flex-shrink text-sm text-gray-500">atau dengan</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" className="w-12 h-12 p-0 rounded-full" aria-label="Login dengan Google">
                <GoogleIcon />
              </Button>
              <Button variant="outline" className="w-12 h-12 p-0 rounded-full" aria-label="Login dengan Facebook">
                <FacebookIcon />
              </Button>
              <Button variant="outline" className="w-12 h-12 p-0 rounded-full" aria-label="Login dengan Twitter">
                <Twitter className="h-5 w-5 text-[#1DA1F2]" />
              </Button>
            </div>

            {/* Link 'Buat Akun' untuk Mobile */}
            <div className="mt-8 text-center md:hidden">
              <p className="text-sm text-gray-600">
                Tidak memiliki akun?{' '}
                {/* --- TAMBAHAN: onClick --- */}
                <Link 
                  href="/register" 
                  className="font-medium text-emerald-600 hover:text-emerald-500"
                  onClick={() => setIsNavigating(true)}
                >
                  Buat akun
                </Link>
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}