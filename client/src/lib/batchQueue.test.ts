import { describe, expect, it } from "vitest";
import { moveQueueItem, moveQueueItemBefore } from "./batchQueue";

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
});
