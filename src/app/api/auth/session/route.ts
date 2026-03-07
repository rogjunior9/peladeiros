import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/supabase-auth";

export async function GET() {
  const session = await getServerSession();
  return NextResponse.json({ session });
}
