export const runtime = 'nodejs';

// app/api/users/update/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { id, full_name, role } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, message: "User ID tidak ditemukan." }, { status: 400 });
    }

    // 1. Update tabel 'profiles' kustom Anda
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: full_name,
        role: role
      })
      .eq('id', id);

    if (profileError) throw profileError;

    // 2. [Opsional tapi disarankan] Update metadata di 'auth.users'
    // Ini agar nama user konsisten jika Anda juga menyimpannya di auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { user_metadata: { full_name: full_name } }
    );
    
    if (authError) throw authError;

    return NextResponse.json({ success: true, message: "User berhasil diperbarui." });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}