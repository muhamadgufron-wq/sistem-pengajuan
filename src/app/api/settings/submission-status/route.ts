import { createClient } from '@/app/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'submission_open')
      .single();

    if (error && error.code !== 'PGRST116') {
       console.error('Error fetching setting:', error);
       return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    // Default to 'true' (open) if setting doesn't exist
    const isOpen = data ? data.value === 'true' : true;

    return NextResponse.json({ success: true, isOpen });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Check auth and role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { isOpen } = await request.json();

    const { error } = await supabase
      .from('system_settings')
      .upsert({ 
        key: 'submission_open', 
        value: String(isOpen),
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) throw error;

    return NextResponse.json({ success: true, isOpen });
  } catch (error: any) {
    console.error('Error updating setting:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
