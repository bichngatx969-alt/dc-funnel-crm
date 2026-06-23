import { NextResponse } from "next/server";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getWorkspaceAdInsights } from "@/lib/meta/connection-status";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const body = await req.json().catch(() => ({}));
  const result = await getWorkspaceAdInsights(workspaceId, {
    date: typeof body.date === "string" ? body.date : null,
    level: typeof body.level === "string" ? body.level : null,
    adAccountId: typeof body.adAccountId === "string" ? body.adAccountId : null,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        error: result.message,
        data: { items: [], connectionStatus: result.connectionStatus },
      },
      { status: result.statusCode }
    );
  }

  return jsonOk({
    synced: false,
    note: "Đã đọc live từ Meta Graph. Chưa persist Ads Insights để tránh tạo migration trong bước diagnostics.",
    date: result.date,
    level: result.level,
    adAccount: result.adAccount,
    items: result.items,
    connectionStatus: result.connectionStatus,
  });
}
