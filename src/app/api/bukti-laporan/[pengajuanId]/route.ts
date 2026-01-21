import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET: Retrieve all proof files for a specific pengajuan
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ pengajuanId: string }> }
) {
  const supabase = createClient();

  try {
    // 1. Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get pengajuanId from params
    const { pengajuanId } = await context.params;

    // 3. Check if user has access (either owner or admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile && ['admin', 'superadmin'].includes(profile.role);

    // 4. Verify ownership if not admin
    if (!isAdmin) {
      const { data: pengajuan } = await supabase
        .from('pengajuan_uang')
        .select('user_id')
        .eq('id', pengajuanId)
        .single();

      if (!pengajuan || pengajuan.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // 5. Fetch all proof files
    const { data: files, error: filesError } = await supabase
      .from('bukti_laporan_files')
      .select('*')
      .eq('pengajuan_uang_id', pengajuanId)
      .order('created_at', { ascending: true });

    if (filesError) {
      return NextResponse.json(
        { error: filesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      files: files || [],
      count: files?.length || 0
    });

  } catch (error: any) {
    console.error('Get files error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Remove a specific proof file
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ pengajuanId: string }> }
) {
  const supabase = createClient();

  try {
    // 1. Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get file ID from query params
    const url = new URL(request.url);
    const fileId = url.searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      );
    }

    // 3. Get file info and verify ownership
    const { data: file, error: fileError } = await supabase
      .from('bukti_laporan_files')
      .select('*, pengajuan_uang!inner(user_id)')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (file.pengajuan_uang.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // 4. Delete from storage
    const { error: storageError } = await supabase.storage
      .from('bukti-laporan')
      .remove([file.file_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue anyway to delete DB record
    }

    // 5. Delete from database
    const { error: dbError } = await supabase
      .from('bukti_laporan_files')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      return NextResponse.json(
        { error: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
