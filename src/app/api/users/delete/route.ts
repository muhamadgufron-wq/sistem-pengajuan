// app/api/users/delete/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  // 1. Buat Admin Client (WAJIB menggunakan Service Role Key)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Ambil dari .env.local
  );

  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ success: false, message: "User ID tidak ditemukan." }, { status: 400 });
    }

    // 2. Ini adalah perintah yang benar untuk menghapus user
    // Perintah ini akan menghapus user dari 'auth.users'
    // dan (jika Anda atur) akan cascade delete ke tabel 'profiles'.
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "User berhasil dihapus." });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}