import { createClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";

// Layout ini hanya bertugas memastikan user sudah login
// sebelum mengakses halaman karyawan manapun.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}