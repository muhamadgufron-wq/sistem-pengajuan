import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTodayData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('No user logged in (auth might not work in standalone script if not signed in via browser context transfer, but trying anon if env set)');
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  console.log('Checking checks for date:', todayStr);

  const { data, error } = await supabase
    .from('absensi')
    .select('*')
    .eq('tanggal', todayStr);

  if (error) console.error(error);
  else console.log('Data for today:', data);
}

checkTodayData();
