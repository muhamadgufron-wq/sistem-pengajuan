import { createClient } from '@/app/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: reimbursementId } = await params;
    console.log('Fetching bukti for reimbursement ID:', reimbursementId);

    // Fetch proof files
    const { data, error } = await supabase
      .from('reimbursement_bukti_files')
      .select('*')
      .eq('reimbursement_id', reimbursementId)
      .order('uploaded_at', { ascending: true });

    if (error) {
      console.error('Error fetching bukti files:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
