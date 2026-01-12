
import { createClient } from '@/app/lib/supabase/server';
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

    // Update profiles check
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        nik,
        division,
        position,
        phone_number,
        address,
        join_date,
        employment_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Data karyawan berhasil diperbarui' });

  } catch (error: any) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
