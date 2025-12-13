import { createClient } from '@/app/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();

  // Cek user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Cek role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results: any = {
    buckets: [],
    sampleFiles: {},
    pengajuanWithBukti: []
  };

  // 1. List semua buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    results.bucketsError = bucketsError.message;
  } else {
    results.buckets = buckets?.map(b => b.name) || [];
  }

  // 2. Coba list files di bucket yang mungkin
  const possibleBuckets = ['bukti-laporan', 'bukti_laporan', 'buktilaporan'];
  
  for (const bucketName of possibleBuckets) {
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 10 });

    if (!error && files) {
      results.sampleFiles[bucketName] = files.map(f => ({
        name: f.name,
        id: f.id,
        created_at: f.created_at
      }));
    } else {
      results.sampleFiles[bucketName] = { error: error?.message };
    }
  }

  // 3. Ambil sample pengajuan yang punya bukti_laporan_url
  const { data: pengajuan } = await supabase
    .from('pengajuan_uang')
    .select('id, bukti_laporan_url, status, created_at')
    .not('bukti_laporan_url', 'is', null)
    .limit(5);

  results.pengajuanWithBukti = pengajuan || [];

  return NextResponse.json(results, { status: 200 });
}
