import { createClient } from '@/app/lib/supabase/server'; // Gunakan server client
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { filePath: string[] } }
) {
  const supabase = createClient();

  // 1. Cek sesi user (Keamanan Lapis 1)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Cek peran user (Keamanan Lapis 2)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // 3. Ambil file dari storage
  const filePath = params.filePath.join('/'); // Rekonstruksi path file dari URL
  const { data: blob, error: downloadError } = await supabase.storage
    .from('bukti-laporan') // Nama bucket private Anda
    .download(filePath);

  if (downloadError) {
    console.error('Storage download error:', downloadError);
    return new NextResponse('File not found', { status: 404 });
  }

  if (!blob) {
     return new NextResponse('File data empty', { status: 500 });
  }

  // 4. Stream file kembali ke browser
  const headers = new Headers();
  headers.set('Content-Type', blob.type);
  headers.set('Content-Length', blob.size.toString());

  return new NextResponse(blob, { status: 200, headers });
}