import { createClient } from '@/app/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filePath: string[] }> }
) {
  const supabase = createClient();

  const { filePath } = await context.params;
  let filePathStr = filePath.join('/');

  // Normalize path
  filePathStr = filePathStr.replace(/^api\/foto-absensi\//, '');
  filePathStr = filePathStr.replace(/^\/+/, '');

  console.log('🔍 [FOTO ABSENSI API] Requested file path:', filePathStr);

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ [FOTO ABSENSI API] Unauthorized: No user session');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Check if user is admin or the owner of the photo
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile && ['admin', 'superadmin'].includes(profile.role);
  const isOwner = filePathStr.startsWith(user.id);

  if (!isAdmin && !isOwner) {
    console.error('❌ [FOTO ABSENSI API] Forbidden: User not authorized', {
      userId: user.id,
      role: profile?.role,
      requestedPath: filePathStr,
    });
    return new NextResponse('Forbidden', { status: 403 });
  }

  console.log('✅ [FOTO ABSENSI API] User authorized:', user.id, 'Role:', profile?.role);

  // Download file from storage
  const { data: blob, error } = await supabase.storage
    .from('foto-absensi')
    .download(filePathStr);

  if (error || !blob) {
    console.error('❌ [FOTO ABSENSI API] File not found:', {
      path: filePathStr,
      error: error?.message,
    });

    return new NextResponse(
      JSON.stringify({
        error: 'File not found',
        path: filePathStr,
        details: error?.message,
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  console.log('✅ [FOTO ABSENSI API] File found:', filePathStr, 'Size:', blob.size);

  // Return file
  const headers = new Headers();
  headers.set('Content-Type', blob.type || 'image/jpeg');
  headers.set('Content-Length', blob.size.toString());
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new NextResponse(blob, { status: 200, headers });
}
