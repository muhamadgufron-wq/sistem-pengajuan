import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filePath: string[] }> }
) {
  const supabase = await createClient();

  // Get file path from params
  const { filePath } = await context.params;
  let filePathStr = filePath.join('/');

  // Normalize path - remove unnecessary prefix
  filePathStr = filePathStr.replace(/^api\/bukti-reimbursement\//, '');
  filePathStr = filePathStr.replace(/^\/+/, '');

  console.log('🔍 [BUKTI REIMBURSEMENT API] Requested file path:', filePathStr);

  // 1. Check user session (Security Layer 1)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ [BUKTI REIMBURSEMENT API] Unauthorized: No user session');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Check user role (Security Layer 2)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile && ['admin', 'superadmin'].includes(profile.role);

  // 3. If not admin, verify file belongs to user's reimbursement
  if (!isAdmin) {
    // Extract reimbursement_id from path (format: reimbursement-bukti/{id}/{filename})
    const pathParts = filePathStr.split('/');
    if (pathParts[0] === 'reimbursement-bukti' && pathParts[1]) {
      const reimbursementId = pathParts[1];
      
      // Check if reimbursement belongs to user
      const { data: reimbursement, error } = await supabase
        .from('pengajuan_reimbursement')
        .select('user_id')
        .eq('id', reimbursementId)
        .single();

      if (error || !reimbursement || reimbursement.user_id !== user.id) {
        console.error('❌ [BUKTI REIMBURSEMENT API] Forbidden: File does not belong to user');
        return new NextResponse('Forbidden', { status: 403 });
      }
    } else {
      console.error('❌ [BUKTI REIMBURSEMENT API] Invalid path format');
      return new NextResponse('Invalid path', { status: 400 });
    }
  }

  console.log('✅ [BUKTI REIMBURSEMENT API] User authorized:', user.id, 'Role:', profile?.role);

  // 4. Try to get file from storage
  const { data: blob, error } = await supabase.storage
    .from('bukti-reimbursement')
    .download(filePathStr);

  if (error || !blob) {
    console.error('❌ [BUKTI REIMBURSEMENT API] File not found:', {
      path: filePathStr,
      error: error?.message
    });

    return new NextResponse(
      JSON.stringify({ 
        error: 'File not found', 
        path: filePathStr,
        details: error?.message,
        hint: 'File mungkin belum di-upload atau sudah dihapus'
      }), 
      { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  console.log('✅ [BUKTI REIMBURSEMENT API] File found:', filePathStr, 'Size:', blob.size);

  // 5. Stream file to browser
  const headers = new Headers();
  headers.set('Content-Type', blob.type || 'application/octet-stream');
  headers.set('Content-Length', blob.size.toString());
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new NextResponse(blob, { status: 200, headers });
}
