import { describe, expect, it } from "vitest";
import { mapWithLimit } from "./fetchLawson";

describe("mapWithLimit", () => {
  it("同時に動かす数を上限までに抑え、結果は入力の順で返す", async () => {
    let running = 0;
    let maxRunning = 0;
    const results = await mapWithLimit([30, 10, 20, 5, 15], 2, async (ms) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, ms));
      running--;
      return ms * 2;
    });
    expect(results).toEqual([60, 20, 40, 10, 30]);
    expect(maxRunning).toBe(2);
  });

  it("空の入力は空で返す", async () => {
    expect(await mapWithLimit([], 3, async (x) => x)).toEqual([]);
  });
});
