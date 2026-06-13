import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { TasksClient } from "@/components/TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={user} active="tasks">
      <TasksClient />
    </AppShell>
  );
}
