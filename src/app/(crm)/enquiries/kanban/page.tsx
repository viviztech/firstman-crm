import Link from "next/link";
import { toScope } from "@/actions/shared";
import { KanbanBoard } from "@/components/enquiries/kanban-board";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/session";
import { listServicesForOrders } from "@/services/catalog";
import { listEnquiriesForBoard } from "@/services/enquiries";
import { listStates } from "@/services/geography";

export default async function EnquiriesKanbanPage() {
  const user = await requireRole("super_admin", "manager", "executive");
  const [enquiries, services, states] = await Promise.all([
    listEnquiriesForBoard(await toScope(user)),
    listServicesForOrders(),
    listStates(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Enquiries — Kanban</h1>
          <p className="text-sm text-muted-foreground">
            Drag a card to change its status. Drop on Won to close a sale, or Lost to mark it lost.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/enquiries" />}>
            Table view
          </Button>
          <Button nativeButton={false} render={<Link href="/enquiries/new" />}>
            New enquiry
          </Button>
        </div>
      </div>

      <KanbanBoard enquiries={enquiries} services={services} states={states} />
    </div>
  );
}
