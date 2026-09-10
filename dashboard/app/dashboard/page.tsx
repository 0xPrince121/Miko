import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { ServerPicker } from "@/components/ServerPicker";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await readSession();
  if (!session) {
    redirect("/?error=auth_failed");
  }
  return <ServerPicker />;
}