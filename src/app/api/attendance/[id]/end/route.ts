import { NextResponse, type NextRequest } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await pool.query(
      "UPDATE attendance SET status = 'closed', ended_at = NOW() WHERE id = ? AND tenant_id = ?",
      [id, session.tenantId],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("End shift error:", error);
    return NextResponse.json(
      { error: "Gagal mengakhiri shift." },
      { status: 500 },
    );
  }
}
