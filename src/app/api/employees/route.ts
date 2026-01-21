
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();

  try {
    // 1. Cek Autentikasi Standard
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Cek Role (menggunakan public 'profiles' check)
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUserProfile || (currentUserProfile.role !== 'admin' && currentUserProfile.role !== 'superadmin')) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // 3. Setup Admin Client (Bypass RLS & Access Auth)
    // Gunakan 'require' untuk fetch jika belum diimport statis
    const { createClient: createAdminClient } = require('@supabase/supabase-js');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
        throw new Error('Service Role Key missing');
    }

    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
    );

    // 4. Ambil Data Profiles (Raw Table) - Bypass RLS
    // Explicitly select columns to ensure we get what we need
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .neq('role', 'superadmin') 
      .order('full_name', { ascending: true });

    if (profileError) throw profileError;

    // 5. Ambil Data Emails dari Auth Users
    // listUsers paginates, but for typical internal apps < 1000 users it's ok to fetch page 1 with big limit
    // or we can just ignore email if listUsers is too heavy, but explicit request is nice.
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000
    });
    
    if (authError) console.error("Auth fetch error:", authError);

    // 6. Merge Data
    const combinedData = profiles.map((p: any) => {
        const u = users?.find((u: any) => u.id === p.id);
        return {
            ...p,
            email: u?.email || 'No Email'
        };
    });

    console.log(`[GET EMP] Returning ${combinedData.length} records`);
    // Log sample
    if(combinedData.length > 0) {
        const sample = combinedData.find((d: any) => d.division) || combinedData[0];
        console.log('[GET EMP] Sample merged:', JSON.stringify(sample, null, 2));
    }

    return NextResponse.json({ success: true, data: combinedData });

  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
