import { describe, expect, it } from "vitest";
import { formatClock, WallClock } from "./clock";

describe("WallClock", () => {
  it("counts real time even when ticks arrive late (background tab)", () => {
    const c = new WallClock();
    c.start(0);
    let total = c.tick(1000); // a normal tick
    // Tab hidden on YouTube: the next tick only fires 5 minutes later.
    total += c.tick(301_000);
    expect(total).toBe(301);
  });

  it("doesn't count paused time", () => {
    const c = new WallClock();
    c.start(0);
    let total = c.stop(60_000);
    total += c.tick(600_000); // paused for 9 minutes
    c.start(600_000);
    total += c.tick(630_000);
    expect(total).toBe(90);
  });
});

describe("formatClock", () => {
  it("shows time left, then overtime", () => {
    expect(formatClock(245)).toBe("4:05");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-80)).toBe("+1:20");
  });
});
