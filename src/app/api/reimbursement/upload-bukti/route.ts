import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const reimbursementId = formData.get('reimbursement_id') as string;
    const files = formData.getAll('files') as File[];

    // Validation
    if (!reimbursementId) {
      return NextResponse.json(
        { error: 'Reimbursement ID is required' },
        { status: 400 }
      );
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      );
    }

    // Verify reimbursement belongs to user
    const { data: reimbursement, error: reimbursementError } = await supabase
      .from('pengajuan_reimbursement')
      .select('id, user_id')
      .eq('id', reimbursementId)
      .eq('user_id', user.id)
      .single();

    if (reimbursementError || !reimbursement) {
      return NextResponse.json(
        { error: 'Reimbursement not found or access denied' },
        { status: 404 }
      );
    }

    const uploadedFiles = [];
    const errors = [];

    console.log(`Starting upload for ${files.length} files`);

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Processing file ${i + 1}/${files.length}:`, file.name, 'Type:', file.type, 'Size:', file.size);

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`File ${file.name}: Invalid file type. Allowed: JPG, PNG, PDF`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`File ${file.name}: File size exceeds 5MB`);
        continue;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split('.').pop();
      const fileName = `${timestamp}_${randomStr}.${ext}`;
      const filePath = `reimbursement-bukti/${reimbursementId}/${fileName}`;

      // Upload to storage
      console.log('Attempting to upload file:', fileName, 'to bucket: bukti-reimbursement');
      const { error: uploadError } = await supabase.storage
        .from('bukti-reimbursement')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        errors.push(`File ${file.name}: ${uploadError.message}`);
        continue;
      }

      console.log('File uploaded successfully:', filePath);

      // Save file metadata to database
      console.log('Saving file metadata to database...');
      const { data: fileData, error: dbError } = await supabase
        .from('reimbursement_bukti_files')
        .insert({
          reimbursement_id: parseInt(reimbursementId),
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        errors.push(`File ${file.name}: Failed to save metadata`);
        
        // Cleanup: delete uploaded file
        await supabase.storage.from('bukti-reimbursement').remove([filePath]);
        continue;
      }

      uploadedFiles.push(fileData);
    }

    // Return results
    console.log(`Upload complete. Success: ${uploadedFiles.length}, Failed: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: 'All files failed to upload', details: errors },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: uploadedFiles,
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
