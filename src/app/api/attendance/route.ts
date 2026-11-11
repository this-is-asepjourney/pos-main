import { NextResponse } from "next/server";
import { query, initDb, isPostgresConfigured } from "@/lib/db";
import type { ShiftAttendance } from "@/types/pos";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const userIdFilter = searchParams.get("userId");
  const limitCount = Number(searchParams.get("limit")) || 50;

  if (!isPostgresConfigured()) {
    return NextResponse.json([]);
  }

  try {
    await initDb();
    let sql = `
      SELECT 
        id, 
        user_id as "userId", 
        user_name as "userName", 
        role, 
        status, 
        started_at as "startedAt", 
        ended_at as "endedAt"
      FROM attendance
    `;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (statusFilter) {
      params.push(statusFilter);
      conditions.push(`status = $${params.length}`);
    }

    if (userIdFilter) {
      params.push(userIdFilter);
      conditions.push(`user_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    params.push(limitCount);
    sql += ` ORDER BY started_at DESC LIMIT $${params.length}`;

    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("[Attendance GET] Error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const { userId, userName, role } = await request.json();

    if (!userId || !userName) {
      return NextResponse.json(
        { error: "User ID dan nama wajib diisi." },
        { status: 400 }
      );
    }

    const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    if (!isPostgresConfigured()) {
      return NextResponse.json({
        id,
        userId,
        userName,
        role: role || "cashier",
        status: "active",
        startedAt: now,
      }, { status: 201 });
    }

    await initDb();

    // Check if user already has an active shift
    const existing = await query(
      "SELECT id FROM attendance WHERE user_id = $1 AND status = 'active' LIMIT 1",
      [userId]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({
        id: existing.rows[0].id,
        alreadyActive: true,
      });
    }

    await query(
      `INSERT INTO attendance (id, user_id, user_name, role, status, started_at)
       VALUES ($1, $2, $3, $4, 'active', $5)`,
      [id, userId, userName, role || "cashier", now]
    );

    const shiftRecord: ShiftAttendance = {
      id,
      userId,
      userName,
      role: role || "cashier",
      status: "active",
      startedAt: now,
    };

    return NextResponse.json(shiftRecord, { status: 201 });
  } catch (error) {
    console.error("[Attendance POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memulai shift." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, userId } = await request.json();

    if (!id && !userId) {
      return NextResponse.json(
        { error: "ID shift atau User ID wajib diisi untuk mengakhiri shift." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (isPostgresConfigured()) {
      await initDb();
      if (id) {
        await query(
          "UPDATE attendance SET status = 'closed', ended_at = $1 WHERE id = $2",
          [now, id]
        );
      } else {
        await query(
          "UPDATE attendance SET status = 'closed', ended_at = $1 WHERE user_id = $2 AND status = 'active'",
          [now, userId]
        );
      }
    }

    return NextResponse.json({ success: true, endedAt: now });
  } catch (error) {
    console.error("[Attendance PUT] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengakhiri shift." },
      { status: 500 }
    );
  }
}

