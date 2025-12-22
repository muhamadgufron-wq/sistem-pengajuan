import { createClient } from '@/app/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    // Parse request body
    const body = await request.json();
    const {
      jumlah_uang,
      keperluan,
      nama_bank,
      nomor_rekening,
      atas_nama,
    } = body;

    // Validation
    if (!jumlah_uang || !keperluan || !nama_bank || !nomor_rekening || !atas_nama) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (jumlah_uang <= 0) {
      return NextResponse.json(
        { error: 'Jumlah uang must be greater than 0' },
        { status: 400 }
      );
    }

    // Insert reimbursement
    const { data, error } = await supabase
      .from('pengajuan_reimbursement')
      .insert({
        user_id: user.id,
        jumlah_uang: parseInt(jumlah_uang),
        keperluan,
        kategori: 'OPERASIONAL', // Fixed category
        nama_bank,
        nomor_rekening,
        atas_nama,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reimbursement:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    // Fetch user's reimbursements
    const { data, error } = await supabase
      .from('pengajuan_reimbursement')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reimbursements:', error);
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
