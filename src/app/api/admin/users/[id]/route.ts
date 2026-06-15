import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { getSuperAdminSession } from "@/lib/auth";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { name, email, isSuperadmin, password } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nama dan email wajib diisi." },
        { status: 400 },
      );
    }

    if (password && password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter." },
        { status: 400 },
      );
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.query(
        "UPDATE users SET name = ?, email = ?, is_superadmin = ?, password_hash = ? WHERE id = ?",
        [name, email, isSuperadmin ? 1 : 0, passwordHash, id]
      );
    } else {
      await pool.query(
        "UPDATE users SET name = ?, email = ?, is_superadmin = ? WHERE id = ?",
        [name, email, isSuperadmin ? 1 : 0, id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user admin error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui user." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Prevent deleting self
    if (id === session.uid) {
      return NextResponse.json(
        { error: "Anda tidak bisa menghapus diri sendiri." },
        { status: 400 },
      );
    }

    await pool.query("DELETE FROM users WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user admin error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus user." },
      { status: 500 },
    );
  }
}
