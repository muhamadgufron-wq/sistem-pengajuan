import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Fungsi ini membuat client Supabase yang aman digunakan di browser (client-side).
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export { createBrowserClient };
