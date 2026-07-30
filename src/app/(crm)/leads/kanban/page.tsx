import Link from "next/link";
import { KanbanBoard } from "@/components/leads/kanban-board";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/session";
import { listLeadsForBoard } from "@/services/leads";

export default async function LeadsKanbanPage() {
  const user = await requireRole("super_admin", "manager", "executive");
  const leads = await listLeadsForBoard({ userId: user.id, role: user.role });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads — Kanban</h1>
          <p className="text-sm text-muted-foreground">
            Drag a card to change its status. Drop on Won to convert to a client.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/leads" />}>
            Table view
          </Button>
          <Button nativeButton={false} render={<Link href="/leads/new" />}>
            New lead
          </Button>
        </div>
      </div>

      <KanbanBoard leads={leads} />
    </div>
  );
}
