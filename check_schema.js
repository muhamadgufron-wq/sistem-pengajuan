const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// using service role key if available for checking schema would be better but I'll try anon first or check env for service role
// Actually, I can just try to select detailed fields

async function checkSchema() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log("Checking pengajuan_reimbursement...");
  const { data, error } = await supabase
    .from('pengajuan_reimbursement')
    .select('id, bukti_transfer_url')
    .limit(1);

  if (error) {
    console.error("Error selecting bukti_transfer_url from pengajuan_reimbursement:", error);
  } else {
    console.log("Success! Column exists/selectable.");
    console.log(data);
  }

  console.log("Checking pengajuan_uang...");
  const { data: dataUang, error: errorUang } = await supabase
    .from('pengajuan_uang')
    .select('id, bukti_transfer_url')
    .limit(1);
    
   if (errorUang) {
    console.error("Error selecting from pengajuan_uang:", errorUang);
  } else {
    console.log("Success Uang!");
  }
}

checkSchema();
