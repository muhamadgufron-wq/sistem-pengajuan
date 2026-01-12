
import { createClient } from '@/app/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();

  try {
    // Cek autentikasi
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Cek role admin/superadmin
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUserProfile || (currentUserProfile.role !== 'admin' && currentUserProfile.role !== 'superadmin')) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Ambil semua data profil
    // Menggunakan view 'user_profiles_with_email' jika ada, atau join manual jika perlu. 
    // Namun karena kita baru saja alter table 'profiles', kita ambil dari 'profiles' langsung.
    // Tetapi 'profiles' biasanya tidak punya email (ada di auth.users). 
    // Kita asumsikan ada view atau kita ambil dari profiles saja dan email mungkin perlu join.
    // PS: Di ManageUsersPage mereka pakai 'user_profiles_with_email'.
    // Mari kita cek apakah view tersebut punya kolom baru? Tidak otomatis.
    // Jadi sebaiknya kita query 'profiles' dan 'auth.users' atau gunakan view jika sudah diupdate.
    // Karena user baru menjalankan SQL alter table profiles, view tidak otomatis update.
    // Workaround: Ambil dari profiles, karena detail karyawan ada di profiles. Email mungkin tidak krusial untuk fitur 'Data Karyawan' detail, tapi bagus jika ada.
    // Untuk amannya, kita select * dari profiles.
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'superadmin')
      .order('full_name', { ascending: true });

    if (error) {
      throw error;
    }

    // Kita perlu email juga sebenarnya. 
    // Jika view 'user_profiles_with_email' belum di update definisinya, kolom baru tidak akan muncul disana.
    // Tapi kita bisa enrich data di client atau query terpisah jika butuh email urgent.
    // Untuk sekarang kita return data profiles saja, karena detail karyawan ada disitu.
    // Jika butuh email, kita bisa fetch user emails via admin function but that requires service role.
    // Atau kita asumsikan 'profiles' is the source of truth for employee data.

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
