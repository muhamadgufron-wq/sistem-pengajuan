'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { alert } from "@/lib/utils/sweetalert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { Mail, LoaderCircle } from 'lucide-react';

export default function LupaPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Ini adalah URL tujuan SETELAH user klik link di email
    // Pastikan ini ditambahkan di Supabase Auth > URL Configuration
    const resetUrl = `${window.location.origin}/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl,
    });

    if (error) {
      alert.error("Gagal Mengirim Email", { description: error.message });
    } else {
      alert.success("Email Terkirim!", { 
        description: "Silakan cek inbox Anda untuk link reset password." 
      });
      setIsSent(true); // Tampilkan pesan sukses
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-white px-8 py-12">
      
      <div className="absolute top-8 right-8">
        <Link href="/login" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
          Kembali ke Login
        </Link>
      </div>

      <div className="mx-auto w-full max-w-md">
        <h2 className="mb-8 text-3xl font-bold text-emerald-600 justify-center flex">
          Lupa Password
        </h2>
        
        {isSent ? (
          <div className="text-center">
            <p className="text-gray-600">
              Link reset password telah dikirim ke email Anda. Silakan periksa inbox (dan folder spam) Anda.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-8 text-gray-600">
              Masukkan email Anda yang terdaftar, dan kami akan mengirimkan link untuk mengatur ulang password Anda.
            </p>

            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-md border-gray-300"
                  placeholder="Masukan email Anda"
                  required
                />
              </div>
              
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium shadow-lg h-12 text-base rounded-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <LoaderCircle className="w-6 h-6 animate-spin" />
                ) : (
                  "Kirim Link Reset"
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}