import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";

export async function GET() {
  const result = await initDb();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}

export async function POST() {
  const result = await initDb();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}

