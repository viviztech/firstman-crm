import { describe, expect, it } from "vitest";
import { isWipStatus, ORDER_STATUS_ORDER, WIP_STATUSES } from "@/lib/badges";

describe("isWipStatus", () => {
  it("treats every active-work status as WIP", () => {
    for (const status of WIP_STATUSES) {
      expect(isWipStatus(status)).toBe(true);
    }
  });

  it("does not treat completed or cancelled as WIP", () => {
    expect(isWipStatus("completed")).toBe(false);
    expect(isWipStatus("cancelled")).toBe(false);
  });

  it("covers every order status exactly once between WIP and terminal", () => {
    const terminal = ORDER_STATUS_ORDER.filter((status) => !WIP_STATUSES.includes(status));
    expect(terminal.sort()).toEqual(["cancelled", "completed"]);
  });
});
