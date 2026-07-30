"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateOrderTaskStatusAction } from "@/actions/orders";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { orderTaskStatusEnum } from "@/db/schema/orders";
import { ORDER_TASK_STATUS_BADGE, type OrderTaskStatus } from "@/lib/badges";

export type OrderTaskRow = {
  id: string;
  title: string;
  status: OrderTaskStatus;
  dueAt: Date | string | null;
  assignee: { id: string; name: string } | null;
};

function isOverdue(dueAt: Date | string | null, status: OrderTaskStatus): boolean {
  if (!dueAt || status === "done") return false;
  return new Date(dueAt).getTime() < Date.now();
}

function TaskRow({ orderId, task }: { orderId: string; task: OrderTaskRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value || value === task.status) return;
    startTransition(async () => {
      const result = await updateOrderTaskStatusAction(orderId, task.id, value);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const overdue = isOverdue(task.dueAt, task.status);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{task.title}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.assignee?.name ?? "Unassigned"}
          {task.dueAt ? (
            <span className={overdue ? "font-medium text-destructive" : undefined}>
              · Due{" "}
              {new Date(task.dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              {overdue ? " · Overdue" : ""}
            </span>
          ) : null}
        </span>
      </div>
      <Select value={task.status} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {orderTaskStatusEnum.enumValues.map((value) => (
            <SelectItem key={value} value={value}>
              {ORDER_TASK_STATUS_BADGE[value].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function OrderTaskList({ orderId, tasks }: { orderId: string; tasks: OrderTaskRow[] }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks generated for this order.</p>;
  }

  const doneCount = tasks.filter((task) => task.status === "done").length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {doneCount} of {tasks.length} tasks done
        </span>
        <Badge variant="secondary">{tasks.length} total</Badge>
      </div>
      {tasks.map((task) => (
        <TaskRow key={task.id} orderId={orderId} task={task} />
      ))}
    </div>
  );
}
