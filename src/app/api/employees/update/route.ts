
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  const supabase = createClient();

  try {
    // Cek auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Cek role
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUserProfile || (currentUserProfile.role !== 'admin' && currentUserProfile.role !== 'superadmin')) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    console.log('[UPDATE EMP] Body:', body);

    const { 
      id, 
      nik, 
      division, 
      position, 
      phone_number, 
      address, 
      join_date, 
      employment_status 
    } = body;

    if (!id) {
        return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    // Sanitize data
    const payload = {
        nik: nik || null,
        division: division || null,
        position: position || null,
        phone_number: phone_number || null,
        address: address || null,
        join_date: join_date === '' ? null : join_date,
        employment_status: employment_status || null
        // removed updated_at as it doesn't exist
    };
    
    console.log('[UPDATE EMP] Payload:', payload);

    // Update profiles using Service Role to bypass RLS
    // Standard client logic failed likely due to "Users can only update their own profile" policy
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

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(payload)
      .eq('id', id);

    if (updateError) {
      console.error('[UPDATE EMP] DB Error:', updateError);
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Data karyawan berhasil diperbarui' });

  } catch (error: any) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
