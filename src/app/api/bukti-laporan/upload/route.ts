import { createClient } from '@/app/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
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

    // 2. Parse form data
    const formData = await request.formData();
    const pengajuanId = formData.get('pengajuan_id') as string;
    const files = formData.getAll('files') as File[];

    if (!pengajuanId) {
      return NextResponse.json(
        { error: 'pengajuan_id is required' },
        { status: 400 }
      );
    }

    // 3. Validate files
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      );
    }

    // 4. Verify ownership of pengajuan_uang
    const { data: pengajuan, error: pengajuanError } = await supabase
      .from('pengajuan_uang')
      .select('id, user_id, status')
      .eq('id', pengajuanId)
      .eq('user_id', user.id)
      .single();

    if (pengajuanError || !pengajuan) {
      return NextResponse.json(
        { error: 'Pengajuan not found or access denied' },
        { status: 404 }
      );
    }

    // Check if pengajuan is approved
    if (pengajuan.status.toLowerCase() !== 'disetujui') {
      return NextResponse.json(
        { error: 'Can only upload proof for approved requests' },
        { status: 400 }
      );
    }

    // 5. Upload files
    const uploadedFiles = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push({
          fileName: file.name,
          error: `Invalid file type. Allowed: JPG, PNG, WebP`
        });
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push({
          fileName: file.name,
          error: `File too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB`
        });
        continue;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `laporan-${pengajuanId}-${timestamp}-${i}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to storage
      const arrayBuffer = await file.arrayBuffer();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bukti-laporan')
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        errors.push({
          fileName: file.name,
          error: uploadError.message
        });
        continue;
      }

      // Save metadata to database
      const { data: dbData, error: dbError } = await supabase
        .from('bukti_laporan_files')
        .insert({
          pengajuan_uang_id: parseInt(pengajuanId),
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
        })
        .select()
        .single();

      if (dbError) {
        // Rollback: delete uploaded file
        await supabase.storage.from('bukti-laporan').remove([filePath]);
        errors.push({
          fileName: file.name,
          error: dbError.message
        });
        continue;
      }

      uploadedFiles.push({
        id: dbData.id,
        fileName: file.name,
        filePath: filePath,
        fileSize: file.size,
      });
    }

    // 6. Return results
    return NextResponse.json({
      success: true,
      uploaded: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      message: `${uploadedFiles.length} file(s) uploaded successfully`
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
