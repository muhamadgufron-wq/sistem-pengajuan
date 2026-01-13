
import { createClient } from '@/app/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  const supabase = createClient();
  
  try {
    const params = await props.params;
    // Construct the file path from the URL params
    if (!params.path) {
        return new NextResponse('Bad Request: Missing path', { status: 400 });
    }
    const filePath = params.path.join('/');
    console.log('[API PROXY] Requesting file:', filePath);

    // 1. Check Auth (Must be logged in)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[API PROXY] Unauthorized: No user');
      return new NextResponse('Unauthorized', { status: 401 });
    }
    console.log('[API PROXY] User ID:', user.id);

    // 2. Check Role (Must be admin/superadmin OR the owner of the proof)
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    // Allow if admin OR if the path starts with the user's ID (own data)
    const isOwner = filePath.startsWith(user.id);
    const isAdmin = profile && ['admin', 'superadmin'].includes(profile.role);
    
    console.log(`[API PROXY] Role: ${profile?.role}, IsOwner: ${isOwner}, IsAdmin: ${isAdmin}`);

    if (!isAdmin && !isOwner) {
         console.log('[API PROXY] Forbidden');
         return new NextResponse('Forbidden', { status: 403 });
    }

    // 3. Download from Supabase Storage
    // Use Service Role Key to bypass RLS policies if established policies are too strict for Admins
    // We only do this AFTER verifying the user is an Admin or Owner above.
    
    // We need to import createClient from supabase-js for this one-off admin instance
    const { createClient: createAdminClient } = require('@supabase/supabase-js');
    
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let storageClient = supabase; // Default to user client

    if (serviceRoleKey && isAdmin) {
        console.log('[API PROXY] Using Service Role Key for Admin access');
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
        storageClient = supabaseAdmin;
    } else {
         console.log('[API PROXY] Using standard URL/Anon key (RLS applies)');
    }

    const { data, error } = await storageClient
      .storage
      .from('bukti-izin')
      .download(filePath);

    if (error) {
      console.error('[API PROXY] Supabase download error:', error);
      // Detailed error logging
      console.error('[API PROXY] Bucket: bukti-izin');
      console.error('[API PROXY] Path:', filePath);
      return new NextResponse('File not found', { status: 404 });
    }


    // 4. Return the file
    // Get MIME type based on extension
    const ext = filePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'png') contentType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'pdf') contentType = 'application/pdf';

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (err) {
    console.error('Proxy error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
