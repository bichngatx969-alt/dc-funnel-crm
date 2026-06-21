// Backfill ProductLite cũ sang CatalogItem v2.
// Mặc định DRY-RUN, không ghi DB. Thêm --apply để tạo CatalogItem còn thiếu.
//
// Chạy:
//   npx tsx scripts/backfill-catalog-items.ts
//   npx tsx scripts/backfill-catalog-items.ts --apply
//
// Không xóa ProductLite, không sửa Order/OrderItem, không in secret.
import { backfillProductLiteCatalogItems } from "../src/lib/catalog-sync";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const INCLUDE_DELETED = process.argv.includes("--include-deleted");
const WORKSPACE_ARG = process.argv.find((arg) => arg.startsWith("--workspaceId="));
const WORKSPACE_ID = WORKSPACE_ARG?.split("=", 2)[1]?.trim() || undefined;

async function main() {
  const summary = await backfillProductLiteCatalogItems({
    apply: APPLY,
    includeDeleted: INCLUDE_DELETED,
    workspaceId: WORKSPACE_ID,
  });

  console.log("=== Catalog v2 backfill summary ===");
  console.log(JSON.stringify(summary, null, 2));
  if (!APPLY) {
    console.log("(dry-run — chưa ghi DB. Thêm --apply để tạo CatalogItem còn thiếu.)");
  }
}

main()
  .catch((err) => {
    console.error("Catalog backfill error:", err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
