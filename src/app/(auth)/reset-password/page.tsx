'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { Lock, Eye, EyeOff, LoaderCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Cek apakah ada token di URL saat halaman dimuat
  useEffect(() => {
    // Supabase client akan otomatis mendeteksi token
    // di URL (#access_token=...) dan memicu event PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        toast.success("Token terverifikasi!", {
          description: "Anda sekarang dapat mengatur password baru."
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Password tidak cocok.');
      return;
    }
    if (password.length < 6) {
      setError('Password minimal harus 6 karakter.');
      return;
    }
    setError('');
    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error("Reset Gagal", { description: error.message });
    } else {
      toast.success("Password Berhasil Diperbarui!", {
        description: "Anda akan diarahkan ke halaman login."
      });
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-white px-8 py-12">
      <div className="mx-auto w-full max-w-md">
        <h2 className="mb-8 text-3xl font-bold text-emerald-600 justify-center flex">
          Atur Password Baru
        </h2>
        <p className="mb-8 text-gray-600 justify-center flex">
          Masukkan password baru Anda di bawah ini.
        </p>

        <form onSubmit={handleResetPassword} className="space-y-6">
          {/* Input Password Baru */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-12 h-12 rounded-md border-gray-300"
              placeholder="Password Baru"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Input Konfirmasi Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12 rounded-md border-gray-300"
              placeholder="Konfirmasi Password Baru"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium shadow-lg h-12 text-base rounded-lg hover:shadow-xl"
          >
            {isLoading ? (
              <LoaderCircle className="w-6 h-6 animate-spin" />
            ) : (
              "Simpan Password Baru"
            )}
          </Button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Ingat password Anda?{' '}
            <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-500">
              Login di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}