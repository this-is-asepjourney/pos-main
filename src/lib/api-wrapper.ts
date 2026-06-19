import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import type { SessionPayload } from "@/lib/auth";

export type AuthContext = {
  auth: SessionPayload;
};

export function withAuth(
  handler: (req: Request, ctx: AuthContext & any) => Promise<NextResponse> | NextResponse
) {
  return async (req: Request, context: any) => {
    try {
      const session = await getSession();

      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Inject auth context
      context.auth = session;

      return await handler(req, context);
    } catch (error) {
      console.error("API wrapper error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export function withSuperAdmin(
  handler: (req: Request, ctx: AuthContext & any) => Promise<NextResponse> | NextResponse
) {
  return withAuth(async (req, ctx) => {
    if (!ctx.auth.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: Superadmin only" }, { status: 403 });
    }
    return await handler(req, ctx);
  });
}
