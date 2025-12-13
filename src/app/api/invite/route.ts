// app/api/invite/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { invite_email, invite_full_name, invite_role } = await request.json();

    // Gunakan 'data' untuk meneruskan info tambahan (role & nama)
    // yang akan ditangkap oleh Trigger nanti
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      invite_email,
      {
        data: {
          full_name: invite_full_name,
          role: invite_role
        }
      }
    );

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Undangan terkirim." });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}