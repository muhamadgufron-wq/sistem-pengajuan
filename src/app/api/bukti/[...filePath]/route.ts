import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filePath: string[] }> }
) {
  const supabase = createClient();

  // Tunggu params dulu
  const { filePath } = await context.params;
  let filePathStr = filePath.join('/');

  // Normalisasi path - hapus prefix yang tidak perlu
  filePathStr = filePathStr.replace(/^api\/bukti\//, '');
  filePathStr = filePathStr.replace(/^\/+/, '');

  console.log('🔍 [BUKTI API] Requested file path:', filePathStr);

  // 1. Cek sesi user (Keamanan Lapis 1)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ [BUKTI API] Unauthorized: No user session');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Cek peran user (Keamanan Lapis 2)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    console.error('❌ [BUKTI API] Forbidden: User role not authorized', profile?.role);
    return new NextResponse('Forbidden', { status: 403 });
  }

  console.log('✅ [BUKTI API] User authorized:', user.id, 'Role:', profile.role);

  // 3. Coba ambil file dari storage - coba beberapa bucket name yang mungkin
  const possibleBuckets = ['bukti-laporan', 'bukti_laporan', 'buktilaporan'];
  let blob = null;
  let successBucket = '';
  let lastError = null;

  for (const bucketName of possibleBuckets) {
    console.log(`🔍 [BUKTI API] Trying bucket: ${bucketName}`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filePathStr);

    if (!error && data) {
      blob = data;
      successBucket = bucketName;
      console.log(`✅ [BUKTI API] File found in bucket: ${bucketName}`);
      break;
    } else {
      lastError = error;
      console.log(`⚠️ [BUKTI API] Not found in bucket ${bucketName}:`, error?.message);
    }
  }

  // Jika tidak ditemukan di semua bucket
  if (!blob) {
    console.error('❌ [BUKTI API] File not found in any bucket:', {
      path: filePathStr,
      triedBuckets: possibleBuckets,
      lastError: lastError?.message
    });

    // List files di bucket untuk debugging
    const { data: fileList } = await supabase.storage
      .from(possibleBuckets[0])
      .list(filePathStr.split('/')[0], { limit: 5 });
    
    console.log('📁 [BUKTI API] Files in user folder:', fileList?.map(f => f.name));

    return new NextResponse(
      JSON.stringify({ 
        error: 'File not found', 
        path: filePathStr,
        triedBuckets: possibleBuckets,
        details: lastError?.message,
        hint: 'File mungkin belum di-upload atau sudah dihapus'
      }), 
      { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  console.log('✅ [BUKTI API] File found:', filePathStr, 'Size:', blob.size, 'Bucket:', successBucket);

  if (!blob) {
    return new NextResponse('File data empty', { status: 500 });
  }

  // 4. Stream file ke browser
  const headers = new Headers();
  headers.set('Content-Type', blob.type || 'application/octet-stream');
  headers.set('Content-Length', blob.size.toString());
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new NextResponse(blob, { status: 200, headers });
}
