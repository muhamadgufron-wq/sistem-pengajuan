import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email wajib diisi' }, { status: 400 });
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if email exists in user_profiles_with_email view or profiles table
    // We'll query 'user_profiles_with_email' as it maps to auth.users usually in this project structure
    // based on previous context. If not available, we can try to list users via auth admin API.
    
    // METHOD 1: Using Auth Admin API (Most reliable for "registered users")
    // listing users by email is not directly efficient without exact match, 
    // but admin.listUsers() is pagination based. 
    // However, if we have a profiles table that is synced, query that is better.
    
    // Let's rely on the direct DB query if possible to avoid ListUsers bottleneck if many users.
    // The previous 'manage-users' page used 'user_profiles_with_email'. Let's use that.
    
    const { data, error } = await supabaseAdmin
      .from('user_profiles_with_email')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (error) {
       // Dictionary attack protection: log error internally but don't fail explicitly if possible? 
       // But here we WANT to know if specific failure.
       console.error("Check email error:", error);
       throw error;
    }

    if (data) {
      return NextResponse.json({ exists: true });
    } else {
      return NextResponse.json({ exists: false });
    }

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
