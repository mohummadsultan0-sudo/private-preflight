import { describe, expect, it } from "vitest";
import { createZipOutputPlan, moveQueueItem, moveQueueItemBefore } from "./batchQueue";

const queue = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("local batch queue ordering", () => {
  it("moves an item by a bounded keyboard-like position", () => {
    expect(moveQueueItem(queue, "c", 0).map((item) => item.id)).toEqual(["c", "a", "b"]);
    expect(moveQueueItem(queue, "a", 99).map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("places a dragged item immediately before the target without changing entries", () => {
    expect(moveQueueItemBefore(queue, "c", "a").map((item) => item.id)).toEqual(["c", "a", "b"]);
    expect(moveQueueItemBefore(queue, "a", "c").map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(moveQueueItemBefore(queue, "missing", "b")).toEqual(queue);
  });

  it("numbers only eligible ZIP outputs in the visible queue order", () => {
    const plan = createZipOutputPlan(
      [{ id: "a", eligible: true, format: "jpeg" }, { id: "b", eligible: false, format: "png" }, { id: "c", eligible: true, format: "png" }],
      (item) => item.eligible,
      (item) => item.format === "png" ? "png" : "jpg",
    );
    expect(plan.get("a")).toBe("image-01-clean.jpg");
    expect(plan.has("b")).toBe(false);
    expect(plan.get("c")).toBe("image-02-clean.png");
  });
});
