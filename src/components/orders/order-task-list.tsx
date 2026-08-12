"use client";

import { AlertCircle, CheckCircle2, CircleDashed, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateOrderTaskStatusAction } from "@/actions/orders";
import { STAT_COLOR_CLASSES } from "@/components/dashboard/dashboard-colors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { orderTaskStatusEnum } from "@/db/schema/orders";
import {
  ORDER_TASK_STATUS_BADGE,
  ORDER_TASK_STATUS_STAT_COLOR,
  type OrderTaskStatus,
} from "@/lib/badges";
import { cn } from "@/lib/utils";

export type OrderTaskRow = {
  id: string;
  title: string;
  status: OrderTaskStatus;
  dueAt: Date | string | null;
  assignee: { id: string; name: string } | null;
};

const TASK_STATUS_ICON: Record<OrderTaskStatus, ComponentType<{ className?: string }>> = {
  pending: CircleDashed,
  in_progress: Clock,
  done: CheckCircle2,
  blocked: AlertCircle,
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
  const colors = STAT_COLOR_CLASSES[ORDER_TASK_STATUS_STAT_COLOR[task.status]];
  const Icon = TASK_STATUS_ICON[task.status];

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-l-4 p-3 text-sm",
        colors.border,
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
            colors.chip,
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <div className="flex flex-col gap-1">
          <span
            className={cn(
              "font-medium",
              task.status === "done" && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {task.assignee?.name ?? "Unassigned"}
            {task.dueAt ? (
              <span className={overdue ? "font-medium text-destructive" : undefined}>
                · Due{" "}
                {new Date(task.dueAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
                {overdue ? " · Overdue" : ""}
              </span>
            ) : null}
          </span>
        </div>
      </div>
      <Select
        value={task.status}
        onValueChange={handleChange}
        disabled={isPending}
        items={orderTaskStatusEnum.enumValues.map((value) => ({
          value,
          label: ORDER_TASK_STATUS_BADGE[value].label,
        }))}
      >
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
  const percentDone = Math.round((doneCount / tasks.length) * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {doneCount} of {tasks.length} tasks done
          </span>
          <span className="font-medium">{percentDone}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              percentDone === 100 ? "bg-green-500" : "bg-blue-500",
            )}
            style={{ width: `${percentDone}%` }}
          />
        </div>
      </div>
      {tasks.map((task) => (
        <TaskRow key={task.id} orderId={orderId} task={task} />
      ))}
    </div>
  );
}
