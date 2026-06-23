import { NextResponse } from "next/server";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getWorkspaceAdAccounts } from "@/lib/meta/connection-status";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const result = await getWorkspaceAdAccounts(workspaceId);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        error: result.message,
        data: { connectionStatus: result.status, items: [] },
      },
      { status: 403 }
    );
  }
  return jsonOk({
    status: result.status.adAccounts.connected ? "CONNECTED" : "NOT_CONNECTED",
    synced: false,
    note: "Đã đọc live từ Meta Graph. Chưa persist Ad Account để tránh đổi schema trong bước diagnostics.",
    items: result.items,
    connectionStatus: result.status,
  });
}
