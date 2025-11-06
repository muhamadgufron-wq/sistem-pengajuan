export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

  console.log("✅ ENV CHECK:", {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Service key detected ✅" : "❌ Not found",
});



export async function POST(req: Request) {
  try {
    const { invite_email, invite_full_name, invite_role } = await req.json();

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(invite_email, {
      data: { name: invite_full_name, role: invite_role },
    });

    if (error) {
      return NextResponse.json({ success: false, message: error.message });
    }

    return NextResponse.json({
      success: true,
      message: "Undangan berhasil dikirim!",
      data,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message || "Terjadi kesalahan pada server.",
    });
  }
}
